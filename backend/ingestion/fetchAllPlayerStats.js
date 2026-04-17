// ==============================================================================
// IMPORTS
// ==============================================================================

// Axios client wrapper for external API calls (Sofascore proxy or similar)
import { client } from "../lib/client.js";
// Utility helper to save raw JSON responses locally (for debugging / auditing)
import { saveJSON, truncateNumericStatFields } from "../lib/utils.js";
// Supabase client (PostgreSQL connection via Supabase SDK)
import { supabase } from "../lib/supabaseClient.js";

// ==============================================================================
// GLOBAL CONFIGURATION
// ==============================================================================

// Throttle delay between API calls (milliseconds)
// This protects you from rate limits and avoids overwhelming the API.
const THROTTLE_MS = 600;

// Small async helper that pauses execution for a given time
// Used to throttle API requests
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ==============================================================================
// 1️⃣ GENERIC PAGINATED FETCH FROM SUPABASE
// ==============================================================================

/**
 * Fetch ALL rows from a Supabase table using pagination.
 *
 * Why this exists:
 * Supabase has a 1000-row default limit.
 * If your table contains more rows, you MUST paginate.
 *
 * Parameters:
 * - table: name of the table
 * - select: columns to retrieve
 * - filters: optional filtering rules
 * - pageSize: number of rows per request
 *
 * Returns:
 * - Full array of rows from the table
 */
async function fetchAllRows({ table, select, filters = [], pageSize = 1000 }) {
  const all = []; // Accumulates ALL rows
  let from = 0; // Pagination start index
  let page = 1; // Page counter (for logging)

  while (true) {
    console.log(
      `➡️ Fetching ${table} page ${page} (rows ${from}–${from + pageSize - 1})`,
    );

    // Build base query
    let q = supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);

    // Apply dynamic filters
    for (const f of filters) {
      const [col, op, val, negate] = f;

      // If negate = true → use NOT filter
      if (negate) q = q.not(col, op, val);
      else q = q.filter(col, op, val);
    }

    const { data, error } = await q;

    // Stop immediately if DB error occurs
    if (error) throw error;

    console.log(`⬅️ ${table} page ${page} returned ${data?.length ?? 0} rows`);

    // If nothing returned → stop loop
    if (!data || data.length === 0) break;

    // Add page results to accumulator
    all.push(...data);

    // If last page (less than pageSize returned) → stop
    if (data.length < pageSize) break;

    // Move to next page
    from += pageSize;
    page++;
  }

  console.log(`✅ Total ${table} rows fetched: ${all.length}`);
  return all;
}

// ==============================================================================
// 2️⃣ PREPARE VALID API REQUESTS
// ==============================================================================

/**
 * Builds all valid combinations of:
 *  player + tournament + season
 *
 * Logic:
 * 1. Load players
 * 2. Load current-season team context
 * 3. Match player.team_id with current_season_teams.team_id
 * 4. Prepare API request rows
 *
 * Performance Optimization:
 * Uses Map() instead of .find()
 * → O(1) lookup instead of O(n)
 */
