import { supabase } from "../lib/supabaseClient.js";

async function runPlayersQuery(teamReference) {
  let query = supabase.from("players").select("*").order("name", {
    ascending: true,
  });

  if (teamReference !== undefined && teamReference !== null) {
    query = query.eq("team_id", teamReference);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listPlayers() {
  return runPlayersQuery();
}

export async function listPlayersByTeamReferences(internalTeamId, apiTeamId) {
  const [playersByInternalId, playersByApiId] = await Promise.all([
    runPlayersQuery(internalTeamId),
    internalTeamId === apiTeamId ? [] : runPlayersQuery(apiTeamId),
  ]);

  const players = [...playersByInternalId, ...playersByApiId];
  const uniquePlayers = new Map();

  for (const player of players) {
    uniquePlayers.set(player.id, player);
  }

  return [...uniquePlayers.values()].sort((a, b) =>
    (a.name || "").localeCompare(b.name || ""),
  );
}

export async function getPlayerById(id) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
