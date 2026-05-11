import { HttpError } from "../lib/http.js";
import {
  getPlayerById,
  getLatestPlayerStatsByPlayerReferences,
  listPlayerTeamReferencesByPlayer,
  listPaginatedPlayers,
  listPlayersByTeamReferences,
  listPlayersByTeamSeasonReferences,
} from "../repositories/playerRepository.js";
import {
  getTeamById,
  listTeamMappings,
  listTeamMappingsByReferences,
  listTeamSeasonsById,
} from "../repositories/teamRepository.js";
import { listPlayerPositionsByPlayerIds } from "../repositories/searchRepository.js";

const COMMON_STAT_KEYS = [
  "rating",
  "appearances",
  "minutes_played",
  "matches_started",
  "count_rating",
  "total_rating",
  "totw_appearances",
  "fouls",
  "was_fouled",
  "yellow_cards",
  "red_cards",
  "direct_red_cards",
  "yellow_red_cards",
  "own_goals",
  "penalties_taken",
  "penalty_goals",
  "penalty_won",
  "penalty_conceded",
  "penalty_conversion",
  "set_piece_conversion",
  "shot_from_set_piece",
  "free_kick_goal",
  "attempt_penalty_miss",
  "attempt_penalty_post",
  "attempt_penalty_target",
  "has_stats",
];

const OUTFIELD_STAT_KEYS = [
  "goals",
  "assists",
  "goals_assists_sum",
  "total_shots",
  "shots_on_target",
  "shots_off_target",
  "blocked_shots",
  "goal_conversion_percentage",
  "scoring_frequency",
  "big_chances_created",
  "big_chances_missed",
  "successful_dribbles",
  "successful_dribbles_percentage",
  "goals_from_inside_the_box",
  "goals_from_outside_the_box",
  "shots_from_inside_the_box",
  "shots_from_outside_the_box",
  "headed_goals",
  "left_foot_goals",
  "right_foot_goals",
  "hit_woodwork",
  "offsides",
  "total_passes",
  "accurate_passes",
  "inaccurate_passes",
  "accurate_passes_percentage",
  "accurate_own_half_passes",
  "total_own_half_passes",
  "accurate_opposition_half_passes",
  "total_opposition_half_passes",
  "accurate_final_third_passes",
  "total_chipped_passes",
  "accurate_chipped_passes",
  "total_long_balls",
  "accurate_long_balls",
  "accurate_long_balls_percentage",
  "pass_to_assist",
  "total_cross",
  "accurate_crosses",
  "accurate_crosses_percentage",
  "crosses_not_claimed",
  "touches",
  "total_attempt_assist",
  "tackles",
  "tackles_won",
  "tackles_won_percentage",
  "interceptions",
  "clearances",
  "dribbled_past",
  "possession_won_att_third",
  "ball_recovery",
  "total_contest",
  "total_duels_won",
  "total_duels_won_percentage",
  "ground_duels_won",
  "ground_duels_won_percentage",
  "aerial_duels_won",
  "aerial_duels_won_percentage",
  "duel_lost",
  "aerial_lost",
  "error_lead_to_goal",
  "error_lead_to_shot",
  "dispossessed",
  "possession_lost",
];

const GOALKEEPER_STAT_KEYS = [
  "saves",
  "clean_sheet",
  "goal_kicks",
  "punches",
  "runs_out",
  "successful_runs_out",
  "high_claims",
  "saves_caught",
  "saves_parried",
  "saved_shots_from_inside_the_box",
  "saved_shots_from_outside_the_box",
  "goals_conceded",
  "goals_conceded_inside_the_box",
  "goals_conceded_outside_the_box",
  "penalty_faced",
  "penalty_save",
];

function buildTeamMaps(teamRows) {
  const teamByInternalId = new Map();
  const teamIdByAnyReference = new Map();
  const teamByAnyReference = new Map();

  for (const team of teamRows) {
    teamByInternalId.set(team.id, team);
    teamIdByAnyReference.set(String(team.id), team.id);
    teamByAnyReference.set(String(team.id), team);

    if (team.api_id !== null && team.api_id !== undefined) {
      teamIdByAnyReference.set(String(team.api_id), team.id);
      teamByAnyReference.set(String(team.api_id), team);
    }
  }

  return { teamByInternalId, teamIdByAnyReference, teamByAnyReference };
}

function resolveTeamByReference(teamMaps, reference) {
  if (reference === null || reference === undefined) {
    return null;
  }

  return teamMaps.teamByAnyReference.get(String(reference)) ?? null;
}

function sanitizePlayer(player, teamMaps, options = {}) {
  if (!player) {
    return null;
  }

  const { teamByInternalId, teamIdByAnyReference } = teamMaps;
  const teamReference = options.teamReference ?? player.team_id;
  const normalizedTeamId =
    teamIdByAnyReference.get(String(teamReference)) ?? null;
  const team =
    resolveTeamByReference(teamMaps, teamReference) ??
    teamByInternalId.get(normalizedTeamId) ??
    null;
  const { api_id, ...rest } = player;

  return {
    ...rest,
    team_id: normalizedTeamId,
    team_name: team?.name ?? null,
    tournament_name: team?.tournament_name ?? null,
    team_logo: team?.logo_url ?? null,
  };
}

function sanitizePlayerStats(stats) {
  if (!stats) {
    return null;
  }

  const {
    id,
    player_id,
    team_id,
    tournament_id,
    season_id,
    ...publicStats
  } = stats;

  return publicStats;
}

function pickStats(stats, keys) {
  if (!stats) {
    return {};
  }

  return Object.fromEntries(
    keys
      .filter((key) => Object.prototype.hasOwnProperty.call(stats, key))
      .map((key) => [key, stats[key]]),
  );
}

