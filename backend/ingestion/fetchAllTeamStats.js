// ==============================================================================
// IMPORTS
// ==============================================================================

// Axios client wrapper for external API calls (Sofascore proxy or similar)
import { client } from "../lib/client.js";
// Utility helper to save raw JSON responses locally (for debugging / auditing)
import {
  calcPerc,
  saveJSON,
  truncateNumericStatFields,
  truncateStatNumber,
} from "../lib/utils.js";
// Supabase client (PostgreSQL connection via Supabase SDK)
import { supabase } from "../lib/supabaseClient.js";
import { fileURLToPath } from "url";

// ==============================================================================
// GLOBAL CONFIGURATION
// ==============================================================================

// Throttle delay between API calls (milliseconds)
// This protects you from rate limits and avoids overwhelming the API.
const THROTTLE_MS = 600;
const VALID_MODES = new Set(["refresh", "init"]);

// Small async helper that pauses execution for a given time
// Used to throttle API requests
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function parseMode(argv) {
  let mode = null;
  let modeProvided = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--mode") {
      modeProvided = true;
      mode = argv[i + 1];
      break;
    }

    if (arg.startsWith("--mode=")) {
      modeProvided = true;
      mode = arg.slice("--mode=".length);
      break;
    }

    if (
      arg === "refresh" ||
      arg === "init" ||
      arg === "--refresh" ||
      arg === "--init"
    ) {
      modeProvided = true;
      mode = arg.replace(/^--/, "");
      break;
    }
  }

  if (!modeProvided) return "refresh";

  if (!VALID_MODES.has(mode)) {
    throw new Error(
      `Invalid team stats sync mode "${mode}". Use "refresh", "init", or "--mode <mode>".`,
    );
  }

  return mode;
}

// ==============================================================================
// 1️⃣ GENERIC PAGINATION FETCH (SUPABASE)
// ==============================================================================

/**
 * Fetch ALL rows from a Supabase table in pages.
 *
 * Why this exists:
 * - Supabase queries often return up to 1000 rows at a time (and the SDK defaults
 *   to limits in many cases).
 * - If your table has more rows, you must paginate, otherwise you silently miss data.
 *
 * Inputs:
 * - table: which table to query
 * - select: which columns to fetch
 * - filters: array of [column, operator, value, negateBoolean]
 * - pageSize: page size (1000 is common / safe)
 *
 * Output:
 * - returns a single array containing all rows across all pages
 */
async function fetchAllRows({ table, select, filters = [], pageSize = 1000 }) {
  const all = []; // accumulator for all pages combined
  let from = 0; // starting index for .range()
  let page = 1; // page number for logs

  while (true) {
    console.log(
      `➡️ Fetching ${table} page ${page} (rows ${from}–${from + pageSize - 1})`,
    );

    // Create the base query:
    // select the requested columns and request a specific row range.
    let q = supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);

    // Apply dynamic filters (supporting both positive and negated filters)
    for (const f of filters) {
      const [col, op, val, negate] = f;

      // negate=true means: NOT (col op val)
      if (negate) q = q.not(col, op, val);
      else q = q.filter(col, op, val);
    }

    // Execute query
    const { data, error } = await q;

    // If Supabase returns an error, stop the entire script with a thrown exception.
    if (error) throw error;

    console.log(`⬅️ ${table} page ${page} returned ${data?.length ?? 0} rows`);

    // If empty result, pagination is finished
    if (!data || data.length === 0) break;

    // Accumulate this page
    all.push(...data);

    // If we got fewer than pageSize rows, this was the last page
    if (data.length < pageSize) break;

    // Otherwise go to next page
    from += pageSize;
    page++;
  }

  console.log(`✅ Total ${table} rows fetched: ${all.length}`);
  return all;
}

// ==============================================================================
// 2️⃣ PREPARE TARGET REQUESTS (FROM STANDINGS)
// ==============================================================================

