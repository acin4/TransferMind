import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, Award, ChevronRight, Users } from "lucide-react";
import {
  getPlayerTeams,
  getTeamPlayers,
  type PaginatedResponse,
  type PlayerListItem,
  type TeamListItem,
} from "../api/api";
import PlayerTable from "../components/players/PlayerTable";
import SegmentedTabs from "../components/ui/SegmentedTabs";
import {
  getPlayerRouteKey,
  normalizePlayersPagePlayer,
} from "../utils/playerTable";
import {
  PageHeader,
  PageShell,
  SearchInput,
  standingsTheme,
} from "../components/ui/design";

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

  const handleSearchChange = (value: string) => {
    if (isTeamView) {
      setTeamSearchQuery(value);
      setTeamPage(1);
      setTeams([]);
      setTeamPagination(null);
      return;
    }

    setPlayerSearchQuery(value);
    setPlayerPage(1);
    setPlayers([]);
    setPlayerPagination(null);
  };

  return (
    <PageShell>
      <PageHeader
        title="Players"
        subtitle="Professional Scouting Network"
        icon={Award}
      />

      {error && <div className={`mb-6 ${standingsTheme.errorPanel}`}>{error}</div>}

      <SearchInput
        value={isTeamView ? teamSearchQuery : playerSearchQuery}
        onChange={handleSearchChange}
        placeholder={isTeamView ? "Search teams..." : "Search players..."}
      />

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
              className={standingsTheme.segmentedTabs}
              buttonClassName={standingsTheme.segmentedTabButton}
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
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-300 shadow-xl transition hover:border-blue-500 hover:text-blue-400"
            >
              <ArrowLeft size={14} />
              Back to teams
            </button>
            <div className="text-sm font-bold text-slate-400">
              <span className="text-white">{selectedTeam.name}</span>
            </div>
          </div>

          <PlayerResultsTable
            players={players}
            isLoading={isLoadingPlayers}
            selectedTeamName={selectedTeam.name}
            pageState={playerPageState}
          />

          <div ref={playerLoadMoreRef} aria-hidden="true" className="h-px" />
        </>
      )}
    </PageShell>
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
    return <div className={standingsTheme.loadingPanel}>Loading teams...</div>;
  }

  if (!isLoading && teams.length === 0) {
    return (
      <div className={`mt-10 ${standingsTheme.emptyPanel}`}>
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
          className="group flex items-center justify-between rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-5 text-left text-white shadow-2xl backdrop-blur-xl transition hover:border-blue-500 hover:bg-blue-500/[0.03]"
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
              <h2 className="truncate text-lg font-black uppercase italic tracking-tighter leading-tight transition-colors group-hover:text-blue-400">
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

function PlayerResultsTable({
  players,
  isLoading,
  selectedTeamName,
  pageState,
}: {
  players: PlayerListItem[];
  isLoading: boolean;
  selectedTeamName: string | null;
  pageState: PlayersBrowserState;
}) {
  const tablePlayers = useMemo(
    () =>
      players.map((player) =>
        normalizePlayersPagePlayer(player, selectedTeamName),
      ),
    [players, selectedTeamName],
  );

  if (isLoading && players.length === 0) {
    return <div className={standingsTheme.loadingPanel}>Loading players...</div>;
  }

  if (!isLoading && players.length === 0) {
    return (
      <div className={`mt-10 ${standingsTheme.emptyPanel}`}>
        No players found.
      </div>
    );
  }

  return (
    <PlayerTable
      players={tablePlayers}
      teamName={selectedTeamName}
      getPlayerLink={(player) => {
        return {
          to: `/player/${getPlayerRouteKey(player)}`,
          state: {
            fromTeamId: player.teamId,
            fromTeamName: player.teamName ?? pageState.teamName,
            playersState: pageState,
          },
        };
      }}
    />
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
