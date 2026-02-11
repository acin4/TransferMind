import { client } from "./client.js";
import { saveJSON } from "./utils.js";
import { supabase } from "./supabaseClient.js";

const THROTTLE_MS = 600;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Βοηθητική για υπολογισμό ποσοστών (π.χ. 30/100 -> 30.00)
// Επιστρέφει null αν ο παρονομαστής είναι 0 ή null
const calcPerc = (num, total) => {
  if (!num || !total || total === 0) return null;
  return parseFloat(((num / total) * 100).toFixed(2));
};

// ==============================================================================
// 1. GENERIC PAGINATION FETCH
// ==============================================================================
async function fetchAllRows({ table, select, filters = [], pageSize = 1000 }) {
  const all = [];
  let from = 0;
  let page = 1;

  while (true) {
    console.log(
      `➡️ Fetching ${table} page ${page} (rows ${from}–${from + pageSize - 1})`
    );

    let q = supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);

    for (const f of filters) {
      const [col, op, val, negate] = f;
      if (negate) q = q.not(col, op, val);
      else q = q.filter(col, op, val);
    }

    const { data, error } = await q;
    if (error) throw error;

    console.log(`⬅️ ${table} page ${page} returned ${data?.length ?? 0} rows`);

    if (!data || data.length === 0) break;

    all.push(...data);

    if (data.length < pageSize) break;

    from += pageSize;
    page++;
  }

  console.log(`✅ Total ${table} rows fetched: ${all.length}`);
  return all;
}