/**
 * Builds the list of unique (team_id, season_id, tournament_id) combinations.
 *
 * Important design choice:
 * - We fetch "standings" because it acts like a *bridge table*:
 *     Team <-> Season <-> Tournament
 *
 * Why not just fetch teams directly?
 * - Teams alone are not enough to call /teams/get-statistics.
 *   That endpoint needs season + tournament as well.
 *
 * We also deduplicate because:
 * - Sometimes standings may contain multiple rows for the same team/season/tournament
 *   (e.g., different stages, groups, or duplicated ingestion).
 */
async function getInitTargetData() {
  console.log("📥 Loading Standings to identify Teams for init mode...");

  // Fetch all rows that have valid IDs because they connect Team <-> Season <-> Tournament
  const standings = await fetchAllRows({
    table: "standings",
    select: "team_id, tournament_id, season_id",
    filters: [
      ["team_id", "is", null, true],
      ["tournament_id", "is", null, true],
      ["season_id", "is", null, true],
    ],
    pageSize: 1000,
  });

  // Deduplication:
  // Create a unique key from team_id-season_id-tournament_id
  // If we've already seen the key, skip it.
  const uniqueMap = new Map();
  const rows = [];

  for (const s of standings) {
    const key = `${s.team_id}-${s.season_id}-${s.tournament_id}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, true);
      rows.push(s);
    }
  }

  console.log(`✅ Prepared ${rows.length} unique Team/Season requests`);
  return rows;
}

async function getRefreshTargetData() {
  console.log(
    "📥 Loading current-season team context from current_season_teams...",
  );

  // current_season_teams exposes both internal DB ids and external API ids.
  // This script preserves the existing team_stats contract, which stores the
  // external ids used by standings and by /teams/get-statistics.
  const currentSeasonTeams = await fetchAllRows({
    table: "current_season_teams",
    select:
      "team_id, team_api_id, tournament_id, season_id, tournament_api_id, season_api_id",
    filters: [
      ["team_api_id", "is", null, true],
      ["tournament_api_id", "is", null, true],
      ["season_api_id", "is", null, true],
    ],
    pageSize: 1000,
  });

  if (currentSeasonTeams.length === 0) {
    console.log(
      "ℹ️ current_season_teams returned 0 rows. No current-season team stats to fetch.",
    );
    return [];
  }

  const uniqueMap = new Map();
  const rows = [];

  for (const row of currentSeasonTeams) {
    const target = {
      team_id: row.team_api_id,
      tournament_id: row.tournament_api_id,
      season_id: row.season_api_id,
    };

    const key = `${target.team_id}-${target.season_id}-${target.tournament_id}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, true);
      rows.push(target);
    }
  }

  console.log(
    `✅ Prepared ${rows.length} current-season Team/Season requests`,
  );
  return rows;
}

async function getTargetDataForMode(mode) {
  if (mode === "init") {
    return getInitTargetData();
  }

  return getRefreshTargetData();
}

// ==============================================================================
// 3️⃣ API CALL + SAVE TO team_stats
// ==============================================================================

/**
 * Fetches team statistics from API and upserts them into Supabase.
 *
 * Two important behaviors:
 *
 * A) The API response shape can vary:
 *    - sometimes data is inside res.data.statistics
 *    - sometimes team stats fields exist directly on res.data
 *      (you detect this by checking goalsScored !== undefined)
 *
 * B) If NO stats exist:
 *    - you still upsert a "skeleton" row with identifiers
 *    - and set has_stats=false so later your app knows "not available"
 *
 * Upsert conflict key:
 *   team_id, season_id, tournament_id
 * This ensures 1 row per team per season per tournament.
 */
