import { client } from "../lib/client.js";
import { saveJSON } from "../lib/utils.js";
import { supabase } from "../lib/supabaseClient.js";
import { getCurrentSeasonFromList } from "../lib/utils.js";

// 👇 εδώ βάζεις ΟΛΑ τα tournaments που θες να τραβήξεις
const TOURNAMENT_IDS = [185, 17, 8, 35, 23];
const SEASONS_PER_TOURNAMENT = 3;

async function fetchAndStoreSeasonsForTournament(tournamentId) {
  console.log(`\n=== Tournament ${tournamentId} ===`);

  // 1. Κλήση API
  const res = await client.get("/tournaments/get-seasons", {
    params: { tournamentId: String(tournamentId) },
  });

  const data = res.data;
  const isArray = Array.isArray(data);

  console.log("✅ OK.");
  console.log("Type:", isArray ? "array" : typeof data);
  console.log(
    isArray ? `Length: ${data.length}` : `Keys: ${Object.keys(data)}`,
  );

  // 2. Save raw JSON (προαιρετικό)
  saveJSON(`../data/raw/seasons/tournament_${tournamentId}_seasons.json`, data);

  // 3. Πάρε το array με τα seasons
  const seasons = Array.isArray(data.seasons) ? data.seasons : [];
  console.log(`Found ${seasons.length} seasons.`);

  if (!seasons.length) {
    console.log("⚠️ No seasons found in response");
    return;
  }
  const selectedSeasons = seasons.slice(0, SEASONS_PER_TOURNAMENT);
  console.log(
    `Selected ${selectedSeasons.length} of ${seasons.length} fetched seasons for storage.`,
  );

  // 4. Map -> rows για Supabase table "seasons"
  const currentSeason = getCurrentSeasonFromList(selectedSeasons);
  console.log(
    "Current season (best guess):",
    currentSeason?.year || "N/A",
    tournamentId,
  );
  const currentApiId = currentSeason?.id ?? null;
  console.log("Current season API ID:", currentApiId);

  const rowsForInsert = selectedSeasons.map((s) => ({
    api_id: s.id,
    name: s.name,
    year: s.year,
    tournament_id: tournamentId,
    is_current: currentApiId !== null && s.id === currentApiId, // boolean ✅
  }));
  console.log("Sample rows:", rowsForInsert.slice(0, 3));

  // 5. Upsert για να μην έχουμε duplicates
  const { error } = await supabase
    .from("seasons")
    .upsert(rowsForInsert, { onConflict: "api_id" }); // unique constraint στο api_id

  if (error) {
    console.error("❌ Supabase error:", error);
    return;
  }

  console.log(
    `✅ Inserted/updated ${rowsForInsert.length} seasons into Supabase`,
  );
}

// === Runner ===
(async () => {
  try {
    for (const tournamentId of TOURNAMENT_IDS) {
      await fetchAndStoreSeasonsForTournament(tournamentId);
    }
    console.log("\n🎉 Done for all tournaments!");
  } catch (e) {
    console.error("❌ Error:", e.response?.data || e.message);
  }
})();
