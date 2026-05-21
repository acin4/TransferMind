import { client } from "../lib/client.js";
import { saveJSON } from "../lib/utils.js";
import { supabase } from "../lib/supabaseClient.js";
import { getCurrentSeasonFromList } from "../lib/utils.js";
import { fileURLToPath } from "url";

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
    return { upserted: 0, skipped: 1, fetched: 0, selected: 0 };
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
    throw error;
  }

  console.log(
    `✅ Inserted/updated ${rowsForInsert.length} seasons into Supabase`,
  );

  return {
    upserted: rowsForInsert.length,
    skipped: 0,
    fetched: seasons.length,
    selected: selectedSeasons.length,
  };
}

export async function runFetchSeasons() {
  const failures = [];
  const summary = {
    targets: TOURNAMENT_IDS.length,
    upserted: 0,
    skipped: 0,
    failed: 0,
    fetched: 0,
    selected: 0,
  };

  for (const tournamentId of TOURNAMENT_IDS) {
    try {
      const result = await fetchAndStoreSeasonsForTournament(tournamentId);
      summary.upserted += result?.upserted ?? 0;
      summary.skipped += result?.skipped ?? 0;
      summary.fetched += result?.fetched ?? 0;
      summary.selected += result?.selected ?? 0;
    } catch (error) {
      failures.push({ tournamentId, error });
      summary.failed += 1;
      console.error(
        `❌ Error fetching seasons for tournament ${tournamentId}:`,
        error.response?.data || error.message || error,
      );
    }
  }

  if (failures.length > 0) {
    const error = new Error(
      `Seasons sync failed for ${failures.length} tournament(s).`,
    );
    error.summary = summary;
    throw error;
  }

  console.log("\n🎉 Done for all tournaments!");
  return summary;
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  try {
    await runFetchSeasons();
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message || error);
    process.exitCode = 1;
  }
}
