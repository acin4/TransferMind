import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabase } from "../lib/supabaseClient.js";
import { getSeasonEndYear, getSeasonLabel } from "../lib/seasonLabels.js";

const TEAM_SELECT = "id, api_id, name, tournament_id, city, stadium, logo_url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_TEAM_STATS_DIR = path.resolve(__dirname, "../../data/raw/teamStats");
const PARTICIPATION_SELECT = [
  "team_db_id",
  "team_id",
  "tournament_id",
  "tournament_db_id",
  "tournament_name",
  "tournament_country",
  "season_id",
  "season_db_id",
  "season_name",
  "season_year",
  "is_current",
].join(",");

function getTeamsBaseQuery() {
  return supabase.from("teams").select(TEAM_SELECT);
}

function buildParticipationKey(row) {
  const teamKey = row.team_db_id ?? row.team_id;
  const tournamentKey = row.tournament_db_id ?? row.tournament_id;
  const seasonKey = row.season_db_id ?? row.season_id;

  return `${teamKey}::${tournamentKey}::${seasonKey}`;
}

function normalizeCountry(value) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function inferCountryFromTournamentName(value) {
  const tournamentName = String(value ?? "").trim().toLocaleLowerCase();

  if (!tournamentName) {
    return null;
  }

  if (
    tournamentName.includes("bundesliga") ||
    tournamentName.includes("dfb-pokal")
  ) {
    return "Germany";
  }

  if (
    tournamentName.includes("serie a") ||
    tournamentName.includes("coppa italia")
  ) {
    return "Italy";
  }

  return null;
}

const GERMAN_TEAM_MARKERS = [
  "1. fc heidenheim",
  "1. fc koln",
  "1. fc union berlin",
  "1. fsv mainz 05",
  "bayer 04 leverkusen",
  "borussia dortmund",
  "borussia m'gladbach",
  "darmstadt 98",
  "eintracht frankfurt",
  "fc augsburg",
  "fc bayern munchen",
  "fc st. pauli",
  "hamburger sv",
  "holstein kiel",
  "rb leipzig",
  "sc freiburg",
  "sv werder bremen",
  "tsg hoffenheim",
  "vfb stuttgart",
  "vfl bochum",
  "vfl wolfsburg",
];

const ITALIAN_TEAM_MARKERS = [
  "atalanta",
  "bologna",
  "cagliari",
  "como",
  "cremonese",
  "empoli",
  "fiorentina",
  "frosinone",
  "genoa",
  "hellas verona",
  "inter",
  "juventus",
  "lazio",
  "lecce",
  "milan",
  "monza",
  "napoli",
  "parma",
  "pisa",
  "roma",
  "salernitana",
  "sassuolo",
  "torino",
  "udinese",
  "venezia",
];

const GERMAN_LOCATION_MARKERS = [
  "heidenheim",
  "cologne",
  "koln",
  "berlin",
  "mainz",
  "leverkusen",
  "dortmund",
  "monchengladbach",
  "darmstadt",
  "frankfurt",
  "augsburg",
  "munich",
  "hamburg",
  "kiel",
  "leipzig",
  "freiburg",
  "bremen",
  "sinsheim",
  "stuttgart",
  "bochum",
  "wolfsburg",
];

const ITALIAN_LOCATION_MARKERS = [
  "bergamo",
  "bologna",
  "cagliari",
  "como",
  "cremona",
  "empoli",
  "florence",
  "firenze",
  "frosinone",
  "genoa",
  "genova",
  "verona",
  "milan",
  "milano",
  "turin",
  "torino",
  "rome",
  "roma",
  "lecce",
  "monza",
  "naples",
  "napoli",
  "parma",
  "pisa",
  "salerno",
  "reggio emilia",
  "udine",
  "venice",
  "venezia",
];

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function includesAny(text, markers) {
  return markers.some((marker) => text.includes(marker));
}

function inferCountryFromTeamIdentity(team) {
  const identityText = normalizeSearchText(
    [team?.name, team?.city, team?.stadium].filter(Boolean).join(" "),
  );

  if (includesAny(identityText, GERMAN_TEAM_MARKERS)) {
    return "Germany";
  }

  if (includesAny(identityText, ITALIAN_TEAM_MARKERS)) {
    return "Italy";
  }

  if (includesAny(identityText, GERMAN_LOCATION_MARKERS)) {
    return "Germany";
  }

  if (includesAny(identityText, ITALIAN_LOCATION_MARKERS)) {
    return "Italy";
  }

  return null;
}

