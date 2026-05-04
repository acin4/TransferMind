import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight, Search, Users } from "lucide-react";
import type { PlayerListItem, PlayerTeamSquad } from "../api/api";
import { usePlayerTeamSquads } from "../hooks/usePlayerTeamSquads";
import SegmentedTabs from "../components/ui/SegmentedTabs";
import { filterAndRankSearchResults } from "../utils/search";
import {
  getOptionalPlayerField,
  getPlayerStats,
} from "../utils/playerDisplay";

const TOURNAMENT_TABS = [
  "All",
  "Premier League",
  "Stoiximan Super League",
  "La Liga",
  "Bundesliga",
  "Serie A",
] as const;

type TournamentTab = (typeof TOURNAMENT_TABS)[number];

type PlayersLocationState = {
  selectedTournament?: unknown;
  selectedTeamKey?: unknown;
};

const TOURNAMENT_ALIASES: Record<TournamentTab, string[]> = {
  All: [],
  "Premier League": ["Premier League", "English Premier League"],
  "Stoiximan Super League": [
    "Stoiximan Super League",
    "Super League",
    "Super League 1",
  ],
  "La Liga": ["La Liga", "LaLiga", "Primera Division"],
  Bundesliga: ["Bundesliga", "German Bundesliga"],
  "Serie A": ["Serie A", "Italian Serie A"],
};

export default function Players() {
  const location = useLocation();
  const initialLocationState = getPlayersLocationState(location.state);
  const { squads, isLoading, error } = usePlayerTeamSquads();
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentTab>(
      isTournamentTab(initialLocationState?.selectedTournament)
        ? initialLocationState.selectedTournament
        : "All",
    );
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [selectedTeamKey, setSelectedTeamKey] = useState<string | null>(
    typeof initialLocationState?.selectedTeamKey === "string"
      ? initialLocationState.selectedTeamKey
      : null,
  );

  const tournamentFilteredSquads = useMemo(
    () =>
      squads.filter((squad) =>
        squadBelongsToTournament(squad, selectedTournament),
      ),
    [selectedTournament, squads],
  );

  const searchedTeamSquads = useMemo(
    () =>
      filterAndRankSearchResults(
        tournamentFilteredSquads,
        playerSearchQuery,
        getTeamSearchFields,
      ),
    [playerSearchQuery, tournamentFilteredSquads],
  );

  const selectedSquad = useMemo(
    () =>
      tournamentFilteredSquads.find(
        (squad) => getTeamSquadKey(squad) === selectedTeamKey,
      ) ?? null,
    [selectedTeamKey, tournamentFilteredSquads],
  );

  const searchedPlayers = useMemo(
    () =>
      selectedSquad
        ? filterAndRankSearchResults(
            selectedSquad.players,
            playerSearchQuery,
            getPlayerSearchFields,
          )
        : [],
    [playerSearchQuery, selectedSquad],
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
          placeholder={selectedSquad ? "Search players..." : "Search teams..."}
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
          onChange={(tournament) => {
            setSelectedTournament(tournament);
            setSelectedTeamKey(null);
          }}
          className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max overflow-x-auto"
          buttonClassName="px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
        />
      </div>

      {selectedSquad ? (
        <SelectedSquadView
          squad={selectedSquad}
          players={searchedPlayers}
          selectedTournament={selectedTournament}
          onBack={() => {
            setSelectedTeamKey(null);
            setPlayerSearchQuery("");
          }}
        />
      ) : (
        <TeamSquadsView
          squads={searchedTeamSquads}
          onSelectSquad={(squad) => {
            setSelectedTeamKey(getTeamSquadKey(squad));
            setPlayerSearchQuery("");
          }}
        />
      )}
    </div>
  );
}

