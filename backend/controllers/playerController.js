import { parseInteger } from "../lib/http.js";
import { getPlayer, getPlayers } from "../services/playerService.js";

export async function listPlayersController(req, res) {
  const teamId =
    req.query.teamId !== undefined
      ? parseInteger(req.query.teamId, "teamId")
      : undefined;

  const players = await getPlayers(teamId);
  res.status(200).json({ data: players });
}

export async function getPlayerController(req, res) {
  const id = parseInteger(req.params.id, "id");
  const player = await getPlayer(id);

  if (!player) {
    res.status(404).json({ error: "Player not found." });
    return;
  }

  res.status(200).json({ data: player });
}
