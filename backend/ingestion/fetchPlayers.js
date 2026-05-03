// ==============================================================================
// IMPORTS
// ==============================================================================

// Axios client wrapper used to call your external API endpoints (Sofascore proxy)
import { client } from "../lib/client.js";
// Helper utility for writing raw JSON responses to disk (useful for debugging)
import { saveJSON } from "../lib/utils.js";
// Supabase client (your database connection via Supabase SDK)
import { supabase } from "../lib/supabaseClient.js";
// Position service to ensure positions exist in DB and get their IDs
import { createPositionService, normalizePositions } from "../lib/positions.js";

// ==============================================================================
// GLOBAL CONFIGURATION
// ==============================================================================

// Optional throttling delay to reduce the chance of API rate limiting.
// The script makes MANY API calls (one per team squad + one per player detail),
// so even a small delay can prevent 429/timeout issues.
const THROTTLE_MS = 250;
// Simple async sleep helper used by the throttle.
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Create the position service instance (you can use this to ensure positions exist and get their IDs)
const positionService = createPositionService(supabase);

// ==============================================================================
// 1) LOAD TEAM IDS FROM DATABASE
// ==============================================================================

/**
 * Reads current-season team ids from the "current_season_teams" view.
 *
 * Why this exists:
 * - This script needs a current-season list of teams to iterate over
 * - For each team, it calls /teams/get-squad to discover player ids
 *
 * Notes:
 * - It filters out rows where api_id is NULL, because those would break the API call.
 * - It also deduplicates team ids using a Set(), just in case duplicates exist.
 *
 * Returns:
 * - Array<number|string> of unique team api ids
 */
async function getCurrentTeamsFromDb() {
  const { data, error } = await supabase
    .from("current_season_teams")
    .select("team_id, team_api_id, team_name")
    .not("team_id", "is", null)
    .not("team_api_id", "is", null);

  // If the DB query fails, we log and throw, because the script cannot continue.
  if (error) {
    console.error("❌ Supabase error (getCurrentTeamsFromDb):", error);
    throw error;
  }

  // Deduplicate: Set() removes duplicates, then spread (...) converts back to an array
  const uniqueTeams = new Map();
  for (const row of data ?? []) {
    if (!uniqueTeams.has(row.team_api_id)) {
      uniqueTeams.set(row.team_api_id, {
        team_id: row.team_id, // internal DB id
        team_api_id: row.team_api_id, // external API id
        team_name: row.team_name ?? null,
      });
    }
  }

  const teams = [...uniqueTeams.values()];

  console.log(
    "Current-season teams from DB:",
    teams.map((t) => ({
      team_id: t.team_id,
      team_api_id: t.team_api_id,
      team_name: t.team_name,
    })),
  );

  return teams;
}

// ==============================================================================
// 2) LOAD EXISTING PLAYERS FROM DATABASE (IN-MEMORY LOOKUP MAP)
// ==============================================================================

/**
 * Loads all existing players from the "players" table and builds a Map for fast lookups.
 *
 * Why this exists:
 * - During ingestion, the same player might appear in multiple squads
 * - We want to avoid re-inserting or accidentally overwriting team_id incorrectly
 *
 * Data structure:
 * - Map<player_api_id, { team_id, second_team_id }>
 *
 * Why Map?
 * - O(1) lookup by playerId instead of O(n) scanning arrays.
 *
 * Returns:
 * - Map keyed by player api_id
 */
async function getExistingPlayersMapFromDb() {
  const { data, error } = await supabase
    .from("players")
    .select("api_id, team_id")
    .not("api_id", "is", null);

  if (error) {
    console.error("❌ Supabase error (getExistingPlayersMapFromDb):", error);
    throw error;
  }

  // Convert DB rows into a Map for fast access:
  // playerId -> { team_id, second_team_id }
  const map = new Map();
  for (const row of data) {
    map.set(row.api_id, {
      team_id: row.team_id,
    });
  }

  console.log("Existing players in DB:", map.size);
  return map;
}

// ==============================================================================
// 3) FETCH A TEAM'S SQUAD AND EXTRACT UNIQUE PLAYER IDS
// ==============================================================================

/**
 * Calls the API endpoint /teams/get-squad for a specific team.
 *
 * Goal:
 * - Extract a unique list of player ids that belong to this team’s squad.
 *
 * Why unique?
 * - The API may include the same player in multiple arrays (players/national/foreign)
 * - Using a Set ensures you only process each player once per team.
 *
 * Also:
 * - Saves the raw squad JSON in /data/raw/ so you can inspect it later.
 *
 * Returns:
 * - Array of unique player ids
 */
