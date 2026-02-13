import { client } from "../lib/client.js";
import { saveJSON } from "../lib/utils.js";
import { supabase } from "../lib/supabaseClient.js";

// 👇 εδώ βάζεις ΟΛΑ τα tournaments που θες να τραβήξεις
const TOURNAMENT_IDS = [185, 17];

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

  // 4. Map -> rows για Supabase table "seasons"
  const rows = seasons.map((s) => ({
    api_id: s.id,
    name: s.name,
    year: s.year,
    tournament_id: tournamentId,
  }));
  console.log("Sample row:", rows[0]);

  const rowsForInsert = rows.slice(0, 3);

  // 5. Upsert για να μην έχουμε duplicates
  const { error } = await supabase
    .from("seasons")
    .upsert(rowsForInsert, { onConflict: "api_id" }); // unique constraint στο api_id

  if (error) {
    console.error("❌ Supabase error:", error);
    return;
  }

  console.log(`✅ Inserted/updated ${rows.length} seasons into Supabase`);
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