function compareParticipationRows(a, b, preferredTournamentApiId = null) {
  const currentDelta = Number(Boolean(b.is_current)) - Number(Boolean(a.is_current));

  if (currentDelta !== 0) {
    return currentDelta;
  }

  const endYearDelta = getSeasonEndYear(b) - getSeasonEndYear(a);

  if (endYearDelta !== 0) {
    return endYearDelta;
  }

  const seasonIdDelta = (b.season_db_id ?? -1) - (a.season_db_id ?? -1);

  if (seasonIdDelta !== 0) {
    return seasonIdDelta;
  }

  if (preferredTournamentApiId != null) {
    const preferredTournamentDelta =
      Number((b.tournament_id ?? null) === preferredTournamentApiId) -
      Number((a.tournament_id ?? null) === preferredTournamentApiId);

    if (preferredTournamentDelta !== 0) {
      return preferredTournamentDelta;
    }
  }

  return String(a.tournament_name ?? "").localeCompare(
    String(b.tournament_name ?? ""),
  );
}

function toBadgeLabel(row) {
  const seasonLabel = getSeasonLabel(row);
  const tournamentName = row.tournament_name?.trim() || null;

  if (!tournamentName || !seasonLabel) {
    return null;
  }

  return `${tournamentName} ${seasonLabel}`.toLocaleUpperCase();
}

function buildParticipationSummary(rows) {
  const uniqueRows = new Map();

  for (const row of rows ?? []) {
    if (!row?.team_db_id) {
      continue;
    }

    const key = buildParticipationKey(row);

    if (!uniqueRows.has(key)) {
      uniqueRows.set(key, row);
    }
  }

  const summaryByTeamId = new Map();

  for (const row of uniqueRows.values()) {
    const teamId = row.team_db_id;
    const existing = summaryByTeamId.get(teamId);

    if (!existing || compareParticipationRows(row, existing) < 0) {
      summaryByTeamId.set(teamId, row);
    }
  }

  return summaryByTeamId;
}

function dedupeParticipationRows(rows) {
  const uniqueRows = new Map();

  for (const row of rows ?? []) {
    if (!row?.team_db_id) {
      continue;
    }

    const key = buildParticipationKey(row);

    if (!uniqueRows.has(key)) {
      uniqueRows.set(key, row);
    }
  }

  return [...uniqueRows.values()];
}

function getPreferredParticipationRow(rows, preferredTournamentApiId = null) {
  let preferredRow = null;

  for (const row of dedupeParticipationRows(rows)) {
    if (
      !preferredRow ||
      compareParticipationRows(row, preferredRow, preferredTournamentApiId) < 0
    ) {
      preferredRow = row;
    }
  }

  return preferredRow;
}