async function fetchSquadPlayerIds(team_api_id) {
  console.log(`\n=== Squad for team API ${team_api_id} ===`);

  // API call to retrieve squad players for the given teamId
  const res = await client.get("/teams/get-squad", {
    params: { teamId: String(team_api_id) },
  });

  const data = res.data;

  // Save raw response so you can debug and validate the API shape anytime
  saveJSON(`../data/raw/players/teams/team_${team_api_id}_squad.json`, data);

  // Set used to deduplicate player IDs
  const playerIdSet = new Set();

  // The API response may separate squad players by categories.
  // We unify them into one list of ids.
  const groups = [
    data.players || [],
    data.nationalPlayers || [],
    data.foreignPlayers || [],
  ];

  // Each item might be either:
  // - { player: {...} } or
  // - directly {...}
  // so we normalize with: item?.player || item
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
    `➡️  Found ${playerIds.length} unique players for team API ${team_api_id}`,
  );
  return playerIds;
}

// ==============================================================================
// 4) FETCH PLAYER DETAIL AND MAP TO DB ROW SHAPE
// ==============================================================================

/**
 * Calls /players/detail for one playerId and maps the API response to a row object
 * compatible with your Supabase "players" table.
 *
 * Important:
 * - team_id and second_team_id are NOT finalized here.
 *   They are overwritten in the main loop depending on the team whose squad we found them in.
 *
 * Returns:
 * - row object ready for upsert
 * - OR null if API response does not include a "player" object
 */
async function fetchPlayerDetailAndMap(playerId) {
  console.log(`   → Fetching player detail for ${playerId}...`);

  const res = await client.get("/players/detail", {
    params: { playerId: String(playerId) },
  });

  const data = res.data;

  // Save raw detail response for debugging and validation
  saveJSON(
    `../data/raw/players/playersDetails/player_${playerId}_detail.json`,
    data,
  );

  // The API should include data.player, but we guard in case it doesn't.
  const p = data.player;
  if (!p) {
    console.warn(
      `   ⚠️ No "player" object found in response for id ${playerId}`,
    );
    return null;
  }

  // Positions come like:
  // p.position.positionsDetailed = ["DL", ...]
  // We store them in a join table (Option B), NOT on players table anymore.
  const positionCodes = normalizePositions(p);

  /**
   * Create the row object matching your DB schema.
   *
   * NOTE:
   * - team_id here is initially filled from p.team?.id, but you overwrite it later.
   */
  const row = {
    api_id: p.id, // stable unique id from API
    name: p.name || null,

    // These will be re-assigned in the main loop based on which squad you found the player in.
    team_id: p.team?.id ?? null,

    nationality: p.country?.name ?? null,
    height: p.height ?? null,
    date_of_birth: p.dateOfBirth || null,
    foot: p.preferredFoot || null,
    jersey_num: p.jerseyNumber ?? null,
    contract: p.contractUntilTimestamp || null,
    market_value: p.proposedMarketValue ?? null,
    market_value_currency: p.proposedMarketValueRaw?.currency || null,
  };

  return { row, positionCodes };
}

// ==============================================================================
// 5) UPSERT PLAYER ROW INTO DATABASE (RETURN DB ID)
// ==============================================================================

/**
 * Upserts player by api_id and RETURNS the internal DB id (players.id)
 * so we can write to player_positions join table.
 */
async function upsertPlayer(row) {
  const { data, error } = await supabase
    .from("players")
    .upsert([row], { onConflict: "api_id" })
    .select("id");

  if (error) {
    console.error("❌ Supabase error (upsertPlayer):", error);
    throw error;
  }

  const playerDbId = data?.[0]?.id ?? null;
  if (!playerDbId) {
    throw new Error(
      `Upsert succeeded but could not read players.id for api_id=${row.api_id}`,
    );
  }

  console.log(`   ✅ Upserted player ${row.api_id} – ${row.name}`);
  return playerDbId;
}

// ==============================================================================
// 6) WRITE PLAYER_POSITIONS JOIN ROWS
// ==============================================================================

/**
 * Ensures positions exist and then replaces join rows for ONE player.
 * (Delete old joins for that player, insert current ones)
 */
