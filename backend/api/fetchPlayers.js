import { client } from "./client.js";
import { saveJSON } from "./utils.js";
import { supabase } from "./supabaseClient.js";

// Προαιρετικό throttling για να μην φας rate limit
const THROTTLE_MS = 250;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// === 1. Φέρε team ids από Supabase ===
async function getTeamIdsFromDb() {
  const { data, error } = await supabase
    .from("teams")
    .select("api_id")
    .not("api_id", "is", null);

  if (error) {
    console.error("❌ Supabase error (getTeamIdsFromDb):", error);
    throw error;
  }

  const ids = [...new Set(data.map((row) => row.api_id))];
  console.log("Team IDs from DB:", ids);
  return ids;
}

// === 2. Φέρε τους παίκτες που υπάρχουν ήδη στη DB
// Map<player_api_id, { team_id, second_team_id }>
async function getExistingPlayersMapFromDb() {
  const { data, error } = await supabase
    .from("players")
    .select("api_id, team_id, second_team_id")
    .not("api_id", "is", null);

  if (error) {
    console.error("❌ Supabase error (getExistingPlayersMapFromDb):", error);
    throw error;
  }

  const map = new Map();
  for (const row of data) {
    map.set(row.api_id, {
      team_id: row.team_id,
      second_team_id: row.second_team_id,
    });
  }

  console.log("Existing players in DB:", map.size);
  return map;
}

// === 3. Κλήση /teams/get-squad για 1 ομάδα -> επιστροφή unique player ids ===
async function fetchSquadPlayerIds(teamId) {
  console.log(`\n=== Squad for team ${teamId} ===`);

  const res = await client.get("/teams/get-squad", {
    params: { teamId: String(teamId) },
  });

  const data = res.data;

  // Αποθηκεύουμε raw JSON (προαιρετικό αλλά χρήσιμο για debug)
  saveJSON(`data/raw/team_${teamId}_squad.json`, data);

  // Εξαγωγή unique player IDs
  const playerIdSet = new Set();

  const groups = [
    data.players || [],
    data.nationalPlayers || [],
    data.foreignPlayers || [],
  ];

  for (const group of groups) {
    for (const item of group) {
      const p = item?.player || item;
      if (p?.id) {
        playerIdSet.add(p.id);
      }
    }
  }

  const playerIds = [...playerIdSet];
  console.log(
    `➡️  Found ${playerIds.length} unique players for team ${teamId}`
  );
  return playerIds;
}

// === 4. Κλήση /players/detail για 1 player -> mapping σε row για "players" table ===
async function fetchPlayerDetailAndMap(playerId) {
  console.log(`   → Fetching player detail for ${playerId}...`);

  const res = await client.get("/players/detail", {
    params: { playerId: String(playerId) },
  });

  const data = res.data;
  saveJSON(`data/raw/player_${playerId}_detail.json`, data);

  const p = data.player;
  if (!p) {
    console.warn(
      `   ⚠️ No "player" object found in response for id ${playerId}`
    );
    return null;
  }

  // Βασικό mapping. ΤΑ ΠΕΔΙΑ team_id / second_team_id ΘΑ ΤΑ ΠΑΤΗΣΟΥΜΕ
  // ΑΠΟ ΤΟ MAIN LOOP ανάλογα με το σε ποια ομάδα τον βλέπουμε.
  const row = {
    api_id: p.id, // primary key από API
    name: p.name || null,

    // θα τα ορίσουμε πιο κάτω με βάση squad teamId
    team_id: p.team?.id ?? null,
    second_team_id: null,

    nationality: p.country?.name ?? null,
    position: p.position?.positionsDetailed ?? null,
    height: p.height ?? null,
    date_of_birth: p.dateOfBirth || null,
    foot: p.preferredFoot || null,
    jersey_num: p.jerseyNumber ?? null,
    contract: p.contractUntilTimestamp || null,
    market_value: p.proposedMarketValue ?? null,
    market_value_currency: p.proposedMarketValueRaw?.currency || null,
  };

  return row;
}

// === 5. Upsert στη Supabase "players" ===
async function upsertPlayer(row) {
  const { error } = await supabase
    .from("players")
    .upsert([row], { onConflict: "api_id" }); // βάλε unique constraint στο api_id

  if (error) {
    console.error("❌ Supabase error (upsertPlayer):", error);
    throw error;
  }

  console.log(`   ✅ Upserted player ${row.api_id} – ${row.name}`);
}

// === 6. Main runner ===
(async () => {
  try {
    const TEAM_IDS = await getTeamIdsFromDb();
    const existingPlayersMap = await getExistingPlayersMapFromDb();

    for (const teamId of TEAM_IDS) {
      // 1) πάρε τους παίκτες της ομάδας
      let squadPlayerIds = [];
      try {
        squadPlayerIds = await fetchSquadPlayerIds(teamId);
      } catch (err) {
        console.error(
          `❌ Error fetching squad for team ${teamId}:`,
          err.response?.data || err.message
        );
        continue; // συνέχισε στο επόμενο team
      }

      // 2) για κάθε playerId, χειριζόμαστε 1η / 2η ομάδα
      for (const playerId of squadPlayerIds) {
        const existing = existingPlayersMap.get(playerId);

        // === CASE 1: Ο παίκτης ΔΕΝ υπάρχει ακόμη στη DB → 1η ομάδα
        if (!existing) {
          try {
            const row = await fetchPlayerDetailAndMap(playerId);
            if (!row) continue;

            // Πρώτη ομάδα = τρέχον teamId από squad
            row.team_id = teamId;
            row.second_team_id = null;

            await upsertPlayer(row);

            existingPlayersMap.set(playerId, {
              team_id: row.team_id,
              second_team_id: row.second_team_id,
            });

            if (THROTTLE_MS > 0) await delay(THROTTLE_MS);
          } catch (err) {
            console.error(
              `❌ Error processing new player ${playerId}:`,
              err.response?.data || err.message
            );
          }
          continue;
        }

        // === CASE 2: Ο παίκτης υπάρχει ήδη με αυτή την ομάδα (είτε primary είτε second) → skip
        if (existing.team_id === teamId || existing.second_team_id === teamId) {
          // Ήδη καταχωρημένος με αυτή την ομάδα
          continue;
        }

        // === CASE 3: Ο παίκτης υπάρχει, αλλά τώρα τον βλέπουμε σε ΔΕΥΤΕΡΗ διαφορετική ομάδα
        try {
          const row = await fetchPlayerDetailAndMap(playerId);
          if (!row) continue;

          // Κρατάμε την 1η ομάδα όπως ήταν
          row.team_id = existing.team_id ?? teamId;

          // Καταχωρούμε ως second_team_id τη νέα ομάδα
          row.second_team_id = teamId;

          await upsertPlayer(row);

          existingPlayersMap.set(playerId, {
            team_id: row.team_id,
            second_team_id: row.second_team_id,
          });

          if (THROTTLE_MS > 0) await delay(THROTTLE_MS);
        } catch (err) {
          console.error(
            `❌ Error processing player ${playerId} for second team:`,
            err.response?.data || err.message
          );
        }
      }
    }

    console.log("\n🎉 Done for all teams & players!");
  } catch (e) {
    console.error("❌ Fatal Error:", e.response?.data || e.message);
  }
})();