async function getTournamentByApiId(apiId) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, api_id, name")
    .eq("api_id", apiId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getTournamentById(id) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, api_id, name, country")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function resolveSeasonForTournament(seasonId, tournamentApiId) {
  const { data, error } = await supabase
    .from("seasons")
    .select("id, api_id, name, year, tournament_id, is_current")
    .eq("id", seasonId)
    .eq("tournament_id", tournamentApiId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function listParticipationRowsByTeamId(teamId) {
  const { data, error } = await supabase
    .from("standings_with_team_info")
    .select(PARTICIPATION_SELECT)
    .eq("team_db_id", teamId)
    .not("tournament_db_id", "is", null);

  if (error) {
    throw error;
  }

  return data ?? [];
}

function buildTeamComparisonSeasons(rows) {
  const seasonsByContext = new Map();

  for (const row of dedupeParticipationRows(rows)) {
    if (!row.tournament_db_id || !row.season_db_id) {
      continue;
    }

    const nextSeason = {
      key: buildParticipationKey(row),
      season_id: row.season_db_id,
      season_api_id: row.season_id ?? null,
      season_name: getSeasonLabel(row),
      tournament_id: row.tournament_db_id ?? null,
      tournament_api_id: row.tournament_id ?? null,
      tournament_name: row.tournament_name?.trim() || null,
      is_current: Boolean(row.is_current),
    };
    const existingSeason = seasonsByContext.get(nextSeason.key);

    if (
      !existingSeason ||
      (nextSeason.is_current && !existingSeason.is_current) ||
      (!existingSeason.season_name && nextSeason.season_name) ||
      (!existingSeason.tournament_name && nextSeason.tournament_name)
    ) {
      seasonsByContext.set(nextSeason.key, nextSeason);
    }
  }

  return [...seasonsByContext.values()].sort((a, b) => {
    const tournamentDelta = String(a.tournament_name ?? "").localeCompare(
      String(b.tournament_name ?? ""),
    );

    if (tournamentDelta !== 0) {
      return tournamentDelta;
    }

    const aEndYear = getSeasonEndYear(a);
    const bEndYear = getSeasonEndYear(b);

    if (aEndYear !== bEndYear) {
      return bEndYear - aEndYear;
    }

    return b.season_id - a.season_id;
  });
}

function buildStatsKey(teamApiId, tournamentApiId, seasonApiId) {
  return `${teamApiId}::${tournamentApiId}::${seasonApiId}`;
}

function truncateStatNumber(value, decimals = 2) {
  if (value == null || !Number.isFinite(Number(value))) {
    return null;
  }

  const factor = 10 ** decimals;
  return Math.trunc(Number(value) * factor) / factor;
}

function calcPerc(part, total) {
  if (part == null || total == null || Number(total) === 0) {
    return null;
  }

  return truncateStatNumber((Number(part) / Number(total)) * 100);
}

function toFloat(value) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toLocalTeamStatsRow(rawPayload, ids) {
  const s = rawPayload?.statistics ?? rawPayload;

  if (!s || typeof s !== "object") {
    return null;
  }

  return {
    has_stats: true,
    team_id: ids.teamApiId,
    tournament_id: ids.tournamentApiId,
    season_id: ids.seasonApiId,
    matches: s.matches ?? null,
    goals_scored: s.goalsScored ?? null,
    goals_conceded: s.goalsConceded ?? null,
    own_goals: s.ownGoals ?? null,
    assists: s.assists ?? null,
    shots: s.shots ?? null,
    penalty_scored: s.penaltyGoals ?? null,
    penalty_taken: s.penaltiesTaken ?? null,
    penalty_ratio: calcPerc(s.penaltyGoals, s.penaltiesTaken),
    freekick_goals: s.freeKickGoals ?? null,
    freekick_taken: s.freeKickShots ?? null,
    freekick_ratio: calcPerc(s.freeKickGoals, s.freeKickShots),
    corners: s.corners ?? null,
    goals_inside_box: s.goalsFromInsideTheBox ?? null,
    goals_outside_box: s.goalsFromOutsideTheBox ?? null,
    shots_inside_box: s.shotsFromInsideTheBox ?? null,
    shots_outside_box: s.shotsFromOutsideTheBox ?? null,
    goals_inside_ratio: calcPerc(s.goalsFromInsideTheBox, s.goalsScored),
    goals_outside_ratio: calcPerc(s.goalsFromOutsideTheBox, s.goalsScored),
    shots_inside_ratio: calcPerc(s.shotsFromInsideTheBox, s.shots),
    shots_outside_ratio: calcPerc(s.shotsFromOutsideTheBox, s.shots),
    goals_header: s.headedGoals ?? null,
    goals_header_ratio: calcPerc(s.headedGoals, s.goalsScored),
    shots_ontarget: s.shotsOnTarget ?? null,
    shots_offtarget: s.shotsOffTarget ?? null,
    shots_blocked: s.blockedScoringAttempt ?? null,
    woodwork: s.hitWoodwork ?? null,
    shots_ontarget_ratio: calcPerc(s.shotsOnTarget, s.shots),
    goalspershot_ratio:
      s.shots && s.shots > 0
        ? truncateStatNumber(Number(s.goalsScored ?? 0) / Number(s.shots))
        : null,
    big_chances: s.bigChances ?? null,
    big_chances_created: s.bigChancesCreated ?? null,
    big_chances_missed: s.bigChancesMissed ?? null,
    big_chances_goal_ratio: calcPerc(
      Number(s.bigChances ?? 0) - Number(s.bigChancesMissed ?? 0),
      s.bigChances,
    ),
    dribbles_success: s.successfulDribbles ?? null,
    dribbles_attempts: s.dribbleAttempts ?? null,
    dribbles_success_ratio: calcPerc(s.successfulDribbles, s.dribbleAttempts),
    fastbreak_total: s.fastBreaks ?? null,
    fastbreak_goals: s.fastBreakGoals ?? null,
    fastbreak_shots: s.fastBreakShots ?? null,
    fastbreak_ratio: calcPerc(s.fastBreakGoals, s.fastBreaks),
    avg_ball_possession: toFloat(s.averageBallPossession),
    possession_lost: s.possessionLost ?? null,
    pass_total: s.totalPasses ?? null,
    pass_acc: s.accuratePasses ?? null,
    pass_acc_percentage: toFloat(s.accuratePassesPercentage),
    pass_ownhalf_total: s.totalOwnHalfPasses ?? null,
    pass_ownhalf_acc: s.accurateOwnHalfPasses ?? null,
    pass_ownhalf_perc: toFloat(s.accurateOwnHalfPassesPercentage),
    pass_opphalf_total: s.totalOppositionHalfPasses ?? null,
    pass_opphalf_acc: s.accurateOppositionHalfPasses ?? null,
    pass_opphalf_perc: toFloat(s.accurateOppositionHalfPassesPercentage),
    longballs_total: s.totalLongBalls ?? null,
    longballs_acc: s.accurateLongBalls ?? null,
    longballs_perc: toFloat(s.accurateLongBallsPercentage),
    cross_total: s.totalCrosses ?? null,
    cross_acc: s.accurateCrosses ?? null,
    cross_perc: toFloat(s.accurateCrossesPercentage),
    cleansheats: s.cleanSheets ?? null,
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
    duels_total: s.totalDuels ?? null,
    duels_won: s.duelsWon ?? null,
    duels_perc: toFloat(s.duelsWonPercentage),
    ground_duels_total: s.totalGroundDuels ?? null,
    ground_duels_won: s.groundGroundDuels ?? s.groundDuelsWon ?? null,
    ground_duels_perc: toFloat(s.groundDuelsWonPercentage),
    aerial_duels_total: s.totalAerialDuels ?? null,
    aerial_duels_won: s.aerialDuelsWon ?? null,
    aerial_duels_perc: toFloat(s.aerialDuelsWonPercentage),
    fouls: s.fouls ?? null,
    offsides: s.offsides ?? null,
    yellowcards: s.yellowCards ?? null,
    yellowcards_second: s.yellowRedCards ?? null,
    redcards: s.redCards ?? null,
    shots_against: s.shotsAgainst ?? null,
    shots_blocked_against:
      s.shotsBlockedAgainst ?? s.blockedScoringAttemptAgainst ?? null,
    shots_inside_against: s.shotsFromInsideTheBoxAgainst ?? null,
    shots_outside_against: s.shotsFromOutsideTheBoxAgainst ?? null,
    shots_ontarget_against: s.shotsOnTargetAgainst ?? null,
    shots_offtarget_against: s.shotsOffTargetAgainst ?? null,
    woodwork_against: s.hitWoodworkAgainst ?? null,
    goalspershot_against_ratio:
      s.shotsAgainst && s.shotsAgainst > 0
        ? truncateStatNumber(Number(s.goalsConceded ?? 0) / Number(s.shotsAgainst))
        : null,
    shots_ontarget_against_ratio: calcPerc(
      s.shotsOnTargetAgainst,
      s.shotsAgainst,
    ),
    big_chances_against: s.bigChancesAgainst ?? null,
    big_chances_against_created: s.bigChancesCreatedAgainst ?? null,
    big_chances_against_missed: s.bigChancesMissedAgainst ?? null,
    big_chances_goal_against_ratio:
      s.bigChancesAgainst && s.bigChancesAgainst > 0
        ? truncateStatNumber(
            Number(s.goalsConceded ?? 0) / Number(s.bigChancesAgainst),
          )
        : null,
    errors_to_goals_against: s.errorsLeadingToGoalAgainst ?? null,
    errors_to_shot_against: s.errorsLeadingToShotAgainst ?? null,
    pass_against_total: s.totalPassesAgainst ?? null,
    pass_against_acc: s.accuratePassesAgainst ?? null,
    pass_against_ratio: calcPerc(s.accuratePassesAgainst, s.totalPassesAgainst),
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
    tackles_against: s.tacklesAgainst ?? null,
    clearences_against: s.clearancesAgainst ?? null,
    interceptions_against: s.interceptionsAgainst ?? null,
    corners_against: s.cornersAgainst ?? null,
    offsides_against: s.offsidesAgainst ?? null,
    yellowcards_against: s.yellowCardsAgainst ?? null,
    redcards_against: s.redCardsAgainst ?? null,
  };
}

async function readLocalTeamStats(teamApiId, tournamentApiId, seasonApiId) {
  const filePath = path.join(
    RAW_TEAM_STATS_DIR,
    `debug_t${teamApiId}_s${seasonApiId}.json`,
  );

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return toLocalTeamStatsRow(JSON.parse(raw), {
      teamApiId,
      tournamentApiId,
      seasonApiId,
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function listLocalTeamStatsReferences(teams) {
  const teamsByApiId = new Map(
    (teams ?? [])
      .filter((team) => team?.api_id && team?.tournament_id)
      .map((team) => [String(team.api_id), team]),
  );

  if (teamsByApiId.size === 0) {
    return [];
  }

  let files = [];

  try {
    files = await fs.readdir(RAW_TEAM_STATS_DIR);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  return files
    .map((fileName) => {
      const match = /^debug_t(\d+)_s(\d+)\.json$/u.exec(fileName);

      if (!match) {
        return null;
      }

      const team = teamsByApiId.get(match[1]);

      if (!team) {
        return null;
      }

      return {
        team_id: Number(match[1]),
        tournament_id: team.tournament_id,
        season_id: Number(match[2]),
      };
    })
    .filter(Boolean);
}

async function listTeamStatsByApiReferences(references) {
  const teamApiIds = [
    ...new Set(references.map((reference) => reference.teamApiId).filter(Boolean)),
  ];
  const tournamentApiIds = [
    ...new Set(
      references.map((reference) => reference.tournamentApiId).filter(Boolean),
    ),
  ];
  const seasonApiIds = [
    ...new Set(references.map((reference) => reference.seasonApiId).filter(Boolean)),
  ];

  if (
    teamApiIds.length === 0 ||
    tournamentApiIds.length === 0 ||
    seasonApiIds.length === 0
  ) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("team_stats")
    .select("*")
    .in("team_id", teamApiIds)
    .in("tournament_id", tournamentApiIds)
    .in("season_id", seasonApiIds);

  if (error) {
    throw error;
  }

  const statsByReference = new Map(
    (data ?? []).map((stats) => [
      buildStatsKey(stats.team_id, stats.tournament_id, stats.season_id),
      stats,
    ]),
  );

  for (const reference of references) {
    const key = buildStatsKey(
      reference.teamApiId,
      reference.tournamentApiId,
      reference.seasonApiId,
    );

    if (statsByReference.has(key)) {
      continue;
    }

    const localStats = await readLocalTeamStats(
      reference.teamApiId,
      reference.tournamentApiId,
      reference.seasonApiId,
    );

    if (localStats) {
      statsByReference.set(key, localStats);
    }
  }

  return statsByReference;
}

async function buildStatsSeasonRowsForTeams(teams, statsRows) {
  const teamsByApiId = new Map(
    (teams ?? [])
      .filter((team) => team?.api_id)
      .map((team) => [String(team.api_id), team]),
  );
  const tournamentApiIds = [
    ...new Set((statsRows ?? []).map((row) => row.tournament_id).filter(Boolean)),
  ];
  const seasonApiIds = [
    ...new Set((statsRows ?? []).map((row) => row.season_id).filter(Boolean)),
  ];

  if (
    teamsByApiId.size === 0 ||
    tournamentApiIds.length === 0 ||
    seasonApiIds.length === 0
  ) {
    return [];
  }

  const [tournamentsResult, seasonsResult] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, api_id, name, country")
      .in("api_id", tournamentApiIds),
    supabase
      .from("seasons")
      .select("id, api_id, name, year, tournament_id, is_current")
      .in("api_id", seasonApiIds)
      .in("tournament_id", tournamentApiIds),
  ]);

  if (tournamentsResult.error) {
    throw tournamentsResult.error;
  }

  if (seasonsResult.error) {
    throw seasonsResult.error;
  }

  const tournamentsByApiId = new Map(
    (tournamentsResult.data ?? []).map((tournament) => [
      String(tournament.api_id),
      tournament,
    ]),
  );
  const seasonsByApiContext = new Map(
    (seasonsResult.data ?? []).map((season) => [
      buildStatsKey(null, season.tournament_id, season.api_id),
      season,
    ]),
  );

  return (statsRows ?? [])
    .map((row) => {
      const team = teamsByApiId.get(String(row.team_id));
      const tournament = tournamentsByApiId.get(String(row.tournament_id));
      const season = seasonsByApiContext.get(
        buildStatsKey(null, row.tournament_id, row.season_id),
      );

      if (!team || !tournament || !season) {
        return null;
      }

      return {
        team_db_id: team.id,
        team_id: row.team_id,
        tournament_id: row.tournament_id,
        tournament_db_id: tournament.id,
        tournament_name: tournament.name,
        tournament_country:
          normalizeCountry(tournament.country) ??
          inferCountryFromTournamentName(tournament.name) ??
          inferCountryFromTeamIdentity(team),
        season_id: row.season_id,
        season_db_id: season.id,
        season_name: season.name,
        season_year: season.year,
        is_current: Boolean(season.is_current),
      };
    })
    .filter(Boolean);
}

async function listStatsSeasonRowsForTeams(teams) {
  const teamApiIds = [
    ...new Set((teams ?? []).map((team) => team.api_id).filter(Boolean)),
  ];

  if (teamApiIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("team_stats")
    .select("team_id, tournament_id, season_id")
    .in("team_id", teamApiIds);

  if (error) {
    throw error;
  }

  const localRows = await listLocalTeamStatsReferences(teams);

  return buildStatsSeasonRowsForTeams(teams, [...(data ?? []), ...localRows]);
}

async function listStatsSeasonRowsForTeam(team) {
  return listStatsSeasonRowsForTeams(team ? [team] : []);
}

export async function listTeams() {
  const query = getTeamsBaseQuery();
  const [{ data: teams, error }, { data: participationRows, error: participationError }] =
    await Promise.all([
      query.order("name", { ascending: true }),
      supabase
        .from("standings_with_team_info")
        .select(
          [
            "team_db_id",
            "team_id",
            "tournament_id",
            "tournament_db_id",
            "tournament_name",
            "tournament_country",
            "season_id",
            "season_db_id",
            "season_name",
            "season_year",
            "is_current",
          ].join(","),
        )
        .not("team_db_id", "is", null),
    ]);

  if (error) {
    throw error;
  }

  if (participationError) {
    throw participationError;
  }

  const nextTeams = teams ?? [];
  const teamTournamentApiIds = [
    ...new Set(nextTeams.map((team) => team.tournament_id).filter(Boolean)),
  ];

  let fallbackCountryByTournamentApiId = new Map();

  if (teamTournamentApiIds.length > 0) {
    const { data: tournaments, error: tournamentsError } = await supabase
      .from("tournaments")
      .select("api_id, country, name")
      .in("api_id", teamTournamentApiIds);

    if (tournamentsError) {
      throw tournamentsError;
    }

    fallbackCountryByTournamentApiId = new Map(
      (tournaments ?? []).map((tournament) => [
        tournament.api_id,
        normalizeCountry(tournament.country) ??
          inferCountryFromTournamentName(tournament.name),
      ]),
    );
  }

  const summaryByTeamId = buildParticipationSummary(participationRows ?? []);

  return nextTeams.map((team) => {
    const participation = summaryByTeamId.get(team.id);

    return {
      ...team,
      country:
        normalizeCountry(participation?.tournament_country) ??
        inferCountryFromTournamentName(participation?.tournament_name) ??
        fallbackCountryByTournamentApiId.get(team.tournament_id) ??
        inferCountryFromTeamIdentity(team) ??
        null,
      badge_label: toBadgeLabel(participation),
      badge_is_current: Boolean(participation?.is_current),
    };
  });
}

export async function getTeamById(id) {
  const query = getTeamsBaseQuery();
  const { data, error } = await query.eq("id", id).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTeamProfileById(id) {
  const team = await getTeamById(id);

  if (!team) {
    return null;
  }

  const participationRows = await listParticipationRowsByTeamId(id);
  const preferredParticipation = getPreferredParticipationRow(
    participationRows,
    team.tournament_id ?? null,
  );

  if (preferredParticipation?.tournament_db_id) {
    return {
      ...team,
      tournament_id: preferredParticipation.tournament_db_id,
      tournament_name: preferredParticipation.tournament_name?.trim() || null,
    };
  }

  if (!team.tournament_id) {
    return {
      ...team,
      tournament_id: null,
      tournament_name: null,
    };
  }

  const fallbackTournament = await getTournamentByApiId(team.tournament_id);

  return {
    ...team,
    tournament_id: fallbackTournament?.id ?? null,
    tournament_name: fallbackTournament?.name?.trim() || null,
  };
}

export async function listTeamSeasonsById(teamId, preferredTournamentApiId = null) {
  const team = await getTeamById(teamId);

  if (!team) {
    return [];
  }

  const [participationRows, statsSeasonRows] = await Promise.all([
    listParticipationRowsByTeamId(teamId),
    listStatsSeasonRowsForTeam(team),
  ]);
  const seasonRows = [...participationRows, ...statsSeasonRows];
  const preferredParticipation = getPreferredParticipationRow(
    seasonRows,
    preferredTournamentApiId,
  );

  if (!preferredParticipation?.tournament_db_id) {
    return [];
  }

  const seasonsById = new Map();

  for (const row of dedupeParticipationRows(seasonRows)) {
    if (
      row.tournament_db_id !== preferredParticipation.tournament_db_id ||
      !row.season_db_id
    ) {
      continue;
    }

    const nextSeason = {
      season_id: row.season_db_id,
      season_api_id: row.season_id ?? null,
      season_name: getSeasonLabel(row),
      tournament_id: row.tournament_db_id ?? null,
      tournament_name: row.tournament_name?.trim() || null,
      is_current: Boolean(row.is_current),
    };
    const existingSeason = seasonsById.get(nextSeason.season_id);

    if (
      !existingSeason ||
      (nextSeason.is_current && !existingSeason.is_current) ||
      (!existingSeason.season_name && nextSeason.season_name)
    ) {
      seasonsById.set(nextSeason.season_id, nextSeason);
    }
  }

  return [...seasonsById.values()].sort((a, b) => {
    const aEndYear = getSeasonEndYear(a);
    const bEndYear = getSeasonEndYear(b);

    if (aEndYear !== bEndYear) {
      return bEndYear - aEndYear;
    }

    return b.season_id - a.season_id;
  });
}

export async function listTeamMappings() {
  const { data, error } = await supabase
    .from("teams")
    .select("id, api_id, name")
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listTeamMappingsByReferences(teamReferences) {
  const references = [
    ...new Set(
      (teamReferences ?? [])
        .map((reference) => Number(reference))
        .filter((reference) => Number.isFinite(reference)),
    ),
  ];

  if (references.length === 0) {
    return [];
  }

  const [teamsByInternalId, teamsByApiId] = await Promise.all([
    supabase
      .from("teams")
      .select("id, api_id, name")
      .in("id", references),
    supabase
      .from("teams")
      .select("id, api_id, name")
      .in("api_id", references),
  ]);

  if (teamsByInternalId.error) {
    throw teamsByInternalId.error;
  }

  if (teamsByApiId.error) {
    throw teamsByApiId.error;
  }

  const teamsById = new Map();

  for (const team of [
    ...(teamsByInternalId.data ?? []),
    ...(teamsByApiId.data ?? []),
  ]) {
    teamsById.set(team.id, team);
  }

  return [...teamsById.values()];
}

export async function getLatestTeamStatsByApiId(apiId) {
  const { data, error } = await supabase
    .from("team_stats")
    .select("*")
    .eq("team_id", apiId)
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

export async function getTeamStatsByApiReferences(
  teamApiId,
  tournamentApiId,
  seasonApiId,
) {
  const { data, error } = await supabase
    .from("team_stats")
    .select("*")
    .eq("team_id", teamApiId)
    .eq("tournament_id", tournamentApiId)
    .eq("season_id", seasonApiId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  return readLocalTeamStats(teamApiId, tournamentApiId, seasonApiId);
}

export async function getTeamStatsByApiAndInternalSeason(teamApiId, seasonId) {
  if (!teamApiId || !seasonId) {
    return null;
  }

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, api_id, tournament_id")
    .eq("id", seasonId)
    .maybeSingle();

  if (seasonError) {
    throw seasonError;
  }

  if (!season?.api_id || !season?.tournament_id) {
    return null;
  }

  return getTeamStatsByApiReferences(
    teamApiId,
    season.tournament_id,
    season.api_id,
  );
}

export async function listTeamsComparisonDatasetRows() {
  const [{ data: teams, error }, { data: participationRows, error: participationError }] =
    await Promise.all([
      getTeamsBaseQuery().order("name", { ascending: true }),
      supabase
        .from("standings_with_team_info")
        .select(PARTICIPATION_SELECT)
        .not("team_db_id", "is", null)
        .not("tournament_db_id", "is", null),
    ]);

  if (error) {
    throw error;
  }

  if (participationError) {
    throw participationError;
  }

  const statsSeasonRows = await listStatsSeasonRowsForTeams(teams ?? []);
  const participationRowsByTeamId = new Map();

  for (const row of [...(participationRows ?? []), ...statsSeasonRows]) {
    const teamId = row.team_db_id;

    if (!teamId) {
      continue;
    }

    const rows = participationRowsByTeamId.get(teamId) ?? [];
    rows.push(row);
    participationRowsByTeamId.set(teamId, rows);
  }

  const entries = [];
  const statsReferences = [];

  for (const team of teams ?? []) {
    const teamParticipationRows = participationRowsByTeamId.get(team.id) ?? [];
    const seasons = buildTeamComparisonSeasons(teamParticipationRows);

    for (const season of seasons) {
      const entry = {
        team_id: team.id,
        team_api_id: team.api_id ?? null,
        team_name: team.name,
        team_logo: team.logo_url ?? null,
        tournament_id: season.tournament_id,
        tournament_api_id: season.tournament_api_id,
        tournament_name: season.tournament_name,
        season_id: season.season_id,
        season_api_id: season.season_api_id,
        season_name: season.season_name,
        is_current_season: season.is_current,
      };

      entries.push(entry);

      if (
        entry.team_api_id &&
        entry.tournament_api_id &&
        entry.season_api_id
      ) {
        statsReferences.push({
          teamApiId: entry.team_api_id,
          tournamentApiId: entry.tournament_api_id,
          seasonApiId: entry.season_api_id,
        });
      }
    }
  }

  const statsByReference = await listTeamStatsByApiReferences(statsReferences);

  return entries.map((entry) => ({
    ...entry,
    stats:
      entry.team_api_id && entry.tournament_api_id && entry.season_api_id
        ? statsByReference.get(
            buildStatsKey(
              entry.team_api_id,
              entry.tournament_api_id,
              entry.season_api_id,
            ),
          ) ?? null
        : null,
  }));
}

export async function listTeamComparisonRowsByContext({
  tournamentId,
  seasonId,
  teamIds,
}) {
  const [{ data: teams, error }, { data: participationRows, error: participationError }] =
    await Promise.all([
      getTeamsBaseQuery()
        .in("id", teamIds)
        .order("name", { ascending: true }),
      supabase
        .from("standings_with_team_info")
        .select(PARTICIPATION_SELECT)
        .eq("tournament_db_id", tournamentId)
        .eq("season_db_id", seasonId)
        .in("team_db_id", teamIds)
        .not("team_db_id", "is", null)
        .not("tournament_db_id", "is", null),
    ]);

  if (error) {
    throw error;
  }

  if (participationError) {
    throw participationError;
  }

  const teamsById = new Map((teams ?? []).map((team) => [team.id, team]));
  const tournament = await getTournamentById(tournamentId);
  const season = tournament?.api_id
    ? await resolveSeasonForTournament(seasonId, tournament.api_id)
    : null;
  const participationRowsWithStatsFallback = [...(participationRows ?? [])];

  if (tournament?.api_id && season?.api_id) {
    const missingTeamIds = teamIds.filter(
      (teamId) =>
        !participationRowsWithStatsFallback.some(
          (row) => row.team_db_id === teamId,
        ),
    );
    const missingTeams = missingTeamIds
      .map((teamId) => teamsById.get(teamId))
      .filter(Boolean);
    const missingTeamApiIds = missingTeams
      .map((team) => team.api_id)
      .filter(Boolean);

    if (missingTeamApiIds.length > 0) {
      const { data: statsRows, error: statsError } = await supabase
        .from("team_stats")
        .select("team_id, tournament_id, season_id")
        .eq("tournament_id", tournament.api_id)
        .eq("season_id", season.api_id)
        .in("team_id", missingTeamApiIds);

      if (statsError) {
        throw statsError;
      }

      const fallbackRows = await buildStatsSeasonRowsForTeams(
        missingTeams,
        statsRows ?? [],
      );
      participationRowsWithStatsFallback.push(...fallbackRows);
    }
  }
  const participationByTeamId = new Map();

  for (const row of dedupeParticipationRows(participationRowsWithStatsFallback)) {
    if (!participationByTeamId.has(row.team_db_id)) {
      participationByTeamId.set(row.team_db_id, row);
    }
  }

  const entries = [];
  const statsReferences = [];

  for (const teamId of teamIds) {
    const team = teamsById.get(teamId);
    const participation = participationByTeamId.get(teamId);

    if (!team || !participation) {
      continue;
    }

    const entry = {
      team_id: team.id,
      team_api_id: team.api_id ?? null,
      team_name: team.name,
      team_logo: team.logo_url ?? null,
      tournament_id: participation.tournament_db_id ?? null,
      tournament_api_id: participation.tournament_id ?? null,
      tournament_name: participation.tournament_name?.trim() || null,
      season_id: participation.season_db_id ?? null,
      season_api_id: participation.season_id ?? null,
      season_name: getSeasonLabel(participation),
    };

    entries.push(entry);

    if (
      entry.team_api_id &&
      entry.tournament_api_id &&
      entry.season_api_id
    ) {
      statsReferences.push({
        teamApiId: entry.team_api_id,
        tournamentApiId: entry.tournament_api_id,
        seasonApiId: entry.season_api_id,
      });
    }
  }

  const statsByReference = await listTeamStatsByApiReferences(statsReferences);

  return entries.map((entry) => ({
    ...entry,
    stats:
      entry.team_api_id && entry.tournament_api_id && entry.season_api_id
        ? statsByReference.get(
            buildStatsKey(
              entry.team_api_id,
              entry.tournament_api_id,
              entry.season_api_id,
            ),
          ) ?? null
        : null,
  }));
}
