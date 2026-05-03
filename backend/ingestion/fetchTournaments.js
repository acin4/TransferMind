import { client } from "../lib/client.js";
import { saveJSON } from "../lib/utils.js";
import { supabase } from "../lib/supabaseClient.js";
import { fileURLToPath } from "url";

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
  saveJSON(
    `../data/raw/tournament/sofascore_tournament_${tournamentId}.json`,
    data,
  );

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
    throw error;
  }

  console.log("✅ Inserted/updated tournament", t.id, t.name);
}

export async function runFetchTournaments() {
  const tournamentIds = await getTournamentIdsFromDb();
  const failures = [];

  for (const tournamentId of tournamentIds) {
    try {
      await fetchAndStoreTournament(tournamentId);
    } catch (error) {
      failures.push({ tournamentId, error });
      console.error(
        `❌ Error fetching tournament ${tournamentId}:`,
        error.response?.data || error.message || error,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Tournament sync failed for ${failures.length} tournament(s).`,
    );
  }

  console.log("\n🎉 Done for all tournaments!");
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  try {
    await runFetchTournaments();
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message || error);
    process.exitCode = 1;
  }
}
