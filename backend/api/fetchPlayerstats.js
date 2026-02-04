import { client } from "./client.js";
import { saveJSON } from "./utils.js";
import { supabase } from "./supabaseClient.js";

const THROTTLE_MS = 600;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ==============================================================================
// 1. Load players + standings and build correct combinations
// ==============================================================================
async function getTargetData() {
  console.log("📥 Loading players + standings from DB...");

  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("api_id, team_id, name")
    .not("api_id", "is", null)
    .not("team_id", "is", null);

  if (pErr) throw pErr;

  const { data: standings, error: sErr } = await supabase
    .from("standings")
    .select("team_id, tournament_id, season_id")
    .not("team_id", "is", null)
    .not("tournament_id", "is", null)
    .not("season_id", "is", null);

  if (sErr) throw sErr;

  const rows = [];

  for (const player of players) {
    const standing = standings.find(s => s.team_id === player.team_id);
    if (!standing) continue;

    rows.push({
      player,
      team_id: player.team_id,
      tournament_id: standing.tournament_id,
      season_id: standing.season_id
    });
  }

  console.log(`✅ Prepared ${rows.length} valid requests`);
  return rows;
}

// ==============================================================================
// 2. API CALL + SAVE TO player_stats
// ==============================================================================
async function fetchAndSaveStats(row) {
  const { player, team_id, tournament_id, season_id } = row;

  try {
    const res = await client.get("/players/get-statistics", {
      params: {
        playerId: player.api_id,
        tournamentId: tournament_id,
        seasonId: season_id
        
      },
      timeout: 10000
    });

    console.log("DBG", player.name, {
  playerId: player.api_id,
  seasonId: season_id,
  tournamentId: tournament_id,
  status: res.status,
  hasData: !!res.data,
  hasStats: !!res.data?.statistics,
  statsKeys: res.data?.statistics ? Object.keys(res.data.statistics) : null
});

    /*if (res.status === 204) {
      console.log(`🔸 No stats: ${player.name}`);
      return;
    }*/

    const s = res.data?.statistics;
    if (!s || Object.keys(s).length === 0) {
      console.log(`🔸 Empty stats: ${player.name}`);
      return;
    }

    // (προαιρετικό) save raw JSON αν θες debug
    saveJSON(`debug_${player.api_id}.json`, res.data);

    const statsRow = {
      player_id: player.api_id,
      team_id: team_id,
      tournament_id: tournament_id,
      season_id: season_id,

      // --- ΓΕΝΙΚΑ / ΣΥΜΜΕΤΟΧΕΣ ---
      rating: (s.rating && !isNaN(parseFloat(s.rating))) ? parseFloat(s.rating) : null, // 1. rating ok
      total_rating: s.totalRating ? parseFloat(s.totalRating) : null, // 2. totalRating ok
      count_rating: s.countRating ?? 0,          // 3. countRating ok
      appearances: s.appearances ?? 0,           // 108. appearances ok
      matches_started: s.matchesStarted ?? 0,    // 82. matchesStarted ok
      minutes_played: s.minutesPlayed ?? 0,      // 35. minutesPlayed  ok
      totw_appearances: s.totwAppearances ?? 0,  // 103. totwAppearances ok
      
      // --- ΕΠΙΘΕΣΗ ---
      goals: s.goals ?? 0,                       // 4. goals ok
      assists: s.assists ?? 0,                   // 7. assists ok
      goals_assists_sum: s.goalsAssistsSum ?? 0, // 8. goalsAssistsSum ok
      scoring_frequency: s.scoringFrequency ? parseFloat(s.scoringFrequency) : null, // 97. scoringFrequency ok
      big_chances_created: s.bigChancesCreated ?? 0, // 5. bigChancesCreated ok
      big_chances_missed: s.bigChancesMissed ?? 0,   // 6. bigChancesMissed ok
      
      // --- ΠΑΣΕΣ ---
      total_passes: s.totalPasses ?? 0,          // 11. totalPasses ok
      accurate_passes: s.accuratePasses ?? 0,    // 9. accuratePasses ok
      inaccurate_passes: s.inaccuratePasses ?? 0,// 10. inaccuratePasses ok
      accurate_passes_percentage: s.accuratePassesPercentage ? parseFloat(s.accuratePassesPercentage) : null, // 12. accuratePassesPercentage ok
      
      total_own_half_passes: s.totalOwnHalfPasses ?? 0, // 101. totalOwnHalfPasses ok
      accurate_own_half_passes: s.accurateOwnHalfPasses ?? 0, // 13. accurateOwnHalfPasses ok
      
      total_opposition_half_passes: s.totalOppositionHalfPasses ?? 0, // 102. totalOppositionHalfPasses ok
      accurate_opposition_half_passes: s.accurateOppositionHalfPasses ?? 0, // 14. accurateOppositionHalfPasses ok
      
      accurate_final_third_passes: s.accurateFinalThirdPasses ?? 0, // 15. accurateFinalThirdPasses ok
      key_passes: s.keyPasses ?? 0,              // 16. keyPasses ok
      
      total_chipped_passes: s.totalChippedPasses ?? 0, // 58. totalChippedPasses ok
      accurate_chipped_passes: s.accurateChippedPasses ?? 0, // 59. accurateChippedPasses ok
      
      total_long_balls: s.totalLongBalls ?? 0,   // 93. totalLongBalls ok
      accurate_long_balls: s.accurateLongBalls ?? 0, // 50. accurateLongBalls ok
      accurate_long_balls_percentage: s.accurateLongBallsPercentage ? parseFloat(s.accurateLongBallsPercentage) : null, // 51. accurateLongBallsPercentage ok
      
      total_cross: s.totalCross ?? 0,            // 87. totalCross ok
      accurate_crosses: s.accurateCrosses ?? 0,  // 24. accurateCrosses ok
      accurate_crosses_percentage: s.accurateCrossesPercentage ? parseFloat(s.accurateCrossesPercentage) : null, // 25. accurateCrossesPercentage ok
      crosses_not_claimed: s.crossesNotClaimed ?? 0, // 81. crossesNotClaimed ok
      
      pass_to_assist: s.passToAssist ?? 0,       // 68. passToAssist ok
      total_attempt_assist: s.totalAttemptAssist ?? 0, // 85. totalAttemptAssist ok

      // --- ΝΤΡΙΜΠΛΕΣ & ΚΑΤΟΧΗ ---
      successful_dribbles: s.successfulDribbles ?? 0, // 17. successfulDribbles ok
      successful_dribbles_percentage: s.successfulDribblesPercentage ? parseFloat(s.successfulDribblesPercentage) : null, // 18. successfulDribblesPercentage ok
      dribbled_past: s.dribbledPast ?? 0,        // 65. dribbledPast ok
      touches: s.touches ?? 0,                   // 60. touches ok
      possession_lost: s.possessionLost ?? 0,    // 56. possessionLost ok
      possession_won_att_third: s.possessionWonAttThird ?? 0, // 57. possessionWonAttThird ok
      dispossessed: s.dispossessed ?? 0,         // 55. dispossessed ok
      was_fouled: s.wasFouled ?? 0,              // 61. wasFouled ok
      fouls: s.fouls ?? 0,                       // 62. fouls ok
      offsides: s.offsides ?? 0,                 // 66. offsides ok

      // --- ΣΟΥΤ ---
      total_shots: s.totalShots ?? 0,            // 26. totalShots ok
      shots_on_target: s.shotsOnTarget ?? 0,     // 27. shotsOnTarget ok
      shots_off_target: s.shotsOffTarget ?? 0,   // 28. shotsOffTarget ok
      blocked_shots: s.blockedShots ?? 0,        // 67. blockedShots ok
      
      shots_from_inside_the_box: s.shotsFromInsideTheBox ?? 0, // 45. shotsFromInsideTheBox ok
      shots_from_outside_the_box: s.shotsFromOutsideTheBox ?? 0, // 46. shotsFromOutsideTheBoxok ok
      goals_from_inside_the_box: s.goalsFromInsideTheBox ?? 0, // 43. goalsFromInsideTheBox ok
      goals_from_outside_the_box: s.goalsFromOutsideTheBox ?? 0, // 44. goalsFromOutsideTheBox ok
      
      headed_goals: s.headedGoals ?? 0,          // 47. headedGoals ok
      left_foot_goals: s.leftFootGoals ?? 0,     // 48. leftFootGoals ok
      right_foot_goals: s.rightFootGoals ?? 0,   // 49. rightFootGoals ok
      hit_woodwork: s.hitWoodwork ?? 0,          // 63. hitWoodwork ok
      
      shot_from_set_piece: s.shotFromSetPiece ?? 0, // 41. shotFromSetPiece ok
      free_kick_goal: s.freeKickGoal ?? 0,       // 42. freeKickGoal ok
      goal_conversion_percentage: s.goalConversionPercentage ? parseFloat(s.goalConversionPercentage) : null, // 36. goalConversionPercentage ok

      // --- ΑΜΥΝΑ ---
      tackles: s.tackles ?? 0,                   // 19. tackles ok
      tackles_won: s.tacklesWon ?? 0,            // 95. tacklesWon ok
      tackles_won_percentage: s.tacklesWonPercentage ? parseFloat(s.tacklesWonPercentage) : null, // 96. tacklesWonPercentage ok
      interceptions: s.interceptions ?? 0,       // 20. interceptions ok
      clearances: s.clearances ?? 0,             // 52. clearances ok
      ball_recovery: s.ballRecovery ?? 0,        // 105. ballRecovery ok
      error_lead_to_goal: s.errorLeadToGoal ?? 0,// 53. errorLeadToGoal ok
      error_lead_to_shot: s.errorLeadToShot ?? 0,// 54. errorLeadToShot ok
      own_goals: s.ownGoals ?? 0,                // 64. ownGoals ok

      // --- ΜΟΝΟΜΑΧΙΕΣ (DUELS) ---
      total_contest: s.totalContest ?? 0,        // 86. totalContest ok
      total_duels_won: s.totalDuelsWon ?? 0,     // 33. totalDuelsWon ok
      total_duels_won_percentage: s.totalDuelsWonPercentage ? parseFloat(s.totalDuelsWonPercentage) : null, // 34. totalDuelsWonPercentage ok
      duel_lost: s.duelLost ?? 0,                // 88. duelLost ok
      
      ground_duels_won: s.groundDuelsWon ?? 0,   // 29. groundDuelsWon ok
      ground_duels_won_percentage: s.groundDuelsWonPercentage ? parseFloat(s.groundDuelsWonPercentage) : null, // 30. groundDuelsWonPercentage ok
      
      aerial_duels_won: s.aerialDuelsWon ?? 0,   // 31. aerialDuelsWon ok
      aerial_duels_won_percentage: s.aerialDuelsWonPercentage ? parseFloat(s.aerialDuelsWonPercentage) : null, // 32. aerialDuelsWonPercentage ok
      aerial_lost: s.aerialLost ?? 0,            // 89. aerialLost ok
      set_piece_conversion: s.setPieceConversion ? parseFloat(s.setPieceConversion) : null, //setPieceConversion ok

      // --- ΠΕΙΘΑΡΧΙΚΑ ---
      yellow_cards: s.yellowCards ?? 0,          // 21. yellowCards ok
      yellow_red_cards: s.yellowRedCards ?? 0,   // 98. yellowRedCards ok
      red_cards: s.redCards ?? 0,                // 23. redCards ok
      direct_red_cards: s.directRedCards ?? 0,   // 22. directRedCards ok

      // --- ΠΕΝΑΛΤΙ ---
      penalties_taken: s.penaltiesTaken ?? 0,    // 37. penaltiesTaken ok
      penalty_goals: s.penaltyGoals ?? 0,        // 38. penaltyGoals ok
      penalty_won: s.penaltyWon ?? 0,            // 39. penaltyWon ok
      penalty_conceded: s.penaltyConceded ?? 0,  // 40. penaltyConceded ok
      penalty_conversion: s.penaltyConversion ? parseFloat(s.penaltyConversion) : null, // 83. penaltyConversion ok
      attempt_penalty_miss: s.attemptPenaltyMiss ?? 0, // 90. attemptPenaltyMiss ok
      attempt_penalty_post: s.attemptPenaltyPost ?? 0, // 91. attemptPenaltyPost ok
      attempt_penalty_target: s.attemptPenaltyTarget ?? 0, // 92. attemptPenaltyTarget ok

      // --- ΤΕΡΜΑΤΟΦΥΛΑΚΑΣ ---
      saves: s.saves ?? 0,                       // 69. saves ok
      clean_sheet: s.cleanSheet ?? 0,            // 70. cleanSheet ok
      saves_caught: s.savesCaught ?? 0,          // 99. savesCaught ok
      saves_parried: s.savesParried ?? 0,        // 100. savesParried ok
      saved_shots_from_inside_the_box: s.savedShotsFromInsideTheBox ?? 0, // 73. savedShotsFromInsideTheBox ok
      saved_shots_from_outside_the_box: s.savedShotsFromOutsideTheBox ?? 0, // 74. savedShotsFromOutsideTheBox ok
       
      goals_conceded: s.goalsConceded ?? 0,      // 94. goalsConceded ok
      goals_conceded_inside_the_box: s.goalsConcededInsideTheBox ?? 0, // 75. goalsConcededInsideTheBox ok
      goals_conceded_outside_the_box: s.goalsConcededOutsideTheBox ?? 0, // 76. goalsConcededOutsideTheBox ok
      
      punches: s.punches ?? 0,                   // 77. punches ok
      runs_out: s.runsOut ?? 0,                  // 78. runsOut ok
      successful_runs_out: s.successfulRunsOut ?? 0, // 79. successfulRunsOut ok
      high_claims: s.highClaims ?? 0,            // 80. highClaims ok
      goal_kicks: s.goalKicks ?? 0,              // 104. goalKicks ok
      penalty_faced: s.penaltyFaced ?? 0,        // 71. penaltyFaced ok
      penalty_save: s.penaltySave ?? 0,          // 72. penaltySave ok

      updated_at: new Date()
    };

     const { error } = await supabase
      .from("player_stats")
      .upsert(statsRow, {
        onConflict: "player_id, season_id, tournament_id"
      });

    if (error) {
      console.error(`❌ DB Error (${player.name}):`, error.message);
    } else {
      console.log(`✅ Saved: ${player.name}`);
    }

  } catch (err) {
    if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
      console.warn(`⏳ Timeout: ${player.name}`);
    } else {
      console.error(`❌ Error for ${player.name}:`, err.message);
    }
  }
}

// ==============================================================================
// 3. MAIN
// ==============================================================================
(async () => {
  try {
    console.log("🚀 Starting API Stats Fetch...");

    const rows = await getTargetData();

    for (const row of rows) {
      await fetchAndSaveStats(row);
      await delay(THROTTLE_MS);
    }

    console.log("\n🎉 ALL DONE!");

  } catch (e) {
    console.error("❌ Fatal Error:", e.message);
  }
})();