function TeamSquadsView({
  squads,
  onSelectSquad,
}: {
  squads: PlayerTeamSquad[];
  onSelectSquad: (squad: PlayerTeamSquad) => void;
}) {
  if (squads.length === 0) {
    return (
      <div className="mt-10 text-center p-12 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] font-black uppercase tracking-widest text-slate-500">
        No teams found for this tournament.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {squads.map((squad) => (
        <button
          key={getTeamSquadKey(squad)}
          type="button"
          onClick={() => onSelectSquad(squad)}
          className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-gradient-to-br from-gray-900 to-gray-800 p-5 text-left text-white shadow-lg transition hover:border-blue-500 hover:bg-slate-800/70"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-slate-950/70 text-blue-400">
              {squad.teamLogo ? (
                <img
                  src={squad.teamLogo}
                  alt={`${squad.teamName} logo`}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <Users size={18} />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black uppercase leading-tight group-hover:text-blue-400">
                {squad.teamName}
              </h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                {squad.players.length} players
              </p>
            </div>
          </div>
          <ChevronRight
            size={18}
            className="shrink-0 text-slate-600 transition group-hover:text-blue-400"
          />
        </button>
      ))}
    </div>
  );
}

function SelectedSquadView({
  squad,
  players,
  selectedTournament,
  onBack,
}: {
  squad: PlayerTeamSquad;
  players: PlayerListItem[];
  selectedTournament: TournamentTab;
  onBack: () => void;
}) {
  const squadKey = getTeamSquadKey(squad);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-blue-500 hover:text-blue-400"
        >
          <ArrowLeft size={14} />
          Back to teams
        </button>
        <div className="text-sm font-bold text-slate-400">
          <span className="inline-flex items-center gap-2 text-white">
            {squad.teamLogo ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/20 bg-slate-950/70">
                <img
                  src={squad.teamLogo}
                  alt={`${squad.teamName} logo`}
                  className="h-full w-full object-contain p-1"
                />
              </span>
            ) : null}
            {squad.teamName}
          </span>
          {" / "}
          {squad.players.length} players
        </div>
      </div>

      {players.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              squad={squad}
              squadKey={squadKey}
              selectedTournament={selectedTournament}
            />
          ))}
        </div>
      ) : (
        <div className="mt-10 text-center p-12 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] font-black uppercase tracking-widest text-slate-500">
          No players found for this team.
        </div>
      )}
    </>
  );
}

function PlayerCard({
  player,
  squad,
  squadKey,
  selectedTournament,
}: {
  player: PlayerListItem;
  squad: PlayerTeamSquad;
  squadKey: string;
  selectedTournament: TournamentTab;
}) {
  const stats = getPlayerStats(player);

  return (
    <Link
      key={player.id}
      to={`/player/${player.id}`}
      state={{
        fromTeamId: squad.teamId,
        fromTeamName: squad.teamName,
        fromTournament: selectedTournament,
        fromTeamKey: squadKey,
      }}
    >
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition">
        <h2 className="text-lg font-semibold">{player.name}</h2>

        <p className="text-sm text-gray-400">Team: {squad.teamName}</p>

        <p className="text-sm">Height: {player.height ?? "-"} cm</p>

        {stats && (
          <div className="mt-3 text-sm">
            <p>Goals: {stats.goals}</p>
            <p>Assists: {stats.assists}</p>
          </div>
        )}
      </div>
    </Link>
  );
}

function getTeamSearchFields(squad: PlayerTeamSquad) {
  return [
    squad.teamName,
    squad.tournamentName,
    squad.seasonName,
  ];
}

function getPlayerSearchFields(player: PlayerListItem) {
  return [
    player.name,
    getOptionalPlayerField(player, "nationality"),
    getCountrySearchField(player.country),
    getOptionalPlayerField(player, "position"),
  ];
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

function squadBelongsToTournament(
  squad: PlayerTeamSquad,
  selectedTournament: TournamentTab,
) {
  if (selectedTournament === "All") {
    return true;
  }

  const tournamentName = normalizeTournamentName(squad.tournamentName);

  if (!tournamentName) {
    return false;
  }

  return TOURNAMENT_ALIASES[selectedTournament]
    .map(normalizeTournamentName)
    .some(
      (tournament) =>
        tournament === tournamentName ||
        tournament.includes(tournamentName) ||
        tournamentName.includes(tournament),
    );
}

function getTeamSquadKey(squad: PlayerTeamSquad) {
  return [
    squad.teamId,
    squad.tournamentId ?? "tournament:none",
    squad.seasonId ?? "season:none",
  ].join("::");
}

function getPlayersLocationState(value: unknown): PlayersLocationState | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    selectedTournament: value.selectedTournament,
    selectedTeamKey: value.selectedTeamKey,
  };
}

function isTournamentTab(value: unknown): value is TournamentTab {
  return (
    typeof value === "string" &&
    TOURNAMENT_TABS.some((tournament) => tournament === value)
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