async function getTargetData() {
  console.log("📥 Loading players + current-season teams from DB (paginated)...");

  // Load valid players (must have api_id + team_id)
  const players = await fetchAllRows({
    table: "players",
    select: "api_id, team_id, name",
    filters: [
      ["api_id", "is", null, true], // .not("api_id", "is", null)
      ["team_id", "is", null, true], // .not("team_id", "is", null)
    ],
    pageSize: 1000,
  });

  // Load current-season team context
  const currentSeasonTeams = await fetchAllRows({
    table: "current_season_teams",
    select:
      "team_id, tournament_id, season_id, tournament_api_id, season_api_id",
    filters: [
      ["team_id", "is", null, true],
      ["tournament_id", "is", null, true],
      ["season_id", "is", null, true],
      ["tournament_api_id", "is", null, true],
      ["season_api_id", "is", null, true],
    ],
    pageSize: 1000,
  });

  console.log(`👥 Players loaded: ${players.length}`);
  console.log(
    `📊 current_season_teams rows loaded: ${currentSeasonTeams.length}`,
  );

  if (currentSeasonTeams.length === 0) {
    console.log(
      "ℹ️ current_season_teams returned 0 rows. No current-season player stats to fetch.",
    );
    return [];
  }

  const currentSeasonTeamByTeam = new Map();
  for (const teamRow of currentSeasonTeams) {
    currentSeasonTeamByTeam.set(teamRow.team_id, teamRow);
  }

  const rows = [];
  let skippedPlayers = 0;

  for (const player of players) {
    const currentSeasonTeam = currentSeasonTeamByTeam.get(player.team_id);

    // If team has no season/tournament context → skip
    if (!currentSeasonTeam) {
      skippedPlayers++;
      continue;
    }

    rows.push({
      player,
      team_id: player.team_id,
      tournament_id: currentSeasonTeam.tournament_id,
      season_id: currentSeasonTeam.season_id,
      tournament_api_id: currentSeasonTeam.tournament_api_id,
      season_api_id: currentSeasonTeam.season_api_id,
    });
  }

  console.log(`✅ Valid player requests prepared: ${rows.length}`);
  console.log(
    `⏭️ Players skipped (team_id not found in current_season_teams): ${skippedPlayers}`,
  );
  return rows;
}

// ==============================================================================
// 3️⃣ FETCH PLAYER STATS FROM API + SAVE TO DATABASE
// ==============================================================================

/**
 * For a given (player, team, tournament, season):
 *
 * 1. Calls external API
 * 2. Saves raw JSON for debugging
 * 3. Normalizes statistics
 * 4. Upserts into player_stats table
 *
 * Upsert ensures:
 * - If row exists → UPDATE
 * - If not → INSERT
 *
 * Conflict Key:
 * player_id, team_id, season_id, tournament_id
 */
