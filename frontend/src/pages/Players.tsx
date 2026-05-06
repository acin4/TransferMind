import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight, Search, Users } from "lucide-react";
import type {
  PlayerListItem,
  PlayerListStat,
  PlayerTeamSquad,
} from "../api/api";
import { usePlayerTeamSquads } from "../hooks/usePlayerTeamSquads";
import SegmentedTabs from "../components/ui/SegmentedTabs";
import { filterAndRankSearchResults } from "../utils/search";
import {
  getOptionalPlayerField,
  getPlayerStats,
} from "../utils/playerDisplay";

// Tournament tabs shown above the players browser. "All" disables tournament
// filtering, while the other values narrow the team/squad list.
const TOURNAMENT_TABS = [
  "All",
  "Premier League",
  "Stoiximan Super League",
  "La Liga",
  "Bundesliga",
  "Serie A",
] as const;

// Small debounce delay so typing in the search box does not filter on every
// single keystroke immediately.
const SEARCH_DEBOUNCE_MS = 250;
// Page sizes control how many teams/players are shown before a "Load more" button.
const TEAM_PAGE_SIZE = 24;
const PLAYER_PAGE_SIZE = 36;

// TournamentTab is a union type made from TOURNAMENT_TABS, so state can only hold
// one of the visible tab values.
type TournamentTab = (typeof TOURNAMENT_TABS)[number];

// Optional router state used when returning from a player profile.
// It can restore the tournament tab and selected team.
type PlayersLocationState = {
  selectedTournament?: unknown;
  selectedTeamKey?: unknown;
};

// Different APIs or datasets may spell the same league differently.
// These aliases let the tab filters match common name variations.
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

