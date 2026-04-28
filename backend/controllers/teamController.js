import { parseInteger } from "../lib/http.js";
import {
  calculateTeamClusterElbow,
  runTeamClusters,
} from "../services/teamClusteringService.js";
import {
  getTeam,
  getTeamComparisonMatrix,
  getTeamProfile,
  getTeamSeasons,
  getTeamStats,
  getTeamsComparisonDataset,
  getTeams,
} from "../services/teamService.js";

export async function listTeamsController(req, res) {
  const teams = await getTeams();
  res.status(200).json({ data: teams });
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
