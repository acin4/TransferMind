import { client } from "../lib/client.js";
import { saveJSON } from "../lib/utils.js";
import { supabase } from "../lib/supabaseClient.js";
import { fileURLToPath } from "url";

const THROTTLE_MS = 300;
const PAGE_SIZE = 1000;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Read all distinct team_ids from standings table.
 * This assumes fetchStandings.js has already run.
 */
async function getStandingTeamIdsFromDb() {
  const allRows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("standings")
      .select("team_id")
      .not("team_id", "is", null)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("❌ Supabase error (getStandingTeamIdsFromDb):", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    allRows.push(...data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const teamIds = [
    ...new Set(allRows.map((row) => row.team_id).filter(Boolean)),
  ];

  console.log(`Found ${teamIds.length} unique team IDs in standings.`);
  return teamIds;
}

/**
 * Read all existing teams from teams table,
 * so we only fetch missing team details.
 */
async function getExistingTeamIdsFromDb() {
  const allRows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("teams")
      .select("api_id")
      .not("api_id", "is", null)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("❌ Supabase error (getExistingTeamIdsFromDb):", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    allRows.push(...data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const existingIds = new Set(allRows.map((row) => row.api_id).filter(Boolean));

  console.log(`Found ${existingIds.size} existing teams in DB.`);
  return existingIds;
}

/**
 * Compare standings.team_id against teams.api_id
 * and return only the missing team ids.
 */
async function getMissingTeamIdsFromDb() {
  const standingTeamIds = await getStandingTeamIdsFromDb();
  const existingTeamIds = await getExistingTeamIdsFromDb();

  const missingTeamIds = standingTeamIds.filter(
    (teamId) => !existingTeamIds.has(teamId),
  );

  saveJSON(
    "../data/derived/teams/team_ids_from_standings.json",
    standingTeamIds,
  );
  saveJSON("../data/derived/teams/missing_team_ids.json", missingTeamIds);

  console.log(
    `Need to fetch ${missingTeamIds.length} missing team details from API.`,
  );

  return missingTeamIds;
}

/**
 * Fetch one team detail and upsert into teams table.
 */
async function fetchAndStoreTeamDetails(teamId) {
  console.log(`   -> fetching team detail for team ${teamId}`);

  try {
    const res = await client.get("/teams/detail", {
      params: { teamId: String(teamId) },
    });

    const data = res.data;

    saveJSON(`../data/raw/teams/team_${teamId}_detail.json`, data);

    const t = data?.team ?? data;

    if (!t?.id) {
      console.log(`   ⚠️ No valid team payload for team ${teamId}`);
      throw new Error(`No valid team payload for team ${teamId}`);
    }

    const row = {
      api_id: t.id,
      name: t.name ?? null,
      tournament_id: t.primaryUniqueTournament?.id ?? null,
      city: t.venue?.city?.name ?? null,
      stadium: t.venue?.name ?? null,
    };

    const { error } = await supabase
      .from("teams")
      .upsert([row], { onConflict: "api_id" });

    if (error) {
      console.error(`❌ Supabase upsert error for team ${teamId}:`, error);
      throw error;
    }

    console.log(`   ✅ Upserted team ${teamId} (${row.name ?? "unknown"})`);
    return { upserted: 1 };
  } catch (err) {
    console.error(
      `❌ Error fetching team ${teamId}:`,
      err.response?.data || err.message,
    );
    throw err;
  }
}

/**
 * Main runner
 */
export async function runFetchTeams() {
  console.log("🚀 Starting Teams Sync from standings table...");

  const missingTeamIds = await getMissingTeamIdsFromDb();
  const summary = {
    targets: missingTeamIds.length,
    upserted: 0,
    skipped: 0,
    failed: 0,
  };

  if (missingTeamIds.length === 0) {
    console.log("✅ No missing teams. Everything is already synced.");
    return summary;
  }

  const failures = [];

  for (const teamId of missingTeamIds) {
    try {
      const result = await fetchAndStoreTeamDetails(teamId);
      summary.upserted += result?.upserted ?? 0;
    } catch (error) {
      failures.push({ teamId, error });
      summary.failed += 1;
    }

    if (THROTTLE_MS > 0) {
      await delay(THROTTLE_MS);
    }
  }

  if (failures.length > 0) {
    const error = new Error(`Teams sync failed for ${failures.length} team(s).`);
    error.summary = summary;
    throw error;
  }

  console.log("\n🎉 Done fetching missing teams!");
  return summary;
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  try {
    await runFetchTeams();
  } catch (error) {
    console.error(
      "❌ Fatal Error:",
      error.response?.data || error.message || error,
    );
    process.exitCode = 1;
  }
}