// Players is a route page for browsing players by team/squad.
// The page starts with team cards, then opens a player grid after a team is selected.
export default function Players() {
  // location.state may contain restored filter/team state from PlayerProfile.
  const location = useLocation();
  const initialLocationState = getPlayersLocationState(location.state);
  // Custom hook fetches player squads from the backend through the frontend API layer.
  const { squads, isLoading, error } = usePlayerTeamSquads();
  // selectedTournament controls which tournament tab is active.
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentTab>(
      isTournamentTab(initialLocationState?.selectedTournament)
        ? initialLocationState.selectedTournament
        : "All",
    );
  // Search text used for either teams or players depending on the current view.
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  // selectedTeamKey decides whether the page is showing team cards or one squad's
  // player cards. null means no team is selected.
  const [selectedTeamKey, setSelectedTeamKey] = useState<string | null>(
    typeof initialLocationState?.selectedTeamKey === "string"
      ? initialLocationState.selectedTeamKey
      : null,
  );
  // Debounced value updates shortly after typing stops, making filtering feel
  // smooth with larger lists.
  const debouncedPlayerSearchQuery = useDebouncedValue(
    playerSearchQuery,
    SEARCH_DEBOUNCE_MS,
  );
  // If the raw input is only spaces, treat it as no search.
  const searchQuery = playerSearchQuery.trim() ? debouncedPlayerSearchQuery : "";

  // First filter by tournament tab. This determines which teams are available.
  const tournamentFilteredSquads = useMemo(
    () =>
      squads.filter((squad) =>
        squadBelongsToTournament(squad, selectedTournament),
      ),
    [selectedTournament, squads],
  );

  // Then search/rank the visible teams when no squad is selected.
  const searchedTeamSquads = useMemo(
    () =>
      filterAndRankSearchResults(
        tournamentFilteredSquads,
        searchQuery,
        getTeamSearchFields,
      ),
    [searchQuery, tournamentFilteredSquads],
  );

  // Find the selected squad from the currently tournament-filtered list.
  // If the tournament changes and the selected squad no longer exists, this becomes null.
  const selectedSquad = useMemo(
    () =>
      tournamentFilteredSquads.find(
        (squad) => getTeamSquadKey(squad) === selectedTeamKey,
      ) ?? null,
    [selectedTeamKey, tournamentFilteredSquads],
  );

  // When a squad is selected, search within that team's players.
  const searchedPlayers = useMemo(
    () =>
      selectedSquad
        ? filterAndRankSearchResults(
            selectedSquad.players,
            searchQuery,
            getPlayerSearchFields,
          )
        : [],
    [searchQuery, selectedSquad],
  );

  if (isLoading) {
    // Simple loading state while the squads request is in progress.
    return <div className="p-6">Loading players...</div>;
  }

  return (
    // Main page padding wrapper. This page uses the app's dark background from
    // the surrounding layout, so it focuses on spacing and content.
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Players</h1>

      {error && (
        // Non-blocking error display from the squads hook.
        <div className="mb-4 text-sm font-bold text-rose-400">{error}</div>
      )}

      {/* Search box changes meaning based on the view:
          before selecting a team it searches teams; after selecting a team it
          searches players inside that squad. */}
      <div className="relative mb-6 max-w-xl">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
          <Search size={16} />
        </div>
        <input
          // Controlled input owned by playerSearchQuery state.
          value={playerSearchQuery}
          onChange={(event) => setPlayerSearchQuery(event.target.value)}
          placeholder={selectedSquad ? "Search players..." : "Search teams..."}
          className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Tournament tabs filter which squads are available.
          Changing tournament also clears the selected team to avoid stale detail views. */}
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

      {/* Two-page flow:
          - no selected squad: show team cards
          - selected squad: show that team's player cards */}
      {selectedSquad ? (
        <SelectedSquadView
          key={`${getTeamSquadKey(selectedSquad)}:${searchQuery}`}
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
          key={`${selectedTournament}:${searchQuery}`}
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
  // visibleCount supports incremental rendering, so large team lists do not all
  // appear at once.
  const [visibleCount, setVisibleCount] = useState(TEAM_PAGE_SIZE);
  // Only render the first visibleCount squads.
  const visibleSquads = useMemo(
    () => squads.slice(0, visibleCount),
    [squads, visibleCount],
  );
  // hiddenCount drives the "Load more teams" button label.
  const hiddenCount = Math.max(squads.length - visibleSquads.length, 0);

  // Reset pagination when filtering/searching changes the squad list.
  useEffect(() => {
    setVisibleCount(TEAM_PAGE_SIZE);
  }, [squads]);

  if (squads.length === 0) {
    // Empty state for tournament/search filters that match no teams.
    return (
      <div className="mt-10 text-center p-12 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] font-black uppercase tracking-widest text-slate-500">
        No teams found for this tournament.
      </div>
    );
  }

  return (
    <>
      {/* Responsive team card grid: one column on mobile, more columns on wider screens. */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleSquads.map((squad) => (
          // Clicking a team card opens that squad's player list in this same page.
          <button
            key={getTeamSquadKey(squad)}
            type="button"
            onClick={() => onSelectSquad(squad)}
            className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-gradient-to-br from-gray-900 to-gray-800 p-5 text-left text-white shadow-lg transition hover:border-blue-500 hover:bg-slate-800/70"
          >
            <div className="flex min-w-0 items-center gap-4">
              {/* Logo area has a fallback icon when no team logo is available. */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-slate-950/70 text-blue-400">
                {squad.teamLogo ? (
                  <img
                    src={squad.teamLogo}
                    alt={`${squad.teamName} logo`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-1.5"
                  />
                ) : (
                  <Users size={18} />
                )}
              </div>
              <div className="min-w-0">
                {/* truncate prevents long team names from breaking card width. */}
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

      {hiddenCount > 0 && (
        // Load more reveals another page of team cards without leaving the page.
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() =>
              setVisibleCount((count) =>
                Math.min(count + TEAM_PAGE_SIZE, squads.length),
              )
            }
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-blue-500 hover:text-blue-400"
          >
            Load more teams ({hiddenCount} left)
          </button>
        </div>
      )}
    </>
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
  // squadKey uniquely identifies this team/tournament/season combination.
  const squadKey = getTeamSquadKey(squad);
  // visibleCount controls incremental rendering for player cards.
  const [visibleCount, setVisibleCount] = useState(PLAYER_PAGE_SIZE);
  // Only show the first visibleCount players.
  const visiblePlayers = useMemo(
    () => players.slice(0, visibleCount),
    [players, visibleCount],
  );
  // Precompute each visible player's stats so PlayerCard receives simple props.
  const visiblePlayerCards = useMemo(
    () =>
      visiblePlayers.map((player) => ({
        player,
        stats: getPlayerStats(player),
      })),
    [visiblePlayers],
  );
  // hiddenCount drives the "Load more players" button.
  const hiddenCount = Math.max(players.length - visiblePlayers.length, 0);

  // Reset player pagination when the selected squad or player search result changes.
  useEffect(() => {
    setVisibleCount(PLAYER_PAGE_SIZE);
  }, [players, squadKey]);

  return (
    <>
      {/* Header row for the selected squad view, including a back button to the
          team list and a small squad summary. */}
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
            {/* Show a compact team logo next to the selected team name when present. */}
            {squad.teamLogo ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/20 bg-slate-950/70">
                <img
                  src={squad.teamLogo}
                  alt={`${squad.teamName} logo`}
                  loading="lazy"
                  decoding="async"
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
        <>
          {/* Player cards grid for the selected squad. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visiblePlayerCards.map(({ player, stats }) => (
              <PlayerCard
                key={player.id}
                player={player}
                stats={stats}
                squad={squad}
                squadKey={squadKey}
                selectedTournament={selectedTournament}
              />
            ))}
          </div>

          {hiddenCount > 0 && (
            // Load more reveals another page of players in this squad.
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((count) =>
                    Math.min(count + PLAYER_PAGE_SIZE, players.length),
                  )
                }
                className="rounded-xl border border-slate-800 bg-slate-900/70 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-blue-500 hover:text-blue-400"
              >
                Load more players ({hiddenCount} left)
              </button>
            </div>
          )}
        </>
      ) : (
        // Empty state when a selected squad has no players matching the search.
        <div className="mt-10 text-center p-12 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] font-black uppercase tracking-widest text-slate-500">
          No players found for this team.
        </div>
      )}
    </>
  );
}

function PlayerCard({
  player,
  stats,
  squad,
  squadKey,
  selectedTournament,
}: {
  player: PlayerListItem;
  stats: PlayerListStat | null;
  squad: PlayerTeamSquad;
  squadKey: string;
  selectedTournament: TournamentTab;
}) {
  return (
    // Link navigates to the player profile. The state object preserves enough
    // context for PlayerProfile to show a helpful back label and return filters.
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
      {/* Compact player card with core details and a small goals/assists preview. */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-gray-900 to-gray-800 p-4 text-white shadow-lg transition hover:border-blue-500">
        <h2 className="text-lg font-semibold">{player.name}</h2>

        <p className="text-sm text-gray-400">Team: {squad.teamName}</p>

        <p className="text-sm">Height: {player.height ?? "-"} cm</p>

        {stats && (
          // Show quick attacking stats only when the player has a stat row.
          <div className="mt-3 text-sm">
            <p>Goals: {stats.goals}</p>
            <p>Assists: {stats.assists}</p>
          </div>
        )}
      </div>
    </Link>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  // debouncedValue updates after value has stayed unchanged for delayMs.
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Wait before copying value into debouncedValue.
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    // If value changes before the delay finishes, cancel the previous timeout.
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

// Search fields used when ranking team/squad cards.
function getTeamSearchFields(squad: PlayerTeamSquad) {
  return [
    squad.teamName,
    squad.tournamentName,
    squad.seasonName,
  ];
}

// Search fields used when ranking players inside a selected squad.
function getPlayerSearchFields(player: PlayerListItem) {
  return [
    player.name,
    getOptionalPlayerField(player, "nationality"),
    getCountrySearchField(player.country),
    getOptionalPlayerField(player, "position"),
  ];
}

// Player country can be a plain string or an object with a name field.
// This helper normalizes both shapes into searchable text.
function getCountrySearchField(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (isRecord(value) && typeof value.name === "string") {
    return value.name;
  }

  return null;
}

// Checks whether one squad should appear under the selected tournament tab.
function squadBelongsToTournament(
  squad: PlayerTeamSquad,
  selectedTournament: TournamentTab,
) {
  if (selectedTournament === "All") {
    // The All tab does not filter anything out.
    return true;
  }

  // Normalize names before comparison so casing and extra spaces do not matter.
  const tournamentName = normalizeTournamentName(squad.tournamentName);

  if (!tournamentName) {
    return false;
  }

  return TOURNAMENT_ALIASES[selectedTournament]
    .map(normalizeTournamentName)
    .some(
      // Allow exact matches and partial contains matches because league names can
      // arrive in slightly different forms.
      (tournament) =>
        tournament === tournamentName ||
        tournament.includes(tournamentName) ||
        tournamentName.includes(tournament),
    );
}

// Builds a stable key for a team-season squad. Team id alone is not enough
// because the same team can appear in different tournaments or seasons.
function getTeamSquadKey(squad: PlayerTeamSquad) {
  return [
    squad.teamId,
    squad.tournamentId ?? "tournament:none",
    squad.seasonId ?? "season:none",
  ].join("::");
}

// Safely extracts route state used to restore this page after profile navigation.
function getPlayersLocationState(value: unknown): PlayersLocationState | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    selectedTournament: value.selectedTournament,
    selectedTeamKey: value.selectedTeamKey,
  };
}

// Type guard for validating restored tournament tab values.
function isTournamentTab(value: unknown): value is TournamentTab {
  return (
    typeof value === "string" &&
    TOURNAMENT_TABS.some((tournament) => tournament === value)
  );
}

// Normalizes tournament names before comparing aliases.
function normalizeTournamentName(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

// Small type guard that confirms an unknown value is an object-like record.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
