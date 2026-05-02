import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import type { PlayerListItem } from "../api/api";
import { usePlayers } from "../hooks/usePlayers";
import { filterAndRankSearchResults } from "../utils/search";

export default function Players() {
  const { players, isLoading, error } = usePlayers();
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const filteredPlayers = useMemo(
    () =>
      filterAndRankSearchResults(
        players,
        playerSearchQuery,
        getPlayerSearchFields,
      ),
    [playerSearchQuery, players],
  );

  if (isLoading) {
    return <div className="p-6">Loading players...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Players</h1>

      {error && (
        <div className="mb-4 text-sm font-bold text-rose-400">{error}</div>
      )}

      <div className="relative mb-6 max-w-xl">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
          <Search size={16} />
        </div>
        <input
          value={playerSearchQuery}
          onChange={(event) => setPlayerSearchQuery(event.target.value)}
          placeholder="Search players..."
          className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredPlayers.map((p) => {
          const stats = p.player_stats?.[0]; // take first stats row

          return (
            <Link key={p.id} to={`/player/${p.id}`}>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition">
                
                <h2 className="text-lg font-semibold">{p.name}</h2>

                <p className="text-sm text-gray-400">
                  Team ID: {p.team_id}
                </p>

                <p className="text-sm">
                  Height: {p.height ?? "-"} cm
                </p>

                {stats && (
                  <div className="mt-3 text-sm">
                    <p>⚽ Goals: {stats.goals}</p>
                    <p>🎯 Assists: {stats.assists}</p>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function getPlayerSearchFields(player: PlayerListItem) {
  return [
    player.name,
    player.team_id,
    getOptionalStringField(player, "teamName"),
    getOptionalStringField(player, "team_name"),
    getOptionalStringField(player, "nationality"),
    getCountrySearchField(player.country),
    getOptionalStringField(player, "position"),
  ];
}

function getOptionalStringField(
  player: PlayerListItem,
  fieldName: string,
) {
  const value = player[fieldName];
  return typeof value === "string" || typeof value === "number"
    ? value
    : null;
}

function getCountrySearchField(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (isRecord(value) && typeof value.name === "string") {
    return value.name;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
