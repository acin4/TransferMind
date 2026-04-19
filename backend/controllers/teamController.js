import { parseInteger } from "../lib/http.js";
import {
  getTeam,
  getTeamSeasons,
  getTeamStats,
  getTeams,
} from "../services/teamService.js";

export async function listTeamsController(req, res) {
  const teams = await getTeams();
  res.status(200).json({ data: teams });
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