async function upsertPlayerPositions(playerDbId, positionCodes) {
  // Normalize codes (trim + remove empty)
  const codes = Array.isArray(positionCodes)
    ? positionCodes
        .map((c) => (typeof c === "string" ? c.trim() : ""))
        .filter(Boolean)
    : [];

  // If no positions from API, we still want to delete old links (to keep DB accurate)
  // So we call replacePlayerPositions with empty joinRows.
  const codeToId = await positionService.ensurePositionsAndGetIdMap(codes);

  const joinRows = [];
  for (const code of codes) {
    const posId = codeToId.get(code);
    if (posId) {
      joinRows.push({ player_id: playerDbId, position_id: posId });
    }
  }

  // Replace all existing join rows for this player with the new ones
  await positionService.replacePlayerPositions([playerDbId], joinRows);
}

// ==============================================================================
// 7) MAIN RUNNER
// ------------------------------------------------------------------------------
// What this block does (high level):
// 1) Loads the list of current-season team IDs we want to process from the database.
// 2) Loads a local in-memory "cache" (Map) of players that already exist in our DB.
// 3) For each team:
//    - Fetches the squad player IDs from the API.
//    - For each player in that squad:
//        - If the player is NOT already in our DB:
//            a) Fetches the player's details from the API and maps them to a DB row shape.
//            b) Sets the player's primary team_id to the team currently being processed.
//            c) Upserts the player into the DB (insert or update) and gets the DB primary key.
//            d) Upserts the player's positions into a join table (many-to-many relationship).
//            e) Updates the in-memory cache so we don't re-process the same player.
//            f) Throttles API calls to avoid rate limits.
// 4) Continues safely even if individual teams/players fail (best-effort ingestion).
//
// Important assumptions:
// - getCurrentTeamsFromDb(): returns current-season team rows from current_season_teams.
// - getExistingPlayersMapFromDb(): returns Map keyed by API player ID -> { team_id, ... }.
// - fetchSquadPlayerIds(teamId): calls API endpoint for that team's squad, returns array of API player IDs.
// - fetchPlayerDetailAndMap(playerId): calls API endpoint for player details and returns:
//     { row: <player row object>, positionCodes: <array of position identifiers/codes> }
// - upsertPlayer(row): upserts into players table and returns the DB player id (primary key).
// - upsertPlayerPositions(playerDbId, positionCodes): upserts into player_positions join table.
// - THROTTLE_MS: number of milliseconds to wait between API calls.
// - delay(ms): helper that returns a Promise that resolves after ms.
// ==============================================================================