async function fetchAndSaveStats(row) {
  const {
    player,
    team_id,
    tournament_id,
    season_id,
    tournament_api_id,
    season_api_id,
  } = row;

  try {
    // Call external API
    const res = await client.get("/players/get-statistics", {
      params: {
        playerId: player.api_id,
        tournamentId: tournament_api_id,
        seasonId: season_api_id,
      },
      timeout: 10000, // 10 seconds timeout to avoid hanging
    });

    // Debug log so you can validate behavior while running
    console.log("DBG", player.name, {
      playerId: player.api_id,
      seasonId: season_api_id,
      tournamentId: tournament_api_id,
      dbSeasonId: season_id,
      dbTournamentId: tournament_id,
      status: res.status,
      hasData: !!res.data,
      hasStats: !!res.data?.statistics,
      statsKeys: res.data?.statistics ? Object.keys(res.data.statistics) : null,
    });

    // Extract statistics object safely
    const s = res.data?.statistics;

    // If API returns no stats, still save the identifiers (and defaults for everything else)
    const hasStats = !!(s && Object.keys(s).length > 0);

    // Always save raw payload for debugging
    saveJSON(`../data/raw/playerStats/debug_${player.api_id}.json`, res.data);

    // ==========================================================
    // CASE 1: NO STATS AVAILABLE
    // ==========================================================
    if (!hasStats) {
      console.log(`🔸 No stats for ${player.name} → saving identifiers only`);

      const skeletonRow = {
        player_id: player.api_id,
        team_id,
        tournament_id,
        season_id,
        has_stats: false,
      };

      const { error } = await supabase
        .from("player_stats")
        .upsert(skeletonRow, {
          onConflict: "player_id, team_id, season_id, tournament_id",
        });

      if (error) {
        console.error(`❌ DB Error (${player.name}):`, error.message);
      } else {
        console.log(`✅ Saved identifiers only(no stats): ${player.name}`);
      }
      return;
    }

    // ==========================================================
    // CASE 2: STATS AVAILABLE
    // ==========================================================

    // Build normalized DB row
    // - Convert numeric strings → floats
    // - Replace undefined with null
    // - Avoid NaN
    const statsRow = truncateNumericStatFields(
      {
        player_id: player.api_id,
        team_id: team_id,
        tournament_id: tournament_id,
        season_id: season_id,

      // --- General Stats ---
        rating:
          s.rating && !isNaN(parseFloat(s.rating))
            ? parseFloat(s.rating)
            : null, // 1. rating ok
        total_rating: s.totalRating ? parseFloat(s.totalRating) : null, // 2. totalRating ok
        count_rating: s.countRating ?? null, // 3. countRating ok
        appearances: s.appearances ?? null, // 108. appearances ok
        matches_started: s.matchesStarted ?? null, // 82. matchesStarted ok
        minutes_played: s.minutesPlayed ?? null, // 35. minutesPlayed  ok
        totw_appearances: s.totwAppearances ?? null, // 103. totwAppearances ok

      // --- Attack ---
        goals: s.goals ?? null, // 4. goals ok
        assists: s.assists ?? null, // 7. assists ok
        goals_assists_sum: s.goalsAssistsSum ?? null, // 8. goalsAssistsSum ok
        scoring_frequency: s.scoringFrequency
          ? parseFloat(s.scoringFrequency)
          : null, // 97. scoringFrequency ok
        big_chances_created: s.bigChancesCreated ?? null, // 5. bigChancesCreated ok
        big_chances_missed: s.bigChancesMissed ?? null, // 6. bigChancesMissed ok

      // --- Passes ---
        total_passes: s.totalPasses ?? null, // 11. totalPasses ok
        accurate_passes: s.accuratePasses ?? null, // 9. accuratePasses ok
        inaccurate_passes: s.inaccuratePasses ?? null, // 10. inaccuratePasses ok
        accurate_passes_percentage: s.accuratePassesPercentage
          ? parseFloat(s.accuratePassesPercentage)
          : null, // 12. accuratePassesPercentage ok

        total_own_half_passes: s.totalOwnHalfPasses ?? null, // 101. totalOwnHalfPasses ok
        accurate_own_half_passes: s.accurateOwnHalfPasses ?? null, // 13. accurateOwnHalfPasses ok

        total_opposition_half_passes: s.totalOppositionHalfPasses ?? null, // 102. totalOppositionHalfPasses ok
        accurate_opposition_half_passes: s.accurateOppositionHalfPasses ?? null, // 14. accurateOppositionHalfPasses ok

        accurate_final_third_passes: s.accurateFinalThirdPasses ?? null, // 15. accurateFinalThirdPasses ok
        key_passes: s.keyPasses ?? null, // 16. keyPasses ok

        total_chipped_passes: s.totalChippedPasses ?? null, // 58. totalChippedPasses ok
        accurate_chipped_passes: s.accurateChippedPasses ?? null, // 59. accurateChippedPasses ok

        total_long_balls: s.totalLongBalls ?? null, // 93. totalLongBalls ok
        accurate_long_balls: s.accurateLongBalls ?? null, // 50. accurateLongBalls ok
        accurate_long_balls_percentage: s.accurateLongBallsPercentage
          ? parseFloat(s.accurateLongBallsPercentage)
          : null, // 51. accurateLongBallsPercentage ok

        total_cross: s.totalCross ?? null, // 87. totalCross ok
        accurate_crosses: s.accurateCrosses ?? null, // 24. accurateCrosses ok
        accurate_crosses_percentage: s.accurateCrossesPercentage
          ? parseFloat(s.accurateCrossesPercentage)
          : null, // 25. accurateCrossesPercentage ok
        crosses_not_claimed: s.crossesNotClaimed ?? null, // 81. crossesNotClaimed ok

        pass_to_assist: s.passToAssist ?? null, // 68. passToAssist ok
        total_attempt_assist: s.totalAttemptAssist ?? null, // 85. totalAttemptAssist ok

      // --- Dribbling & Possesion ---
        successful_dribbles: s.successfulDribbles ?? null, // 17. successfulDribbles ok
        successful_dribbles_percentage: s.successfulDribblesPercentage
          ? parseFloat(s.successfulDribblesPercentage)
          : null, // 18. successfulDribblesPercentage ok
        dribbled_past: s.dribbledPast ?? null, // 65. dribbledPast ok
        touches: s.touches ?? null, // 60. touches ok
        possession_lost: s.possessionLost ?? null, // 56. possessionLost ok
        possession_won_att_third: s.possessionWonAttThird ?? null, // 57. possessionWonAttThird ok
        dispossessed: s.dispossessed ?? null, // 55. dispossessed ok
        was_fouled: s.wasFouled ?? null, // 61. wasFouled ok
        fouls: s.fouls ?? null, // 62. fouls ok
        offsides: s.offsides ?? null, // 66. offsides ok

      // --- Shots ---
        total_shots: s.totalShots ?? null, // 26. totalShots ok
        shots_on_target: s.shotsOnTarget ?? null, // 27. shotsOnTarget ok
        shots_off_target: s.shotsOffTarget ?? null, // 28. shotsOffTarget ok
        blocked_shots: s.blockedShots ?? null, // 67. blockedShots ok

        shots_from_inside_the_box: s.shotsFromInsideTheBox ?? null, // 45. shotsFromInsideTheBox ok
        shots_from_outside_the_box: s.shotsFromOutsideTheBox ?? null, // 46. shotsFromOutsideTheBoxok ok
        goals_from_inside_the_box: s.goalsFromInsideTheBox ?? null, // 43. goalsFromInsideTheBox ok
        goals_from_outside_the_box: s.goalsFromOutsideTheBox ?? null, // 44. goalsFromOutsideTheBox ok

        headed_goals: s.headedGoals ?? null, // 47. headedGoals ok
        left_foot_goals: s.leftFootGoals ?? null, // 48. leftFootGoals ok
        right_foot_goals: s.rightFootGoals ?? null, // 49. rightFootGoals ok
        hit_woodwork: s.hitWoodwork ?? null, // 63. hitWoodwork ok

        shot_from_set_piece: s.shotFromSetPiece ?? null, // 41. shotFromSetPiece ok
        free_kick_goal: s.freeKickGoal ?? null, // 42. freeKickGoal ok
        goal_conversion_percentage: s.goalConversionPercentage
          ? parseFloat(s.goalConversionPercentage)
          : null, // 36. goalConversionPercentage ok
        set_piece_conversion: s.setPieceConversion
          ? parseFloat(s.setPieceConversion)
          : null, //setPieceConversion ok

      // --- Defence ---
        tackles: s.tackles ?? null, // 19. tackles ok
        tackles_won: s.tacklesWon ?? null, // 95. tacklesWon ok
        tackles_won_percentage: s.tacklesWonPercentage
          ? parseFloat(s.tacklesWonPercentage)
          : null, // 96. tacklesWonPercentage ok
        interceptions: s.interceptions ?? null, // 20. interceptions ok
        clearances: s.clearances ?? null, // 52. clearances ok
        ball_recovery: s.ballRecovery ?? null, // 105. ballRecovery ok
        error_lead_to_goal: s.errorLeadToGoal ?? null, // 53. errorLeadToGoal ok
        error_lead_to_shot: s.errorLeadToShot ?? null, // 54. errorLeadToShot ok
        own_goals: s.ownGoals ?? null, // 64. ownGoals ok

      // --- Duels ---
        total_contest: s.totalContest ?? null, // 86. totalContest ok
        total_duels_won: s.totalDuelsWon ?? null, // 33. totalDuelsWon ok
        total_duels_won_percentage: s.totalDuelsWonPercentage
          ? parseFloat(s.totalDuelsWonPercentage)
          : null, // 34. totalDuelsWonPercentage ok
        duel_lost: s.duelLost ?? null, // 88. duelLost ok

        ground_duels_won: s.groundDuelsWon ?? null, // 29. groundDuelsWon ok
        ground_duels_won_percentage: s.groundDuelsWonPercentage
          ? parseFloat(s.groundDuelsWonPercentage)
          : null, // 30. groundDuelsWonPercentage ok

        aerial_duels_won: s.aerialDuelsWon ?? null, // 31. aerialDuelsWon ok
        aerial_duels_won_percentage: s.aerialDuelsWonPercentage
          ? parseFloat(s.aerialDuelsWonPercentage)
          : null, // 32. aerialDuelsWonPercentage ok
        aerial_lost: s.aerialLost ?? null, // 89. aerialLost ok

      // --- Discipline ---
        yellow_cards: s.yellowCards ?? null, // 21. yellowCards ok
        yellow_red_cards: s.yellowRedCards ?? null, // 98. yellowRedCards ok
        red_cards: s.redCards ?? null, // 23. redCards ok
        direct_red_cards: s.directRedCards ?? null, // 22. directRedCards ok

      // --- Penalties ---
        penalties_taken: s.penaltiesTaken ?? null, // 37. penaltiesTaken ok
        penalty_goals: s.penaltyGoals ?? null, // 38. penaltyGoals ok
        penalty_won: s.penaltyWon ?? null, // 39. penaltyWon ok
        penalty_conceded: s.penaltyConceded ?? null, // 40. penaltyConceded ok
        penalty_conversion: s.penaltyConversion
          ? parseFloat(s.penaltyConversion)
          : null, // 83. penaltyConversion ok
        attempt_penalty_miss: s.attemptPenaltyMiss ?? null, // 90. attemptPenaltyMiss ok
        attempt_penalty_post: s.attemptPenaltyPost ?? null, // 91. attemptPenaltyPost ok
        attempt_penalty_target: s.attemptPenaltyTarget ?? null, // 92. attemptPenaltyTarget ok

      // --- Goalkeeping ---
        saves: s.saves ?? null, // 69. saves ok
        clean_sheet: s.cleanSheet ?? null, // 70. cleanSheet ok
        saves_caught: s.savesCaught ?? null, // 99. savesCaught ok
        saves_parried: s.savesParried ?? null, // 100. savesParried ok
        saved_shots_from_inside_the_box: s.savedShotsFromInsideTheBox ?? null, // 73. savedShotsFromInsideTheBox ok
        saved_shots_from_outside_the_box: s.savedShotsFromOutsideTheBox ?? null, // 74. savedShotsFromOutsideTheBox ok

        goals_conceded: s.goalsConceded ?? null, // 94. goalsConceded ok
        goals_conceded_inside_the_box: s.goalsConcededInsideTheBox ?? null, // 75. goalsConcededInsideTheBox ok
        goals_conceded_outside_the_box: s.goalsConcededOutsideTheBox ?? null, // 76. goalsConcededOutsideTheBox ok

        punches: s.punches ?? null, // 77. punches ok
        runs_out: s.runsOut ?? null, // 78. runsOut ok
        successful_runs_out: s.successfulRunsOut ?? null, // 79. successfulRunsOut ok
        high_claims: s.highClaims ?? null, // 80. highClaims ok
        goal_kicks: s.goalKicks ?? null, // 104. goalKicks ok
        penalty_faced: s.penaltyFaced ?? null, // 71. penaltyFaced ok
        penalty_save: s.penaltySave ?? null, // 72. penaltySave ok
      },
      ["player_id", "team_id", "tournament_id", "season_id"],
    );

    // Upsert into database
    const { error } = await supabase.from("player_stats").upsert(statsRow, {
      onConflict: "player_id, team_id, season_id, tournament_id",
    });

    if (error) {
      console.error(`❌ DB Error (${player.name}):`, error.message);
    } else {
      console.log(`✅ Saved: ${player.name}`);
    }
  } catch (err) {
    // Handle timeouts separately
    if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
      console.warn(`⏳ Timeout: ${player.name}`);
    } else {
      console.error(`❌ Error for ${player.name}:`, err.message);
    }
  }
}

// ==============================================================================
// 4️⃣ MAIN EXECUTION BLOCK
// ==============================================================================

/**
 * Self-invoking async function.
 *
 * Why?
 * - Keeps file executable directly via:
 *     node fetchAllPlayerStats.js
 * - Prevents global variable pollution
 */
(async () => {
  try {
    console.log("🚀 Starting API Stats Fetch...");

    // Build all valid API requests
    const rows = await getTargetData();

    // Sequential processing (safe for rate limits)
    // You could later upgrade this to a concurrency pool if needed.
    for (const row of rows) {
      await fetchAndSaveStats(row);
      await delay(THROTTLE_MS); // Throttle to avoid rate limits
    }

    console.log("\n🎉 ALL DONE!");
  } catch (e) {
    console.error("❌ Fatal Error:", e.message);
  }
})();
