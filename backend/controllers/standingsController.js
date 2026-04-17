import { parseInteger } from "../lib/http.js";
import {
  getCurrentSeasons,
  getStandings,
} from "../services/standingsService.js";

export async function listCurrentSeasonsController(req, res) {
  const seasons = await getCurrentSeasons();
  res.status(200).json({ data: seasons });
}

export async function getStandingsController(req, res) {
  const tournamentId = parseInteger(req.query.tournamentId, "tournamentId");
  const seasonId = parseInteger(req.query.seasonId, "seasonId");
  const standings = await getStandings(tournamentId, seasonId);

  res.status(200).json({ data: standings });
}