(async () => {
  // Wrap the entire ingestion run in a try/catch so we can catch unexpected failures
  // (e.g., DB connection errors, misconfigured env vars, etc.)
  try {
    // --------------------------------------------------------------------------
    // Step 1: Load the current-season teams we are going to process
    // --------------------------------------------------------------------------
    // teams is the current-season list from current_season_teams for which we fetch squads.
    // We loop over these current-season teams and attempt to ingest any missing players.
    const teams = await getCurrentTeamsFromDb();

    console.log(`Syncing players for ${teams.length} current teams`);

    // --------------------------------------------------------------------------
    // Step 2: Load an in-memory lookup of existing players
    // --------------------------------------------------------------------------
    // existingPlayersMap is a Map where:
    //   key   = API player id (the id returned by Sofascore or your external provider)
    //   value = an object containing DB-known fields (e.g., team_id)
    //
    // Why do this?
    // - Prevents us from re-querying the DB for every single player inside loops.
    // - Makes "does this player already exist?" an O(1) lookup.
    const existingPlayersMap = await getExistingPlayersMapFromDb();

    // --------------------------------------------------------------------------
    // Step 3: Process each team one by one
    // --------------------------------------------------------------------------
    for (const team of teams) {
      // We'll store the squad's player IDs here.
      // Default is empty; if the API call fails, we skip this team.
      let squadPlayerIds = [];

      try {
        // ----------------------------------------------------------------------
        // Step 3a: Fetch the squad for this team
        // ----------------------------------------------------------------------
        // This typically calls an endpoint like:
        //   /team/{teamId}/squad
        // and returns a list of player IDs.
        console.log(
          `\n🏟️ Processing ${team.team_name ?? "unknown team"} | db:${team.team_id} | api:${team.team_api_id}`,
        );

        squadPlayerIds = await fetchSquadPlayerIds(team.team_api_id);
      } catch (err) {
        // If squad fetch fails, log and continue to next team.
        // We don't want one broken team to kill the whole run.
        console.error(
          `❌ Error fetching squad for team ${team.team_name ?? team.team_api_id}:`,
          // If Axios error, err.response.data is often most informative.
          err.response?.data || err.message,
        );
        continue; // Skip this team and move on.
      }

      // ------------------------------------------------------------------------
      // Step 4: Process each player in the squad
      // ------------------------------------------------------------------------
      for (const playerId of squadPlayerIds) {
        // Lookup whether this API playerId already exists in DB (via local cache).
        const existing = existingPlayersMap.get(playerId);

        // If the player is already known, we do nothing (in this snippet).
        // Note: You could also add "update existing players" logic here later
        // (e.g., refresh details if stale).
        if (!existing) {
          // Player does NOT exist in DB yet -> ingest the player and positions
          try {
            // ------------------------------------------------------------------
            // Step 4a: Fetch player details from API and map them to DB format
            // ------------------------------------------------------------------
            // fetchPlayerDetailAndMap should:
            // - call the API player details endpoint
            // - convert the API response to your DB schema format
            // - extract positions into an array (positionCodes)
            const result = await fetchPlayerDetailAndMap(playerId);

            // If the API returned nothing / mapping failed, skip this player.
            if (!result) continue;

            const { row, positionCodes } = result;

            // ------------------------------------------------------------------
            // Step 4b: Assign primary team_id based on the current team loop
            // ------------------------------------------------------------------
            // We treat the "teamId we're currently processing" as the player's
            // "primary team" (at least for initial ingestion).
            //
            // This is useful because squad endpoints implicitly define membership.
            // Even if the player details endpoint has team info, your ingestion rule
            // here is: "current squad team is the authoritative team_id".
            row.team_id = team.team_id;

            // ------------------------------------------------------------------
            // Step 4c: Upsert the player row into DB
            // ------------------------------------------------------------------
            // upsertPlayer(row) should insert if missing, update if exists,
            // and return the player's DB primary key (playerDbId).
            //
            // Why return DB id?
            // Because join tables typically reference internal DB primary keys,
            // not external API IDs.
            const playerDbId = await upsertPlayer(row);

            // Helpful logging for debugging ingestion + position linking.
            console.log(
              "Upserting position: Player DB ID:",
              playerDbId,
              "Position Codes:",
              positionCodes,
            );

            // ------------------------------------------------------------------
            // Step 4d: Upsert player's positions in the join table
            // ------------------------------------------------------------------
            // This usually means:
            // - Ensure each position exists in "positions" table
            // - Then link (playerDbId, positionId) in "player_positions" join table
            //
            // positionCodes should be an array (even if the API returns a single position).
            await upsertPlayerPositions(playerDbId, positionCodes);

            // ------------------------------------------------------------------
            // Step 4e: Update local cache so we don't process same player again
            // ------------------------------------------------------------------
            // This matters if:
            // - the same player appears in multiple squads due to data issues
            // - current_season_teams contains duplicates (shouldn't, but still)
            // - you later add logic that revisits players
            existingPlayersMap.set(playerId, {
              team_id: row.team_id,
            });

            // ------------------------------------------------------------------
            // Step 4f: Throttle to respect API limits / avoid bursts
            // ------------------------------------------------------------------
            // If THROTTLE_MS is 0, no delay occurs.
            // If positive, wait between player requests.
            if (THROTTLE_MS > 0) await delay(THROTTLE_MS);
          } catch (err) {
            // If anything fails for this player (API mapping, DB write, etc.),
            // log and continue with the next player.
            console.error(
              `❌ Error processing new player ${playerId}:`,
              err.response?.data || err.message,
            );
          }

          // Continue to next player (explicit, though the loop will do it anyway).
          continue;
        }

        // If existing is truthy, this player is already in DB.
        // Current behavior: do nothing (skip).
        // You can later expand with refresh logic here if you want.
      }
    }

    // --------------------------------------------------------------------------
    // Step 5: Done
    // --------------------------------------------------------------------------
    console.log("\n🎉 Done for all current-season teams & players!");
  } catch (e) {
    // Catch truly fatal errors that happen outside per-team/per-player try/catch.
    // Example: getCurrentTeamsFromDb() fails, DB is down, config missing, etc.
    console.error("❌ Fatal Error:", e.response?.data || e.message);
  }
})();
