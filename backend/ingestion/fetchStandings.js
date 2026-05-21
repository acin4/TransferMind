import { client } from "../lib/client.js";
import { saveJSON } from "../lib/utils.js";
import { supabase } from "../lib/supabaseClient.js";
import { fileURLToPath } from "url";

const THROTTLE_MS = 300;
const PAGE_SIZE = 1000;
const VALID_MODES = new Set(["refresh", "init"]);

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function parseMode(argv) {
  let mode = null;
  let modeProvided = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--mode") {
      modeProvided = true;
      mode = argv[i + 1];
      break;
    }

    if (arg.startsWith("--mode=")) {
      modeProvided = true;
      mode = arg.slice("--mode=".length);
      break;
    }

    if (
      arg === "refresh" ||
      arg === "init" ||
      arg === "--refresh" ||
      arg === "--init"
    ) {
      modeProvided = true;
      mode = arg.replace(/^--/, "");
      break;
    }
  }

  if (!modeProvided) return "refresh";

  if (!VALID_MODES.has(mode)) {
    throw new Error(
      `Invalid standings sync mode "${mode}". Use "refresh", "init", or "--mode <mode>".`,
    );
  }

  return mode;
}

async function fetchAllRows(buildQuery) {
  const allRows = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery().range(
      from,
      from + PAGE_SIZE - 1,
    );

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) break;

    allRows.push(...data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
}

/**
 * Init mode: fetch every season present in the DB.
 *
 * seasons.api_id is the external API season id.
 * seasons.tournament_id has historically stored either an external API
 * tournament id or an internal DB tournament id, so resolve both forms.
 */
async function getAllTournamentSeasonPairsFromDb() {
  const [seasons, tournaments] = await Promise.all([
    fetchAllRows(() =>
      supabase
        .from("seasons")
        .select("id, api_id, tournament_id")
        .not("api_id", "is", null)
        .not("tournament_id", "is", null),
    ),
    fetchAllRows(() =>
      supabase
        .from("tournaments")
        .select("id, api_id")
        .not("api_id", "is", null),
    ),
  ]);

  const tournamentApiIds = new Set(
    tournaments.map((tournament) => tournament.api_id).filter(Boolean),
  );
  const tournamentApiIdByDbId = new Map(
    tournaments.map((tournament) => [tournament.id, tournament.api_id]),
  );

  const unconfirmedTournamentRefs = [];
  const pairsByKey = new Map();

  for (const season of seasons) {
    const rawTournamentRef = season.tournament_id;
    let tournamentApiId = null;

    if (tournamentApiIds.has(rawTournamentRef)) {
      tournamentApiId = rawTournamentRef;
    } else if (tournamentApiIdByDbId.has(rawTournamentRef)) {
      tournamentApiId = tournamentApiIdByDbId.get(rawTournamentRef);
    } else {
      tournamentApiId = rawTournamentRef;
      unconfirmedTournamentRefs.push(rawTournamentRef);
    }

    const pair = {
      tournamentId: tournamentApiId,
      seasonId: season.api_id,
      seasonDbId: season.id,
    };

    pairsByKey.set(`${pair.tournamentId}:${pair.seasonId}`, pair);
  }

  const pairs = [...pairsByKey.values()];

  if (unconfirmedTournamentRefs.length > 0) {
    console.warn(
      `⚠️ Using ${unconfirmedTournamentRefs.length} stored tournament refs as API ids because they were not found in tournaments.`,
    );
  }

  console.log(`Found ${pairs.length} DB seasons/tournaments for init mode.`);
  return pairs;
}

/**
 * Refresh mode: fetch only current seasons from the current-scope view.
 *
 * current_tournament_seasons exposes internal DB ids and external API ids.
 * The API call and standings table use the external API ids.
 */
async function getCurrentTournamentSeasonPairsFromDb() {
  const currentSeasons = await fetchAllRows(() =>
    supabase
      .from("current_tournament_seasons")
      .select("tournament_id, season_id, tournament_api_id, season_api_id")
      .not("tournament_api_id", "is", null)
      .not("season_api_id", "is", null),
  );

  const pairs = currentSeasons.map((row) => ({
    tournamentId: row.tournament_api_id,
    seasonId: row.season_api_id,
    tournamentDbId: row.tournament_id,
    seasonDbId: row.season_id,
  }));

  console.log(
    `Found ${pairs.length} current seasons/tournaments for refresh mode.`,
  );
  return pairs;
}

async function getTournamentSeasonPairsForMode(mode) {
  if (mode === "init") {
    return getAllTournamentSeasonPairsFromDb();
  }

  return getCurrentTournamentSeasonPairsFromDb();
}

