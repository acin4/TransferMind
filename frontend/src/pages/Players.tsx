import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight, Search, Users } from "lucide-react";
import {
  getPlayerTeams,
  getTeamPlayers,
  type PaginatedResponse,
  type PlayerListItem,
  type PlayerListStat,
  type TeamListItem,
} from "../api/api";
import SegmentedTabs from "../components/ui/SegmentedTabs";
import {
  getPlayerStats,
  getPlayerTeamName,
} from "../utils/playerDisplay";

const COUNTRY_TABS = ["ALL", "ENGLAND", "GERMANY", "GREECE", "ITALY", "SPAIN"] as const;
const TEAM_PAGE_SIZE = 24;
const PLAYER_PAGE_SIZE = 36;
const SEARCH_DEBOUNCE_MS = 250;

type CountryTab = (typeof COUNTRY_TABS)[number];

type SelectedTeam = {
  id: number | string;
  name: string;
  logo_url?: string | null;
};

type PlayersBrowserState = {
  page: number;
  search: string;
  teamId?: number | string;
  teamName?: string;
};

export default function Players() {
  const location = useLocation();
  const initialState = useMemo(
    () => getPlayersLocationState(location.state),
    [location.state],
  );
  const [activeCountry, setActiveCountry] = useState<CountryTab>("ALL");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [playerSearchQuery, setPlayerSearchQuery] = useState(
    initialState.search,
  );
  const [selectedTeam, setSelectedTeam] = useState<SelectedTeam | null>(
    initialState.team,
  );
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [teamPagination, setTeamPagination] =
    useState<PaginatedResponse<TeamListItem> | null>(null);
  const [teamPage, setTeamPage] = useState(1);
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [playerPagination, setPlayerPagination] =
    useState<PaginatedResponse<PlayerListItem> | null>(null);
  const [playerPage, setPlayerPage] = useState(initialState.page);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const teamLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const playerLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const debouncedTeamSearchQuery = useDebouncedValue(
    teamSearchQuery,
    SEARCH_DEBOUNCE_MS,
  );
  const debouncedPlayerSearchQuery = useDebouncedValue(
    playerSearchQuery,
    SEARCH_DEBOUNCE_MS,
  );
  const isTeamView = selectedTeam === null;

  useEffect(() => {
    if (!isTeamView) {
      return;
    }

    let cancelled = false;

    const fetchTeams = async () => {
      setIsLoadingTeams(true);
      setError(null);

      try {
        const response = await getPlayerTeams({
          page: teamPage,
          limit: TEAM_PAGE_SIZE,
          search: debouncedTeamSearchQuery,
          country: activeCountry,
        });

        if (cancelled) {
          return;
        }

        setTeams((currentTeams) =>
          teamPage === 1
            ? response.data
            : mergeRowsById(currentTeams, response.data),
        );
        setTeamPagination(response);
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        console.error(fetchError);
        setTeams([]);
        setTeamPagination(null);
        setError("Failed to load teams.");
      } finally {
        if (!cancelled) {
          setIsLoadingTeams(false);
        }
      }
    };

    fetchTeams();

    return () => {
      cancelled = true;
    };
  }, [activeCountry, debouncedTeamSearchQuery, isTeamView, teamPage]);

  useEffect(() => {
    if (!selectedTeam) {
      return;
    }

    let cancelled = false;

    const fetchPlayers = async () => {
      setIsLoadingPlayers(true);
      setError(null);

      try {
        const response = await getTeamPlayers(selectedTeam.id, {
          page: playerPage,
          limit: PLAYER_PAGE_SIZE,
          search: debouncedPlayerSearchQuery,
        });

        if (cancelled) {
          return;
        }

        setPlayers((currentPlayers) =>
          playerPage === 1
            ? response.data
            : mergeRowsById(currentPlayers, response.data),
        );
        setPlayerPagination(response);
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        console.error(fetchError);
        setPlayers([]);
        setPlayerPagination(null);
        setError("Failed to load players.");
      } finally {
        if (!cancelled) {
          setIsLoadingPlayers(false);
        }
      }
    };

    fetchPlayers();

    return () => {
      cancelled = true;
    };
  }, [debouncedPlayerSearchQuery, playerPage, selectedTeam]);

  useInfinitePageLoader({
    ref: teamLoadMoreRef,
    enabled: isTeamView && Boolean(teamPagination?.hasNextPage) && !isLoadingTeams,
    totalPages: teamPagination?.totalPages ?? 0,
    setPage: setTeamPage,
  });
  useInfinitePageLoader({
    ref: playerLoadMoreRef,
    enabled:
      !isTeamView &&
      Boolean(playerPagination?.hasNextPage) &&
      !isLoadingPlayers,
    totalPages: playerPagination?.totalPages ?? 0,
    setPage: setPlayerPage,
  });

  const playerPageState = useMemo(
    () => ({
      page: playerPage,
      search: playerSearchQuery,
      teamId: selectedTeam?.id,
      teamName: selectedTeam?.name,
    }),
    [playerPage, playerSearchQuery, selectedTeam],
  );

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
          value={isTeamView ? teamSearchQuery : playerSearchQuery}
          onChange={(event) => {
            if (isTeamView) {
              setTeamSearchQuery(event.target.value);
              setTeamPage(1);
              setTeams([]);
              setTeamPagination(null);
              return;
            }

            setPlayerSearchQuery(event.target.value);
            setPlayerPage(1);
            setPlayers([]);
            setPlayerPagination(null);
          }}
          placeholder={isTeamView ? "Search teams..." : "Search players..."}
          className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {isTeamView ? (
        <>
          <div className="mb-8">
            <SegmentedTabs
              items={COUNTRY_TABS.map((country) => ({
                value: country,
                label: country,
              }))}
              value={activeCountry}
              onChange={(country) => {
                setActiveCountry(country);
                setTeamPage(1);
                setTeams([]);
                setTeamPagination(null);
              }}
              className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max overflow-x-auto"
              buttonClassName="px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
            />
          </div>

          <TeamGrid
            teams={teams}
            isLoading={isLoadingTeams}
            onSelectTeam={(team) => {
              setSelectedTeam({
                id: team.id,
                name: team.name,
                logo_url: team.logo_url ?? null,
              });
              setPlayerSearchQuery("");
              setPlayerPage(1);
              setPlayers([]);
              setPlayerPagination(null);
            }}
          />

          <div ref={teamLoadMoreRef} aria-hidden="true" className="h-px" />
        </>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setSelectedTeam(null);
                setPlayerSearchQuery("");
                setPlayerPage(1);
                setPlayers([]);
                setPlayerPagination(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-blue-500 hover:text-blue-400"
            >
              <ArrowLeft size={14} />
              Back to teams
            </button>
            <div className="text-sm font-bold text-slate-400">
              <span className="text-white">{selectedTeam.name}</span>
            </div>
          </div>

          <PlayerGrid
            players={players}
            isLoading={isLoadingPlayers}
            pageState={playerPageState}
          />

          <div ref={playerLoadMoreRef} aria-hidden="true" className="h-px" />
        </>
      )}
    </div>
  );
}

