import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import type { PlayerListItem } from "../api/api";
import { usePlayers } from "../hooks/usePlayers";
import SegmentedTabs from "../components/ui/SegmentedTabs";
import { filterAndRankSearchResults } from "../utils/search";

const TOURNAMENT_TABS = [
  "Premier League",
  "Stoiximan Super League",
  "La Liga",
  "Bundesliga",
] as const;

type TournamentTab = (typeof TOURNAMENT_TABS)[number];

const TOURNAMENT_ALIASES: Record<TournamentTab, string[]> = {
  "Premier League": ["Premier League", "English Premier League"],
  "Stoiximan Super League": [
    "Stoiximan Super League",
    "Super League",
    "Super League 1",
  ],
  "La Liga": ["La Liga", "LaLiga", "Primera Division"],
  Bundesliga: ["Bundesliga", "German Bundesliga"],
};

export default function Players() {
  const { players, isLoading, error } = usePlayers();
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentTab>("Premier League");
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");

  const tournamentFilteredPlayers = useMemo(
    () =>
      players.filter((player) =>
        playerBelongsToTournament(player, selectedTournament),
      ),
    [players, selectedTournament],
  );

  const filteredPlayers = useMemo(
    () =>
      filterAndRankSearchResults(
        tournamentFilteredPlayers,
        playerSearchQuery,
        getPlayerSearchFields,
      ),
    [playerSearchQuery, tournamentFilteredPlayers],
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

      <div className="mb-8">
        <SegmentedTabs
          items={TOURNAMENT_TABS.map((tournament) => ({
            value: tournament,
            label: tournament,
          }))}
          value={selectedTournament}
          onChange={setSelectedTournament}
          className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max overflow-x-auto"
          buttonClassName="px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
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
                  Team: {p.team_name ?? p.team_id ?? "-"}
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

      {filteredPlayers.length === 0 && (
        <div className="mt-10 text-center p-12 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] font-black uppercase tracking-widest text-slate-500">
          No players found for this tournament.
        </div>
      )}
    </div>
  );
}

function getPlayerSearchFields(player: PlayerListItem) {
  return [
    player.name,
    player.team_id,
    getOptionalStringField(player, "teamName"),
    getOptionalStringField(player, "team_name"),
    getOptionalStringField(player, "league"),
    getOptionalStringField(player, "league_name"),
    getOptionalStringField(player, "tournamentName"),
    getOptionalStringField(player, "tournament_name"),
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

function playerBelongsToTournament(
  player: PlayerListItem,
  selectedTournament: TournamentTab,
) {
  const playerTournament = normalizeTournamentName(
    getOptionalStringField(player, "tournament_name") ??
      getOptionalStringField(player, "tournamentName") ??
      getOptionalStringField(player, "league_name") ??
      getOptionalStringField(player, "league"),
  );

  if (!playerTournament) {
    return false;
  }

  return TOURNAMENT_ALIASES[selectedTournament]
    .map(normalizeTournamentName)
    .some(
      (tournament) =>
        tournament === playerTournament ||
        tournament.includes(playerTournament) ||
        playerTournament.includes(tournament),
    );
}

function normalizeTournamentName(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