/**
 * Fetch Standings & Upsert
 */
async function fetchAndStoreStandings(tournamentId, seasonId) {
  console.log(`\n📊 Standings for T: ${tournamentId}, S: ${seasonId}...`);

  try {
    const res = await client.get("/tournaments/get-standings", {
      params: {
        tournamentId: String(tournamentId),
        seasonId: String(seasonId),
      },
    });

    const data = res.data;

    const standingsList = Array.isArray(data.standings) ? data.standings : [];

    // Keep only "total" tables that actually have rows
    const totalStandings = standingsList.filter(
      (table) =>
        table?.type === "total" &&
        Array.isArray(table?.rows) &&
        table.rows.length > 0,
    );

    if (totalStandings.length === 0) {
      console.log("   ⚠️ No standings rows found.");
      return { upserted: 0, skipped: 1, standingsTables: 0 };
    }

    console.log(`   ➡️ Found ${totalStandings.length} standings tables.`);

    saveJSON(
      `../data/raw/standings/tournament_${tournamentId}_season_${seasonId}_standings.json`,
      data,
    );

    const rowsToUpsert = totalStandings.flatMap((table) => {
      return table.rows.map((r) => {
        const gf = r.scoresFor ?? r.scores?.for ?? r.goalsFor ?? 0;
        const ga = r.scoresAgainst ?? r.scores?.against ?? r.goalsAgainst ?? 0;

        return {
          api_id: r.id,
          team_id: r.team?.id,

          // External API ids requested from the football API.
          // standings_with_team_info maps these back to internal DB ids.
          tournament_id: tournamentId,
          season_id: seasonId,

          // identify which standings block this row belongs to
          standing_group_id: table.id ?? null,
          standing_group_name: table.name ?? null,
          stage_tournament_id: table.tournament?.id ?? null,
          stage_tournament_name: table.tournament?.name ?? null,
          stage_tournament_slug: table.tournament?.slug ?? null,

          position: r.position ?? null,
          matches: r.matches ?? 0,
          wins: r.wins ?? 0,
          draws: r.draws ?? 0,
          losses: r.losses ?? 0,
          goals_for: gf,
          goals_against: ga,
          goal_diff: gf - ga,
          points: r.points ?? 0,
        };
      });
    });

    const { error } = await supabase
      .from("standings")
      .upsert(rowsToUpsert, { onConflict: "api_id" });

    if (error) {
      console.error("❌ Supabase upsert error:", error.message);
      throw error;
    } else {
      console.log(
        `   ✅ Successfully updated ${rowsToUpsert.length} standings rows.`,
      );
    }

    return {
      upserted: rowsToUpsert.length,
      skipped: 0,
      standingsTables: totalStandings.length,
    };
  } catch (err) {
    console.error(
      "❌ Error processing standings:",
      err.response?.data || err.message,
    );
    throw err;
  }
}

/**
 * Main Runner
 */
export async function runFetchStandings({ mode = "refresh" } = {}) {
  if (!VALID_MODES.has(mode)) {
    throw new Error(
      `Invalid standings sync mode "${mode}". Use "refresh" or "init".`,
    );
  }

  console.log(`🚀 Starting Standings Sync (${mode} mode)...`);
  console.log(
    mode === "init"
      ? "Mode detail: init fetches standings for all DB seasons."
      : "Mode detail: refresh fetches standings only for current seasons.",
  );

  const pairs = await getTournamentSeasonPairsForMode(mode);
  const failures = [];
  const summary = {
    mode,
    targets: pairs.length,
    upserted: 0,
    skipped: 0,
    failed: 0,
    standingsTables: 0,
  };

  for (const { tournamentId, seasonId } of pairs) {
    try {
      const result = await fetchAndStoreStandings(tournamentId, seasonId);
      summary.upserted += result?.upserted ?? 0;
      summary.skipped += result?.skipped ?? 0;
      summary.standingsTables += result?.standingsTables ?? 0;
    } catch (error) {
      failures.push({ tournamentId, seasonId, error });
      summary.failed += 1;
    }

    if (THROTTLE_MS > 0) await delay(THROTTLE_MS);
  }

  if (failures.length > 0) {
    const error = new Error(
      `Standings sync failed for ${failures.length} tournament/season pair(s).`,
    );
    error.summary = summary;
    throw error;
  }

  console.log("\n🎉 Done fetching standings!");
  return summary;
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  try {
    const mode = parseMode(process.argv.slice(2));
    await runFetchStandings({ mode });
  } catch (error) {
    console.error("❌ Fatal Error:", error);
    process.exitCode = 1;
  }
}