function hasMeasuredStat(stats) {
  return Object.values(stats ?? {}).some(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

function isGoalkeeperPosition(position) {
  const normalizedPositions = String(position ?? "")
    .split(/[,\s/]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  return (
    normalizedPositions.includes("goalkeeper") ||
    normalizedPositions.includes("gk")
  );
}

function normalizePlayerStats(stats, position) {
  const publicStats = sanitizePlayerStats(stats) ?? {};
  const commonStats = pickStats(publicStats, COMMON_STAT_KEYS);
  const outfieldStats = pickStats(publicStats, OUTFIELD_STAT_KEYS);
  const goalkeeperStats = pickStats(publicStats, GOALKEEPER_STAT_KEYS);
  const isGoalkeeper = isGoalkeeperPosition(position);

  return {
    commonStats,
    outfieldStats:
      !isGoalkeeper && hasMeasuredStat(outfieldStats) ? outfieldStats : null,
    goalkeeperStats:
      isGoalkeeper || hasMeasuredStat(goalkeeperStats)
        ? goalkeeperStats
        : null,
    flatStats: publicStats,
  };
}

function sanitizeRelatedTeams(teamRows) {
  return (teamRows ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    logo_url: team.logo_url ?? null,
  }));
}

function selectDefaultSeason(seasons) {
  return seasons.find((season) => season.is_current) ?? seasons[0] ?? null;
}

async function listTeamSquadPlayers(team, seasonId) {
  return seasonId === undefined
    ? listPlayersByTeamReferences(team.id, team.api_id)
    : listPlayersByTeamSeasonReferences(team, seasonId);
}

export async function getTeamSquad(teamId, seasonId, options = {}) {
  const team = options.team ?? (await getTeamById(teamId));

  if (!team) {
    throw new HttpError(404, "Team not found.");
  }

  const teamMaps =
    options.teamMaps ??
    buildTeamMaps(await listTeamMappings({ includeTournament: true }));
  const players = await listTeamSquadPlayers(team, seasonId);
  const positionsByPlayerId = await listPlayerPositionsByPlayerIds(
    players.map((player) => player.id),
  );

  return players.map((player) => ({
    ...sanitizePlayer(player, teamMaps, { teamReference: team.id }),
    position: positionsByPlayerId.get(player.id) ?? null,
  }));
}

export async function getPlayerTeamSquads() {
  const teamRows = await listTeamMappings({ includeTournament: true });
  const teamMaps = buildTeamMaps(teamRows);
  const squads = await Promise.all(
    teamRows.map(async (team) => {
      const seasons = await listTeamSeasonsById(
        team.id,
        team.tournament_api_id ?? null,
      );
      const selectedSeason = selectDefaultSeason(seasons);
      const squad = await getTeamSquad(team.id, selectedSeason?.season_id, {
        team,
        teamMaps,
      });

      return {
        teamId: team.id,
        teamName: team.name,
        teamLogo: team.logo_url ?? null,
        tournamentId: selectedSeason?.tournament_id ?? team.tournament_id ?? null,
        tournamentName:
          selectedSeason?.tournament_name ?? team.tournament_name ?? null,
        seasonId: selectedSeason?.season_id ?? null,
        seasonName: selectedSeason?.season_name ?? null,
        players: squad,
      };
    }),
  );

  return squads.filter((squad) => squad.players.length > 0);
}

function buildPaginationPayload(rows, { page, limit, total }) {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    data: rows,
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export async function getPlayers(options = {}) {
  const { teamId, page = 1, limit = 20, search = "", position = "" } = options;
  const team = teamId !== undefined ? await getTeamById(teamId) : null;

  if (teamId !== undefined && !team) {
    throw new HttpError(404, "Team not found.");
  }

  const { rows: players, total } = await listPaginatedPlayers({
    page,
    limit,
    search,
    position,
    teamReferences: team ? [team.id, team.api_id] : [],
  });
  const teamRows = await listTeamMappingsByReferences(
    players.map((player) => player.team_id),
  );
  const teamMaps = buildTeamMaps(teamRows);
  const positionsByPlayerId = await listPlayerPositionsByPlayerIds(
    players.map((player) => player.id),
  );
  const data = players.map((player) => ({
    ...sanitizePlayer(player, teamMaps),
    position: positionsByPlayerId.get(player.id) ?? null,
    player_stats: [],
  }));

  return buildPaginationPayload(data, { page, limit, total });
}

export async function getPlayer(id) {
  const player = await getPlayerById(id);

  if (!player) {
    return null;
  }

  const [playerStats, relatedTeamReferences, positionsByPlayerId] =
    await Promise.all([
      getLatestPlayerStatsByPlayerReferences(player),
      listPlayerTeamReferencesByPlayer(player),
      listPlayerPositionsByPlayerIds([player.id]),
    ]);
  const teamRows = await listTeamMappingsByReferences([
    playerStats?.team_id,
    player.team_id,
    ...relatedTeamReferences,
  ]);
  const teamMaps = buildTeamMaps(teamRows);
  const sanitizedPlayer = sanitizePlayer(player, teamMaps, {
    teamReference: playerStats?.team_id ?? player.team_id,
  });
  const position = positionsByPlayerId.get(player.id) ?? null;
  const normalizedStats = normalizePlayerStats(playerStats, position);

  return {
    ...sanitizedPlayer,
    position,
    commonStats: normalizedStats.commonStats,
    outfieldStats: normalizedStats.outfieldStats,
    goalkeeperStats: normalizedStats.goalkeeperStats,
    player_stats: playerStats ? [normalizedStats.flatStats] : [],
    related_teams: sanitizeRelatedTeams(teamRows),
  };
}
