import { parseInteger } from "../lib/http.js";
import {
  calculateTeamClusterElbow,
  runTeamClusters,
} from "../services/teamClusteringService.js";
import {
  getTeam,
  getTeamComparisonMatrix,
  getPaginatedTeams,
  getTeamProfile,
  getTeamSeasons,
  getTeamStats,
  getTeamsComparisonDataset,
  getTeams,
} from "../services/teamService.js";
import { getPlayers } from "../services/playerService.js";

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;

function parseOptionalInteger(value, fieldName) {
  return value !== undefined ? parseInteger(value, fieldName) : undefined;
}

function parsePaginatedQuery(query) {
  const page = parseOptionalInteger(query.page, "page") ?? 1;
  const requestedLimit =
    parseOptionalInteger(query.limit, "limit") ?? DEFAULT_PAGE_LIMIT;
  const search =
    typeof query.search === "string" ? query.search.trim() : "";
  const country =
    typeof query.country === "string" ? query.country.trim() : "";

  return {
    page,
    limit: Math.min(requestedLimit, MAX_PAGE_LIMIT),
    search,
    country,
  };
}

function hasPaginatedTeamQuery(query) {
  return ["page", "limit", "search", "country"].some(
    (key) => query[key] !== undefined,
  );
}

export async function listTeamsController(req, res) {
  if (hasPaginatedTeamQuery(req.query)) {
    const teams = await getPaginatedTeams(parsePaginatedQuery(req.query));
    res.status(200).json(teams);
    return;
  }

  const teams = await getTeams();
  res.status(200).json({ data: teams });
}

export async function listTeamPlayersController(req, res) {
  const teamId = parseInteger(req.params.id, "id");
  const query = parsePaginatedQuery(req.query);
  const players = await getPlayers({
    teamId,
    page: query.page,
    limit: query.limit,
    search: query.search,
  });

  res.status(200).json(players);
}

export async function getTeamsComparisonDatasetController(req, res) {
  const dataset = await getTeamsComparisonDataset();
  res.status(200).json({ data: dataset });
}

export async function createTeamsComparisonDatasetController(req, res) {
  const dataset = await getTeamComparisonMatrix(req.body);
  res.status(200).json({ data: dataset });
}

export async function calculateTeamClusterElbowController(req, res) {
  const dataset = await calculateTeamClusterElbow(req.body);
  res.status(200).json({ data: dataset });
}

export async function runTeamClustersController(req, res) {
  const dataset = await runTeamClusters(req.body);
  res.status(200).json({ data: dataset });
}

export async function getTeamController(req, res) {
  const id = parseInteger(req.params.id, "id");
  const team = await getTeam(id);

  if (!team) {
    res.status(404).json({ error: "Team not found." });
    return;
  }

  res.status(200).json({ data: team });
}

export async function getTeamProfileController(req, res) {
  const id = parseInteger(req.params.id, "id");
  const seasonId =
    req.query.seasonId !== undefined
      ? parseInteger(req.query.seasonId, "seasonId")
      : undefined;
  const profile = await getTeamProfile(id, seasonId);

  res.status(200).json({ data: profile });
}

export async function getTeamStatsController(req, res) {
  const id = parseInteger(req.params.id, "id");
  const seasonId =
    req.query.seasonId !== undefined
      ? parseInteger(req.query.seasonId, "seasonId")
      : undefined;
  const stats = await getTeamStats(id, seasonId);
  res.status(200).json({ data: stats });
}

export async function listTeamSeasonsController(req, res) {
  const id = parseInteger(req.params.id, "id");
  const seasons = await getTeamSeasons(id);
  res.status(200).json({ data: seasons });
}