async function fetchAndSaveTeamStats(row) {
  const { team_id, tournament_id, season_id } = row;

  try {
    // Call the API endpoint for team stats with the required parameters.
    const res = await client.get("/teams/get-statistics", {
      params: {
        teamId: team_id,
        tournamentId: tournament_id,
        seasonId: season_id,
      },
      timeout: 10000, // 10 seconds timeout to avoid hanging on slow responses
    });

    // Debug log so you can validate behavior while running
    console.log("DBG", `Team ${team_id}`, {
      seasonId: season_id,
      tournamentId: tournament_id,
      status: res.status,
      hasData: !!res.data,
      hasStats: !!res.data?.statistics,
    });

    // Some endpoints return stats under res.data.statistics,
    // but others return the fields directly on res.data.
    // So we check both forms and pick the one that exists.
    let s = res.data?.statistics;

    // If statistics is missing BUT the root object seems to contain stat fields,
    // we treat root as the stats object.
    if (!s && res.data && res.data.goalsScored !== undefined) {
      s = res.data;
    }

    // hasStats = true if we have a non-empty stats object
    const hasStats = !!(s && Object.keys(s).length > 0);

    // Always save RAW payload for debugging (helps you catch mapping issues)
    saveJSON(
      `../data/raw/teamStats/debug_t${team_id}_s${season_id}.json`,
      res.data,
    );

    // ==========================================================
    // CASE 1: NO STATS AVAILABLE
    // ==========================================================
    if (!hasStats) {
      console.log(`🔸 No stats for Team ${team_id} → saving identifiers only`);

      // "Skeleton" row: you store the IDs and mark has_stats=false.
      // You also set matches=0 as a practical signal that this row is empty.
      const skeletonRow = {
        team_id,
        tournament_id,
        season_id,
        matches: 0, // placeholder: indicates missing/empty stats
        has_stats: false, // explicit flag for the UI / analytics pipeline
      };

      const { error } = await supabase.from("team_stats").upsert(skeletonRow, {
        onConflict: "team_id, season_id, tournament_id",
      });

      if (error) {
        console.error(`❌ DB Error (Team ${team_id}):`, error.message);
        throw error;
      } else {
        console.log(`✅ Saved (no stats): Team ${team_id}`);
      }
      return;
    }

    // ==========================================================
    // CASE 2: FULL STATS AVAILABLE
    // ==========================================================

    // Build the row that matches your "team_stats" table columns.
    // Notes about your design:
    // - You store both absolute values (shots, goals, passes)
    // - AND derived ratios using calcPerc()
    // - You also compute some custom ratios directly (goals/shots)
    const statsRow = truncateNumericStatFields(
      {
        // Flag: this row contains real stats
        has_stats: true,
        // -------------------------
        // IDs
        // -------------------------
        team_id: team_id,
        tournament_id: tournament_id,
        season_id: season_id,

      // --- General Stats ---
        matches: s.matches ?? null,

      // --- Attack ---
        goals_scored: s.goalsScored ?? null,
        goals_conceded: s.goalsConceded ?? null,
        own_goals: s.ownGoals ?? null,
        assists: s.assists ?? null,
        shots: s.shots ?? null,

      // --- Set Pieces ---
      // calcPerc(a, b) should return:
      // - null when missing data
      // - 0 when a=0 and b>0 (depending on your desired rules)
      // - and avoid division by zero
        penalty_scored: s.penaltyGoals ?? null,
        penalty_taken: s.penaltiesTaken ?? null,
        penalty_ratio: calcPerc(s.penaltyGoals, s.penaltiesTaken),

        freekick_goals: s.freeKickGoals ?? null,
        freekick_taken: s.freeKickShots ?? null,
        freekick_ratio: calcPerc(s.freeKickGoals, s.freeKickShots),

        corners: s.corners ?? null,

      // --- Goals/Shots Location ---
        goals_inside_box: s.goalsFromInsideTheBox ?? null,
        goals_outside_box: s.goalsFromOutsideTheBox ?? null,
        shots_inside_box: s.shotsFromInsideTheBox ?? null,
        shots_outside_box: s.shotsFromOutsideTheBox ?? null,

      // Ratios relative to totals
        goals_inside_ratio: calcPerc(s.goalsFromInsideTheBox, s.goalsScored),
        goals_outside_ratio: calcPerc(s.goalsFromOutsideTheBox, s.goalsScored),
        shots_inside_ratio: calcPerc(s.shotsFromInsideTheBox, s.shots),
        shots_outside_ratio: calcPerc(s.shotsFromOutsideTheBox, s.shots),

      // --- Headers ---
        goals_header: s.headedGoals ?? null,
        goals_header_ratio: calcPerc(s.headedGoals, s.goalsScored),

      // --- Shots Quality ---
        shots_ontarget: s.shotsOnTarget ?? null,
        shots_offtarget: s.shotsOffTarget ?? null,
        shots_blocked: s.blockedScoringAttempt ?? null,
        woodwork: s.hitWoodwork ?? null,
      // Ratios from totals
        shots_ontarget_ratio: calcPerc(s.shotsOnTarget, s.shots),
        // Custom ratio: goals per shot, truncated to 2 decimals.
        // IMPORTANT: null if shots are missing or 0 to avoid division by zero.
        goalspershot_ratio:
          s.shots && s.shots > 0
            ? truncateStatNumber(s.goalsScored / s.shots)
            : null,

      // --- Big Chances ---
        big_chances: s.bigChances ?? null,
        big_chances_created: s.bigChancesCreated ?? null,
        big_chances_missed: s.bigChancesMissed ?? null,
      // Your formula: (Big Chances - Missed) / Big Chances
      // This approximates "conversion of big chances".
        big_chances_goal_ratio: calcPerc(
          s.bigChances - s.bigChancesMissed,
          s.bigChances,
        ),

      // --- Dribbling ---
        dribbles_success: s.successfulDribbles ?? null,
        dribbles_attempts: s.dribbleAttempts ?? null,
        dribbles_success_ratio: calcPerc(
          s.successfulDribbles,
          s.dribbleAttempts,
        ),

      // --- Fast Breaks ---
        fastbreak_total: s.fastBreaks ?? null,
        fastbreak_goals: s.fastBreakGoals ?? null,
        fastbreak_shots: s.fastBreakShots ?? null,
        fastbreak_ratio: calcPerc(s.fastBreakGoals, s.fastBreaks),

      // --- Ball Possession ---
      // averageBallPossession often comes as string, so parseFloat it
        avg_ball_possession: s.averageBallPossession
          ? parseFloat(s.averageBallPossession)
          : null,
        possession_lost: s.possessionLost ?? null,

      // --- Passes (General) ---
        pass_total: s.totalPasses ?? null,
        pass_acc: s.accuratePasses ?? null,
        pass_acc_percentage: s.accuratePassesPercentage
          ? parseFloat(s.accuratePassesPercentage)
          : null,

      // --- Passing (By field areas) ---
        pass_ownhalf_total: s.totalOwnHalfPasses ?? null,
        pass_ownhalf_acc: s.accurateOwnHalfPasses ?? null,
        pass_ownhalf_perc: s.accurateOwnHalfPassesPercentage
          ? parseFloat(s.accurateOwnHalfPassesPercentage)
          : null,

        pass_opphalf_total: s.totalOppositionHalfPasses ?? null,
        pass_opphalf_acc: s.accurateOppositionHalfPasses ?? null,
        pass_opphalf_perc: s.accurateOppositionHalfPassesPercentage
          ? parseFloat(s.accurateOppositionHalfPassesPercentage)
          : null,

      // --- Long Balls & Crosses ---
        longballs_total: s.totalLongBalls ?? null,
        longballs_acc: s.accurateLongBalls ?? null,
        longballs_perc: s.accurateLongBallsPercentage
          ? parseFloat(s.accurateLongBallsPercentage)
          : null,

        cross_total: s.totalCrosses ?? null,
        cross_acc: s.accurateCrosses ?? null,
        cross_perc: s.accurateCrossesPercentage
          ? parseFloat(s.accurateCrossesPercentage)
          : null,

      // --- Defending ---
        cleansheats: s.cleanSheets ?? null, // Προσοχή: όπως είναι γραμμένο στη βάση (cleansheats)
        tackles: s.tackles ?? null,
        interceptions: s.interceptions ?? null,
        saves: s.saves ?? null,
        clearences: s.clearances ?? null,
        clearences_offline: s.clearancesOffLine ?? null,
        lastman_tackles: s.lastManTackles ?? null,
        errors_to_goals: s.errorsLeadingToGoal ?? null,
        errors_to_shot: s.errorsLeadingToShot ?? null,

        penalty_commited: s.penaltiesCommited ?? null,
        penalty_conceded: s.penaltyGoalsConceded ?? null,

      // --- Duels ---
        duels_total: s.totalDuels ?? null,
        duels_won: s.duelsWon ?? null,
        duels_perc: s.duelsWonPercentage
          ? parseFloat(s.duelsWonPercentage)
          : null,

        ground_duels_total: s.totalGroundDuels ?? null,
        // This line supports two possible API keys.
        // If groundGroundDuels exists, use it; otherwise use groundDuelsWon.
        ground_duels_won: s.groundGroundDuels ?? s.groundDuelsWon ?? null,
        ground_duels_perc: s.groundDuelsWonPercentage
          ? parseFloat(s.groundDuelsWonPercentage)
          : null,

        aerial_duels_total: s.totalAerialDuels ?? null,
        aerial_duels_won: s.aerialDuelsWon ?? null,
        aerial_duels_perc: s.aerialDuelsWonPercentage
          ? parseFloat(s.aerialDuelsWonPercentage)
          : null,

      // --- Discipline ---
        fouls: s.fouls ?? null,
        offsides: s.offsides ?? null,
        yellowcards: s.yellowCards ?? null,
        yellowcards_second: s.yellowRedCards ?? null,
        redcards: s.redCards ?? null,

      // --- Opponent Performance Against Stats ---

        shots_against: s.shotsAgainst ?? null,
        shots_blocked_against:
          s.shotsBlockedAgainst ?? s.blockedScoringAttemptAgainst ?? null,
        shots_inside_against: s.shotsFromInsideTheBoxAgainst ?? null,
        shots_outside_against: s.shotsFromOutsideTheBoxAgainst ?? null,
        shots_ontarget_against: s.shotsOnTargetAgainst ?? null,
        shots_offtarget_against: s.shotsOffTargetAgainst ?? null,
        woodwork_against: s.hitWoodworkAgainst ?? null,

      // goals conceded per shot faced
        goalspershot_against_ratio:
          s.shotsAgainst && s.shotsAgainst > 0
            ? truncateStatNumber(s.goalsConceded / s.shotsAgainst)
            : null,

      // shots on target against as % of all shots against
        shots_ontarget_against_ratio: calcPerc(
          s.shotsOnTargetAgainst,
          s.shotsAgainst,
        ),

      // Big chances conceded
        big_chances_against: s.bigChancesAgainst ?? null,
        big_chances_against_created: s.bigChancesCreatedAgainst ?? null,
        big_chances_against_missed: s.bigChancesMissedAgainst ?? null,
      // goals conceded per big chance faced
        big_chances_goal_against_ratio:
          s.bigChancesAgainst && s.bigChancesAgainst > 0
            ? truncateStatNumber(s.goalsConceded / s.bigChancesAgainst)
            : null,

        errors_to_goals_against: s.errorsLeadingToGoalAgainst ?? null,
        errors_to_shot_against: s.errorsLeadingToShotAgainst ?? null,

      // Passing against ratios
        pass_against_total: s.totalPassesAgainst ?? null,
        pass_against_acc: s.accuratePassesAgainst ?? null,
        pass_against_ratio: calcPerc(
          s.accuratePassesAgainst,
          s.totalPassesAgainst,
        ),

        finalthirdpass_against_total: s.totalFinalThirdPassesAgainst ?? null,
        finalthirdpass_against_acc: s.accurateFinalThirdPassesAgainst ?? null,
        finalthirdpass_against_ratio: calcPerc(
          s.accurateFinalThirdPassesAgainst,
          s.totalFinalThirdPassesAgainst,
        ),

        opphalfpass_against_total: s.oppositionHalfPassesTotalAgainst ?? null,
        opphalfpass_against_acc: s.accurateOppositionHalfPassesAgainst ?? null,
        opphalfpass_against_ratio: calcPerc(
          s.accurateOppositionHalfPassesAgainst,
          s.oppositionHalfPassesTotalAgainst,
        ),

        ownhalfpass_against_total: s.ownHalfPassesTotalAgainst ?? null,
        ownhalfpass_against_acc: s.accurateOwnHalfPassesAgainst ?? null,
        ownhalfpass_against_ratio: calcPerc(
          s.accurateOwnHalfPassesAgainst,
          s.ownHalfPassesTotalAgainst,
        ),

        keypass_against: s.keyPassesAgainst ?? null,

        longballs_against_total: s.longBallsTotalAgainst ?? null,
        longballs_against_acc: s.longBallsSuccessfulAgainst ?? null,
        longballs_against_ratio: calcPerc(
          s.longBallsSuccessfulAgainst,
          s.longBallsTotalAgainst,
        ),

        cross_against_total: s.crossesTotalAgainst ?? null,
        cross_against_acc: s.crossesSuccessfulAgainst ?? null,
        cross_against_ratio: calcPerc(
          s.crossesSuccessfulAgainst,
          s.crossesTotalAgainst,
        ),

        dribbles_against_total: s.dribbleAttemptsTotalAgainst ?? null,
        dribbles_against_acc: s.dribbleAttemptsWonAgainst ?? null,
        dribbles_against_ratio: calcPerc(
          s.dribbleAttemptsWonAgainst,
          s.dribbleAttemptsTotalAgainst,
        ),

      // General against stats
        tackles_against: s.tacklesAgainst ?? null,
        clearences_against: s.clearancesAgainst ?? null,
        interceptions_against: s.interceptionsAgainst ?? null,
        corners_against: s.cornersAgainst ?? null,
        offsides_against: s.offsidesAgainst ?? null,
        yellowcards_against: s.yellowCardsAgainst ?? null,
        redcards_against: s.redCardsAgainst ?? null,
      },
      ["team_id", "tournament_id", "season_id"],
    );

    // Save into DB using upsert so repeated runs update existing rows
    const { error } = await supabase.from("team_stats").upsert(statsRow, {
      onConflict: "team_id, season_id, tournament_id",
    });

    if (error) {
      console.error(`❌ DB Error (Team ${team_id}):`, error.message);
      throw error;
    } else {
      console.log(`✅ Saved: Team ${team_id}`);
    }
  } catch (err) {
    // Timeouts are common when calling external APIs, so we separate them for clearer logs.
    if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
      console.warn(`⏳ Timeout: Team ${team_id}`);
    } else {
      console.error(`❌ Error for Team ${team_id}:`, err.message);
    }
    throw err;
  }
}

