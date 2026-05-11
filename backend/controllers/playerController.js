import { parseInteger } from "../lib/http.js";
import {
  getPlayer,
  getPlayers,
  getPlayerTeamSquads,
} from "../services/playerService.js";

const DEFAULT_PLAYER_LIMIT = 20;
const MAX_PLAYER_LIMIT = 50;

function parseOptionalInteger(value, fieldName) {
  return value !== undefined ? parseInteger(value, fieldName) : undefined;
}

function parsePlayerListQuery(query) {
  const page = parseOptionalInteger(query.page, "page") ?? 1;
  const requestedLimit =
    parseOptionalInteger(query.limit, "limit") ?? DEFAULT_PLAYER_LIMIT;
  const limit = Math.min(requestedLimit, MAX_PLAYER_LIMIT);
  const search =
    typeof query.search === "string" ? query.search.trim() : "";
  const position =
    typeof query.position === "string" ? query.position.trim() : "";
  const teamId = parseOptionalInteger(query.teamId, "teamId");

  return {
    page,
    limit,
    search,
    position,
    teamId,
  };
}

export async function listPlayersController(req, res) {
  const players = await getPlayers(parsePlayerListQuery(req.query));
  res.status(200).json(players);
}

export async function listPlayerTeamSquadsController(req, res) {
  const squads = await getPlayerTeamSquads();
  res.status(200).json({ data: squads });
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
