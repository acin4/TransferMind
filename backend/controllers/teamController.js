import { parseInteger } from "../lib/http.js";
import { getTeam, getTeamStats, getTeams } from "../services/teamService.js";

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
  const stats = await getTeamStats(id);
  res.status(200).json({ data: stats });
}
