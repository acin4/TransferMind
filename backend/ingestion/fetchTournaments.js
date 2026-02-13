import { client } from "./client.js";
import { saveJSON } from "./utils.js";
import { supabase } from "./supabaseClient.js";

// === helper: φέρε τα ids από Supabase ===
async function getTournamentIdsFromDb() {
  const { data, error } = await supabase
    .from("seasons")
    .select("tournament_id")
    .not("tournament_id", "is", null);

  if (error) {
    console.error("❌ Supabase error (getTournamentIdsFromDb):", error);
    throw error;
  }

  const ids = [...new Set(data.map((row) => row.tournament_id))];
  console.log("Tournament IDs from DB:", ids);
  return ids;
}

// === fetch + store για 1 tournament ===
async function fetchAndStoreTournament(tournamentId) {
  console.log(`\n=== Tournament ${tournamentId} ===`);

  // 1. Κλήση API
  const res = await client.get("/tournaments/detail", {
    params: { tournamentId: String(tournamentId) },
  });

  const data = res.data;

  console.log("✅ OK.");

  // 2. Save raw JSON (προαιρετικό)
  saveJSON(`data/raw/sofascore_tournament_${tournamentId}.json`, data);

  // 3. Πάρε το array με τα tournaments
  const t = data.uniqueTournament;

  // 4. Map -> rows για Supabase table "seasons"
  const row = {
    api_id: t.id,
    name: t.name,
    country: t.category?.country?.name || null,
    logo_md5: t.logo?.md5 || null,
    logo_id: t.logo?.id || null,
    flag_code: t.category?.flag || null,
  };
  console.log("Row to inster:", row);

  // 5. Upsert για να μην έχουμε duplicates
  const { error } = await supabase
    .from("tournaments")
    .upsert([row], { onConflict: "api_id" }); // unique constraint στο api_id

  if (error) {
    console.error("❌ Supabase error:", error);
    return;
  }

  console.log("✅ Inserted/updated tournament", t.id, t.name);
}

// === Runner ===
(async () => {
  try {
    const TOURNAMENT_IDS = await getTournamentIdsFromDb();

    for (const tournamentId of TOURNAMENT_IDS) {
      await fetchAndStoreTournament(tournamentId);
    }
    console.log("\n🎉 Done for all tournaments!");
  } catch (e) {
    console.error("❌ Error:", e.response?.data || e.message);
  }
})();
