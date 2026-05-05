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

function toReference(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueReferences(values) {
  return [
    ...new Set(
      values.map(toReference).filter((value) => value !== null),
    ),
  ];
}

function mergePlayers(...playerGroups) {
  const playersById = new Map();

  for (const player of playerGroups.flat()) {
    if (player?.id !== null && player?.id !== undefined) {
      playersById.set(String(player.id), player);
    }
  }

  return [...playersById.values()].sort((a, b) =>
    (a.name || "").localeCompare(b.name || ""),
  );
}

export async function listPlayers() {
  return runPlayersQuery();
}

export async function listPlayersByTeamReferences(internalTeamId, apiTeamId) {
  const [playersByInternalId, playersByApiId] = await Promise.all([
    runPlayersQuery(internalTeamId),
    apiTeamId == null || internalTeamId === apiTeamId
      ? []
      : runPlayersQuery(apiTeamId),
  ]);

  return mergePlayers(playersByInternalId, playersByApiId);
}

export async function listPlayersByTeamSeasonReferences(team, seasonId) {
  if (!team || !seasonId) {
    return [];
  }

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, api_id")
    .eq("id", seasonId)
    .maybeSingle();

  if (seasonError) {
    throw seasonError;
  }

  const teamReferences = uniqueReferences([team.id, team.api_id]);
  const seasonReferences = uniqueReferences([season?.id, season?.api_id]);

  if (teamReferences.length === 0 || seasonReferences.length === 0) {
    return [];
  }

  const { data: playerStatRows, error: playerStatsError } = await supabase
    .from("player_stats")
    .select("player_id")
    .in("team_id", teamReferences)
    .in("season_id", seasonReferences);

  if (playerStatsError) {
    throw playerStatsError;
  }

  const playerReferences = uniqueReferences(
    (playerStatRows ?? []).map((row) => row.player_id),
  );

  if (playerReferences.length > 0) {
    const [playersByInternalId, playersByApiId] = await Promise.all([
      supabase.from("players").select("*").in("id", playerReferences),
      supabase.from("players").select("*").in("api_id", playerReferences),
    ]);

    if (playersByInternalId.error) {
      throw playersByInternalId.error;
    }

    if (playersByApiId.error) {
      throw playersByApiId.error;
    }

    const players = mergePlayers(
      playersByInternalId.data ?? [],
      playersByApiId.data ?? [],
    );

    console.debug("[TeamProfile] squad selected-season query", {
      routeTeamId: team.id,
      teamApiId: team.api_id,
      teamReferences,
      selectedSeasonId: season?.id ?? null,
      selectedSeasonApiId: season?.api_id ?? null,
      playerStatsRowCount: playerStatRows?.length ?? 0,
      resultCount: players.length,
      source: "player_stats",
    });

    return players;
  }

  const players = await listPlayersByTeamReferences(team.id, team.api_id);

  console.debug("[TeamProfile] squad selected-season query", {
    routeTeamId: team.id,
    teamApiId: team.api_id,
    teamReferences,
    selectedSeasonId: season?.id ?? null,
    selectedSeasonApiId: season?.api_id ?? null,
    playerStatsRowCount: 0,
    resultCount: players.length,
    source: "players.team_id",
  });

  return players;
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

export async function getLatestPlayerStatsByPlayerReferences(player) {
  const playerReferences = uniqueReferences([player?.id, player?.api_id]);

  if (playerReferences.length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("player_stats")
    .select("*")
    .in("player_id", playerReferences)
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}
