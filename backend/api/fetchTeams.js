import { client } from "./client.js";
import { saveJSON } from "./utils.js";
import { supabase } from "./supabaseClient.js";

/**
 * 1. Φέρνουμε από Supabase όλα τα ζευγάρια (tournamentId, seasonId)
 *    από τον πίνακα seasons.
 *    - api_id  -> seasonId στο SofaScore
 *    - tournament_id -> tournamentId στο SofaScore
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

  const pairs = data.map((row) => ({
    tournamentId: row.tournament_id,
    seasonId: row.api_id,
  }));

  console.log("Tournament/Season pairs from DB:", pairs);
  return pairs;
}

/**
 * 2. Φέρνουμε standings για ένα τουρνουά + season,
 *    εξάγουμε τις ομάδες, αποθηκεύουμε JSON με teamIds
 *    και κάνουμε upsert στον πίνακα `teams`.
 */
async function fetchAndStoreTeams(tournamentId, seasonId) {
  console.log(`\n=== Tournament ${tournamentId}, Season ${seasonId} ===`);

  // 2.1 Κλήση API
  const res = await client.get("/tournaments/get-standings", {
    params: {
      tournamentId: String(tournamentId),
      seasonId: String(seasonId),
      type: "total",
    },
  });

  const data = res.data;

  console.log("✅ Standings OK.");
  console.log("Keys:", Object.keys(data));

  // 2.2 Αποθήκευση raw JSON (προαιρετικό)
  saveJSON(
    `data/raw/sofascore_t${tournamentId}_s${seasonId}_standings.json`,
    data
  );

  // 2.3 Πάρε τα rows -> κάθε row έχει .team
  const rows = data?.standings?.[0]?.rows ?? [];
  if (!rows.length) {
    console.log("⚠️ No rows in standings");
    return;
  }

  const teams = rows.map((r) => r.team);
  const teamIds = [...new Set(teams.map((t) => t.id))];

  console.log(`Found ${teams.length} rows, ${teamIds.length} unique teams.`);

  // 2.4 Αποθήκευση ΜΟΝΟ των teamIds σε JSON (αν το θες σαν ενδιάμεσο βήμα)
  saveJSON(`data/derived/team_ids_t${tournamentId}_s${seasonId}.json`, teamIds);

  // 2.5 (ΠΡΟΑΙΡΕΤΙΚΟ) – για κάθε teamId, φέρε και extra λεπτομέρειες
  //     από /teams/detail και ενημέρωσε ξανά τον πίνακα teams
  for (const teamId of teamIds) {
    await fetchAndStoreTeamDetails(teamId);
  }
}

/**
 * 3. Optional: Λεπτομέρειες ομάδας από άλλο endpoint
 *    ΠΡΟΣΟΧΗ: Βάλε το πραγματικό όνομα endpoint & schema.
 */
async function fetchAndStoreTeamDetails(teamId) {
  console.log(`   -> fetching team detail for team ${teamId}`);

  // άλλαξε το endpoint/path ανάλογα με το SofaScore API σου
  const res = await client.get("/teams/detail", {
    params: { teamId: String(teamId) },
  });

  const data = res.data;
  saveJSON(`data/raw/team_${teamId}_detail.json`, data);

  // εδώ προσαρμόζεις το mapping ανάλογα με το response
  const t = data.team ?? data; // ανάλογα με το schema του endpoint

  const row = {
    api_id: t.id,
    name: t.name,
    tournament_id: t.primaryUniqueTournament?.id ?? null,
    city: t.venue?.city?.name ?? null,
    stadium: t.venue?.name ?? null,
  };

  const { error } = await supabase
    .from("teams")
    .upsert([row], { onConflict: "api_id" });

  if (error) {
    console.error("❌ Supabase error (upsert team details):", error);
  }
}

/**
 * 4. Runner
 */
(async () => {
  try {
    const pairs = await getTournamentSeasonPairsFromDb();

    for (const { tournamentId, seasonId } of pairs) {
      await fetchAndStoreTeams(tournamentId, seasonId);
    }

    console.log("\n🎉 Done for all tournaments & seasons!");
  } catch (e) {
    console.error("❌ Error:", e.response?.data || e.message);
  }
})();