// ==============================================================================
// 2. PREPARE DATA (From Standings)
// ==============================================================================
async function getTargetData() {
  console.log("📥 Loading Standings to identify Teams...");

  // Φέρνουμε τα Standings γιατί αυτά συνδέουν Team <-> Season <-> Tournament
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

  // Αφαιρούμε διπλότυπα (αν μια ομάδα έχει 2 εγγραφές στο ίδιο τουρνουά/σεζόν)
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

// ==============================================================================
// 3. API CALL + SAVE TO team_stats
// ==============================================================================
async function fetchAndSaveTeamStats(row) {
  const { team_id, tournament_id, season_id } = row;

  try {
    const res = await client.get("/teams/get-statistics", {
      params: {
        teamId: team_id,
        tournamentId: tournament_id,
        seasonId: season_id,
      },
      timeout: 10000,
    });

    console.log("DBG", `Team ${team_id}`, {
      seasonId: season_id,
      tournamentId: tournament_id,
      status: res.status,
      hasData: !!res.data,
      hasStats: !!res.data?.statistics,
    });

    // Συχνά στα Teams το JSON είναι χύμα ή μέσα στο .statistics
    // Ελέγχουμε και τα δύο
    let s = res.data?.statistics;
    if (!s && res.data && res.data.goalsScored !== undefined) {
        s = res.data;
    }

    const hasStats = !!(s && Object.keys(s).length > 0);

    // Save RAW JSON for debugging
    saveJSON(`data/raw/teams/debug_t${team_id}_s${season_id}.json`, res.data);

    // --- CASE 1: NO STATS (Save Identifiers Only) ---
    if (!hasStats) {
      console.log(`🔸 No stats for Team ${team_id} → saving identifiers only`);

      const skeletonRow = {
        team_id,
        tournament_id,
        season_id,
        matches: 0, // Βάζουμε 0 matches ένδειξη ότι είναι κενό
        has_stats: false, // <--- ΠΡΟΣΘΗΚΗ: Δηλώνουμε ότι ΔΕΝ έχει στατιστικά
      };

      const { error } = await supabase
        .from("team_stats")
        .upsert(skeletonRow, {
          onConflict: "team_id, season_id, tournament_id",
        });

      if (error) {
        console.error(`❌ DB Error (Team ${team_id}):`, error.message);
      } else {
        console.log(`✅ Saved (no stats): Team ${team_id}`);
      }
      return;
    }

    // --- CASE 2: FULL STATS MAPPING ---
    const statsRow = {
      //Δηλώνουμε ότι ΕΧΕΙ στατιστικά
      has_stats: true,
      // IDs
      api_id: team_id, 
      team_id: team_id,
      tournament_id: tournament_id,
      season_id: season_id,
      

      // Γενικά
      matches: s.matches ?? null,

      // Επίθεση
      goals_scored: s.goalsScored ?? null,
      goals_conceded: s.goalsConceded ?? null,
      own_goals: s.ownGoals ?? null,
      assists: s.assists ?? null,
      shots: s.shots ?? null,
      
      // Πέναλτι & Φάουλ
      penalty_scored: s.penaltyGoals ?? null,
      penalty_taken: s.penaltiesTaken ?? null,
      penalty_ratio: calcPerc(s.penaltyGoals, s.penaltiesTaken),
      
      freekick_goals: s.freeKickGoals ?? null,
      freekick_taken: s.freeKickShots ?? null,
      freekick_ratio: calcPerc(s.freeKickGoals, s.freeKickShots),

      // Περιοχές Γκολ/Σουτ
      goals_inside_box: s.goalsFromInsideTheBox ?? null,
      goals_outside_box: s.goalsFromOutsideTheBox ?? null,
      shots_inside_box: s.shotsFromInsideTheBox ?? null,
      shots_outside_box: s.shotsFromOutsideTheBox ?? null,
      
      // Ratios Περιοχών (Χρήση calcPerc)
      goals_inside_ratio: calcPerc(s.goalsFromInsideTheBox, s.goalsScored),
      goals_outside_ratio: calcPerc(s.goalsFromOutsideTheBox, s.goalsScored),
      shots_inside_ratio: calcPerc(s.shotsFromInsideTheBox, s.shots),
      shots_outside_ratio: calcPerc(s.shotsFromOutsideTheBox, s.shots),

      // Κεφαλιές
      goals_header: s.headedGoals ?? null,
      goals_header_ratio: calcPerc(s.headedGoals, s.goalsScored),
      
      // Σουτ Στόχος
      shots_ontarget: s.shotsOnTarget ?? null,
      shots_offtarget: s.shotsOffTarget ?? null,
      shots_blocked: s.blockedScoringAttempt ?? null,
      woodwork: s.hitWoodwork ?? null,
      shots_ontarget_ratio: calcPerc(s.shotsOnTarget, s.shots),
      goalspershot_ratio: (s.shots && s.shots > 0) 
        ? parseFloat((s.goalsScored / s.shots).toFixed(2)) 
        : null,

      // Ευκαιρίες
      big_chances: s.bigChances ?? null,
      big_chances_created: s.bigChancesCreated ?? null,
      big_chances_missed: s.bigChancesMissed ?? null,
      // Conversion ratio: (Big Chances - Missed) / Big Chances
      big_chances_goal_ratio: calcPerc((s.bigChances - s.bigChancesMissed), s.bigChances),

      // Ντρίμπλες
      dribbles_success: s.successfulDribbles ?? null,
      dribbles_attempts: s.dribbleAttempts ?? null,
      dribbles_success_ratio: calcPerc(s.successfulDribbles, s.dribbleAttempts),

      // Κόρνερ & Αντεπιθέσεις
      corners: s.corners ?? null,
      fastbreak_total: s.fastBreaks ?? null,
      fastbreak_goals: s.fastBreakGoals ?? null,
      fastbreak_shots: s.fastBreakShots ?? null,
      fastbreak_ratio: calcPerc(s.fastBreakGoals, s.fastBreaks),

      // Κατοχή
      avg_ball_possession: s.averageBallPossession ? parseFloat(s.averageBallPossession) : null,
      possession_lost: s.possessionLost ?? null,

      // Πάσες (Γενικά)
      pass_total: s.totalPasses ?? null,
      pass_acc: s.accuratePasses ?? null,
      pass_acc_percentage: s.accuratePassesPercentage ? parseFloat(s.accuratePassesPercentage) : null,

      // Πάσες (Περιοχές)
      pass_ownhalf_total: s.totalOwnHalfPasses ?? null,
      pass_ownhalf_acc: s.accurateOwnHalfPasses ?? null,
      pass_ownhalf_perc: s.accurateOwnHalfPassesPercentage ? parseFloat(s.accurateOwnHalfPassesPercentage) : null,

      pass_opphalf_total: s.totalOppositionHalfPasses ?? null,
      pass_opphalf_acc: s.accurateOppositionHalfPasses ?? null,
      pass_opphalf_perc: s.accurateOppositionHalfPassesPercentage ? parseFloat(s.accurateOppositionHalfPassesPercentage) : null,

      // Μακρινές & Σέντρες
      longballs_total: s.totalLongBalls ?? null,
      longballs_acc: s.accurateLongBalls ?? null,
      longballs_perc: s.accurateLongBallsPercentage ? parseFloat(s.accurateLongBallsPercentage) : null,

      cross_total: s.totalCrosses ?? null,
      cross_acc: s.accurateCrosses ?? null,
      cross_perc: s.accurateCrossesPercentage ? parseFloat(s.accurateCrossesPercentage) : null,

      // Άμυνα
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

      // Μονομαχίες
      duels_total: s.totalDuels ?? null,
      duels_won: s.duelsWon ?? null,
      duels_perc: s.duelsWonPercentage ? parseFloat(s.duelsWonPercentage) : null,

      ground_duels_total: s.totalGroundDuels ?? null,
      ground_duels_won: s.groundGroundDuels ?? s.groundDuelsWon ?? null,
      ground_duels_perc: s.groundDuelsWonPercentage ? parseFloat(s.groundDuelsWonPercentage) : null,

      aerial_duels_total: s.totalAerialDuels ?? null,
      aerial_duels_won: s.aerialDuelsWon ?? null,
      aerial_duels_perc: s.aerialDuelsWonPercentage ? parseFloat(s.aerialDuelsWonPercentage) : null,

      // Πειθαρχικά
      fouls: s.fouls ?? null,
      offsides: s.offsides ?? null,
      yellowcards: s.yellowCards ?? null,
      yellowcards_second: s.yellowRedCards ?? null,
      redcards: s.redCards ?? null,

      // --- AGAINST STATS (Υπολογισμός Ratios από τα απόλυτα νούμερα) ---
      
      shots_against: s.shotsAgainst ?? null,
      shots_blocked_against: s.shotsBlockedAgainst ?? s.blockedScoringAttemptAgainst ?? null,
      shots_inside_against: s.shotsFromInsideTheBoxAgainst ?? null,
      shots_outside_against: s.shotsFromOutsideTheBoxAgainst ?? null,
      shots_ontarget_against: s.shotsOnTargetAgainst ?? null,
      shots_offtarget_against: s.shotsOffTargetAgainst ?? null,
      woodwork_against: s.hitWoodworkAgainst ?? null,

      // Ratios Against (Υπολογισμοί)
      goalspershot_against_ratio: (s.shotsAgainst && s.shotsAgainst > 0) 
        ? parseFloat((s.goalsConceded / s.shotsAgainst).toFixed(2)) 
        : null,
      shots_ontarget_against_ratio: calcPerc(s.shotsOnTargetAgainst, s.shotsAgainst),

      // Ευκαιρίες Against
      big_chances_against: s.bigChancesAgainst ?? null,
      big_chances_against_created: s.bigChancesCreatedAgainst ?? null,
      big_chances_against_missed: s.bigChancesMissedAgainst ?? null,
      big_chances_goal_against_ratio: null, // Δύσκολο να υπολογιστεί χωρίς conversion stat

      errors_to_goals_against: s.errorsLeadingToGoalAgainst ?? null,
      errors_to_shot_against: s.errorsLeadingToShotAgainst ?? null,

      // Πάσες Against (Ratios)
      pass_against_total: s.totalPassesAgainst ?? null,
      pass_against_acc: s.accuratePassesAgainst ?? null,
      pass_against_ratio: calcPerc(s.accuratePassesAgainst, s.totalPassesAgainst),

      finalthirdpass_against_total: s.totalFinalThirdPassesAgainst ?? null,
      finalthirdpass_against_acc: s.accurateFinalThirdPassesAgainst ?? null,
      finalthirdpass_against_ratio: calcPerc(s.accurateFinalThirdPassesAgainst, s.totalFinalThirdPassesAgainst),

      opphalfpass_against_total: s.oppositionHalfPassesTotalAgainst ?? null,
      opphalfpass_against_acc: s.accurateOppositionHalfPassesAgainst ?? null,
      opphalfpass_against_ratio: calcPerc(s.accurateOppositionHalfPassesAgainst, s.oppositionHalfPassesTotalAgainst),

      ownhalfpass_against_total: s.ownHalfPassesTotalAgainst ?? null,
      ownhalfpass_against_acc: s.accurateOwnHalfPassesAgainst ?? null,
      ownhalfpass_against_ratio: calcPerc(s.accurateOwnHalfPassesAgainst, s.ownHalfPassesTotalAgainst),

      keypass_against: s.keyPassesAgainst ?? null,

      longballs_against_total: s.longBallsTotalAgainst ?? null,
      longballs_against_acc: s.longBallsSuccessfulAgainst ?? null,
      longballs_against_ratio: calcPerc(s.longBallsSuccessfulAgainst, s.longBallsTotalAgainst),

      cross_against_total: s.crossesTotalAgainst ?? null,
      cross_against_acc: s.crossesSuccessfulAgainst ?? null,
      cross_against_ratio: calcPerc(s.crossesSuccessfulAgainst, s.crossesTotalAgainst),

      dribbles_against_total: s.dribbleAttemptsTotalAgainst ?? null,
      dribbles_against_acc: s.dribbleAttemptsWonAgainst ?? null,
      dribbles_against_ratio: calcPerc(s.dribbleAttemptsWonAgainst, s.dribbleAttemptsTotalAgainst),

      tackles_against: s.tacklesAgainst ?? null,
      clearences_against: s.clearancesAgainst ?? null,
      interceptions_against: s.interceptionsAgainst ?? null,
      corners_against: s.cornersAgainst ?? null,
      offsides_against: s.offsidesAgainst ?? null,
      yellowcards_against: s.yellowCardsAgainst ?? null,
      redcards_against: s.redCardsAgainst ?? null,
    };

    const { error } = await supabase.from("team_stats").upsert(statsRow, {
      onConflict: "team_id, season_id, tournament_id",
    });

    if (error) {
      console.error(`❌ DB Error (Team ${team_id}):`, error.message);
    } else {
      console.log(`✅ Saved: Team ${team_id}`);
    }
  } catch (err) {
    if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
      console.warn(`⏳ Timeout: Team ${team_id}`);
    } else {
      console.error(`❌ Error for Team ${team_id}:`, err.message);
    }
  }
}

// ==============================================================================
// 4. MAIN
// ==============================================================================
(async () => {
  try {
    console.log("🚀 Starting Team Stats Fetch...");

    const rows = await getTargetData();

    for (const row of rows) {
      await fetchAndSaveTeamStats(row);
      await delay(THROTTLE_MS);
    }

    console.log("\n🎉 ALL DONE!");
  } catch (e) {
    console.error("❌ Fatal Error:", e.message);
  }
})();