function TeamGrid({
  teams,
  isLoading,
  onSelectTeam,
}: {
  teams: TeamListItem[];
  isLoading: boolean;
  onSelectTeam: (team: TeamListItem) => void;
}) {
  if (isLoading && teams.length === 0) {
    return <div className="p-6">Loading teams...</div>;
  }

  if (!isLoading && teams.length === 0) {
    return (
      <div className="mt-10 text-center p-12 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] font-black uppercase tracking-widest text-slate-500">
        No teams found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {teams.map((team) => (
        <button
          key={team.id}
          type="button"
          onClick={() => onSelectTeam(team)}
          className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-gradient-to-br from-gray-900 to-gray-800 p-5 text-left text-white shadow-lg transition hover:border-blue-500 hover:bg-slate-800/70"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-slate-950/70 text-blue-400">
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={`${team.name} logo`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <Users size={18} />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black uppercase leading-tight group-hover:text-blue-400">
                {team.name}
              </h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                {team.country ?? "Team"}
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

function PlayerGrid({
  players,
  isLoading,
  pageState,
}: {
  players: PlayerListItem[];
  isLoading: boolean;
  pageState: PlayersBrowserState;
}) {
  if (isLoading && players.length === 0) {
    return <div className="p-6">Loading players...</div>;
  }

  if (!isLoading && players.length === 0) {
    return (
      <div className="mt-10 text-center p-12 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] font-black uppercase tracking-widest text-slate-500">
        No players found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          stats={getPlayerStats(player)}
          pageState={pageState}
        />
      ))}
    </div>
  );
}

function PlayerCard({
  player,
  stats,
  pageState,
}: {
  player: PlayerListItem;
  stats: PlayerListStat | null;
  pageState: PlayersBrowserState;
}) {
  const teamName = getPlayerTeamName(player);

  return (
    <Link
      key={player.id}
      to={`/player/${player.id}`}
      state={{
        fromTeamId: player.team_id,
        fromTeamName: teamName ?? pageState.teamName,
        playersState: pageState,
      }}
    >
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-gray-900 to-gray-800 p-4 text-white shadow-lg transition hover:border-blue-500">
        <h2 className="text-lg font-semibold">{player.name}</h2>

        <p className="text-sm text-gray-400">
          Team: {teamName ?? pageState.teamName ?? "-"}
        </p>

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

function useInfinitePageLoader({
  ref,
  enabled,
  totalPages,
  setPage,
}: {
  ref: RefObject<Element | null>;
  enabled: boolean;
  totalPages: number;
  setPage: Dispatch<SetStateAction<number>>;
}) {
  useEffect(() => {
    const node = ref.current;

    if (!(node instanceof Element) || !enabled) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        setPage((currentPage) =>
          currentPage < totalPages ? currentPage + 1 : currentPage,
        );
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [enabled, ref, setPage, totalPages]);
}

function mergeRowsById<T extends { id: number | string }>(
  currentRows: T[],
  nextRows: T[],
) {
  const rowsById = new Map<string | number, T>();

  for (const row of [...currentRows, ...nextRows]) {
    rowsById.set(row.id, row);
  }

  return [...rowsById.values()];
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

function getPlayersLocationState(value: unknown) {
  if (!isRecord(value)) {
    return {
      page: 1,
      search: "",
      team: null,
    };
  }

  const teamId =
    typeof value.teamId === "string" || typeof value.teamId === "number"
      ? value.teamId
      : undefined;
  const teamName = typeof value.teamName === "string" ? value.teamName : null;

  return {
    page: getPositiveIntegerValue(value.page) ?? 1,
    search: typeof value.search === "string" ? value.search : "",
    team:
      teamId && teamName
        ? {
            id: teamId,
            name: teamName,
          }
        : null,
  };
}

function getPositiveIntegerValue(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
