import { client } from "../lib/client.js";
import { saveJSON } from "../lib/utils.js";
import { supabase } from "../lib/supabaseClient.js";

// Ρύθμιση καθυστέρησης για να μην μπλοκαριστείς
const THROTTLE_MS = 300;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * 1. Φέρνουμε τα ζευγάρια Tournament + Season από τη βάση
 * για να ξέρουμε για ποια πρωταθλήματα θα ζητήσουμε βαθμολογίες.
 */
async function getTournamentSeasonPairsFromDb() {
  const { data, error } = await supabase
    .from("seasons")
    .select("api_id, tournament_id")
    .not("api_id", "is", null)
    .not("tournament_id", "is", null);

  if (error) {
    console.error("❌ Supabase error (getTournamentSeasonPairsFromDb):", error);
    throw error;
  }

  // api_id στον πίνακα seasons = seasonId στο API
  const pairs = data.map((row) => ({
    tournamentId: row.tournament_id,
    seasonId: row.api_id,
  }));

  console.log(`Found ${pairs.length} active seasons/tournaments in DB.`);
  return pairs;
}

/**
 * 2. Fetch Standings & Upsert
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
      return;
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

          // parent tournament + season requested from API
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
    } else {
      console.log(
        `   ✅ Successfully updated ${rowsToUpsert.length} standings rows.`,
      );
    }
  } catch (err) {
    console.error(
      "❌ Error processing standings:",
      err.response?.data || err.message,
    );
  }
}

/**
 * 3. Main Runner
 */
(async () => {
  try {
    const pairs = await getTournamentSeasonPairsFromDb();

    console.log("🚀 Starting Standings Sync...");

    for (const { tournamentId, seasonId } of pairs) {
      await fetchAndStoreStandings(tournamentId, seasonId);

      // Καθυστέρηση
      if (THROTTLE_MS > 0) await delay(THROTTLE_MS);
    }

    console.log("\n🎉 Done fetching standings!");
  } catch (e) {
    console.error("❌ Fatal Error:", e);
  }
})();
