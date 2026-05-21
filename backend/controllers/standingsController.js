import { parseInteger } from "../lib/http.js";
import {
  getCurrentSeasons,
  getStandings,
  getTournamentSeasons,
} from "../services/standingsService.js";

export async function listCurrentSeasonsController(req, res) {
  const seasons = await getCurrentSeasons();
  res.status(200).json({ data: seasons });
}

export async function getStandingsController(req, res) {
  const tournamentId = parseInteger(req.query.tournamentId, "tournamentId");
  const seasonId = parseInteger(req.query.seasonId, "seasonId");
  const standingGroupId =
    req.query.standingGroupId !== undefined
      ? parseInteger(req.query.standingGroupId, "standingGroupId")
      : null;
  const stageTournamentId =
    req.query.stageTournamentId !== undefined
      ? parseInteger(req.query.stageTournamentId, "stageTournamentId")
      : null;
  const standings = await getStandings(tournamentId, seasonId, {
    standingGroupId,
    stageTournamentId,
  });

  res.status(200).json({ data: standings });
}

export async function listTournamentSeasonsController(req, res) {
  const tournamentId = parseInteger(req.params.tournamentId, "tournamentId");
  const seasons = await getTournamentSeasons(tournamentId);

  res.status(200).json({ data: seasons });
}
