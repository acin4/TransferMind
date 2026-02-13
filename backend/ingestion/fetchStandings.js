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
    // 2.1 Κλήση API
    const res = await client.get("/tournaments/get-standings", {
      params: {
        tournamentId: String(tournamentId),
        seasonId: String(seasonId),
      },
    });

    const data = res.data;

    // 2.2 Βρες το "total" table
    const standingsList = data.standings || [];
    const totalStanding =
      standingsList.find((s) => s.type === "total") || standingsList[0];

    if (!totalStanding || !totalStanding.rows) {
      console.log("   ⚠️ No standings rows found (maybe cup or knockout?).");
      return;
    }

    const rows = totalStanding.rows;
    console.log(`   ➡️ Found ${rows.length} entries.`);

    // 2.3 Save raw JSON (προαιρετικό)
    saveJSON(
      `../data/raw/standings/tournament_${tournamentId}_season_${seasonId}_standings.json`,
      data,
    );

    // 2.4 Mapping δεδομένων στον πίνακα "standings"
    const rowsToUpsert = rows.map((r) => {
      // --- ΒΗΜΑ 1: Εξαγωγή Γκολ (Υπέρ / Κατά) ---
      // Ελέγχουμε όλα τα πιθανά πεδία (scoresFor, scores.for, goalsFor)
      // για να αποφύγουμε τα μηδενικά.
      let gf = r.scoresFor ?? r.scores?.for ?? r.goalsFor ?? 0;
      let ga = r.scoresAgainst ?? r.scores?.against ?? r.goalsAgainst ?? 0;

      // --- ΒΗΜΑ 2: ΧΕΙΡΟΚΙΝΗΤΟΣ ΥΠΟΛΟΓΙΣΜΟΣ ΔΙΑΦΟΡΑΣ ---
      // Εδώ κάνουμε την πράξη μέσα στον κώδικα:
      const calculatedGoalDiff = gf - ga;

      return {
        api_id: r.id, // Το ID της εγγραφής κατάταξης
        team_id: r.team?.id, // Σύνδεση με τον πίνακα teams
        tournament_id: tournamentId,
        season_id: seasonId,

        position: r.position,
        matches: r.matches,
        wins: r.wins,
        draws: r.draws,
        losses: r.losses,

        goals_for: gf,
        goals_against: ga,

        // Αποθηκεύουμε το αποτέλεσμα της δικής μας πράξης
        goal_diff: calculatedGoalDiff,

        points: r.points,
      };
    });

    // 2.4 Upsert στη Supabase
    const { error } = await supabase
      .from("standings")
      .upsert(rowsToUpsert, { onConflict: "api_id" });

    if (error) {
      console.error("❌ Supabase upsert error:", error.message);
    } else {
      console.log(`   ✅ Successfully updated standings.`);
    }
  } catch (err) {
    console.error(
      `❌ Error processing standings:`,
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