// ==============================================================================
// 4️⃣ MAIN EXECUTION (RUN SCRIPT)
// ==============================================================================

/**
 * Self-invoking async function so you can run this file directly using Node:
 *   node fetchAllTeamStats.js
 *
 * Execution flow:
 * 1. Prepare unique requests (team/season/tournament)
 * 2. For each request:
 *    - fetch stats from API
 *    - upsert into DB
 *    - wait THROTTLE_MS
 */
export async function runFetchAllTeamStats({ mode = "refresh" } = {}) {
  if (!VALID_MODES.has(mode)) {
    throw new Error(
      `Invalid team stats sync mode "${mode}". Use "refresh" or "init".`,
    );
  }

  console.log(`🚀 Starting Team Stats Fetch (${mode} mode)...`);
  console.log(
    mode === "init"
      ? "Mode detail: init fetches team stats for all standings-backed DB seasons."
      : "Mode detail: refresh fetches team stats only for current seasons.",
  );

  const rows = await getTargetDataForMode(mode);
  const failures = [];

  // Sequential processing (safe for rate limits)
  // You could later upgrade this to a concurrency pool if needed.
  for (const row of rows) {
    try {
      await fetchAndSaveTeamStats(row);
    } catch (error) {
      failures.push({ row, error });
    }

    await delay(THROTTLE_MS);
  }

  if (failures.length > 0) {
    throw new Error(`Team stats sync failed for ${failures.length} row(s).`);
  }

  console.log("\n🎉 ALL DONE!");
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  try {
    const mode = parseMode(process.argv.slice(2));
    await runFetchAllTeamStats({ mode });
  } catch (error) {
    // Any thrown error from fetchAllRows / getTargetData ends up here
    console.error("❌ Fatal Error:", error.message);
    process.exitCode = 1;
  }
}
