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
import { Award, ChevronRight, Users } from "lucide-react";
import {
  getPlayerTeams,
  getTeam,
  getTeamPlayers,
  type PaginatedResponse,
  type PlayerListItem,
  type TeamListItem,
} from "../api/api";
import PlayerRosterTable from "../components/shared/PlayerRosterTable";
import BackButton from "../components/shared/BackButton";
import SegmentedTabs from "../components/ui/SegmentedTabs";
import {
  getPlayerRouteKey,
  normalizePlayersPagePlayer,
} from "../utils/playerTable";
import { getOptionalPlayerField } from "../utils/playerDisplay";
import { sortPlayersByPosition } from "../utils/sortPlayersByPosition";
import { getDisplayTeamName } from "../utils/teamDisplay";
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
  teamLogo?: string | null;
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
  const teamLogoHydrationRef = useRef(new Set<string>());
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
        const teamLogo = response.data
          .map((player) => getPlayerTeamLogoUrl(player))
          .find((logoUrl) => logoUrl !== null);

        if (teamLogo) {
          setSelectedTeam((currentTeam) =>
            currentTeam && currentTeam.id === selectedTeam.id
              ? { ...currentTeam, logo_url: currentTeam.logo_url ?? teamLogo }
              : currentTeam,
          );
        }
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

  useEffect(() => {
    if (!selectedTeam || selectedTeam.logo_url) {
      return;
    }

    const teamKey = String(selectedTeam.id);
    if (teamLogoHydrationRef.current.has(teamKey)) {
      return;
    }

    teamLogoHydrationRef.current.add(teamKey);
    let cancelled = false;

    const hydrateTeamLogo = async () => {
      try {
        const team = (await getTeam(selectedTeam.id)) as Partial<TeamListItem>;

        if (cancelled || !team.logo_url) {
          return;
        }

        setSelectedTeam((currentTeam) =>
          currentTeam && currentTeam.id === selectedTeam.id
            ? { ...currentTeam, logo_url: team.logo_url }
            : currentTeam,
        );
      } catch (fetchError) {
        console.error(fetchError);
      }
    };

    hydrateTeamLogo();

    return () => {
      cancelled = true;
    };
  }, [selectedTeam]);

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
      teamLogo: selectedTeam?.logo_url ?? null,
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
          <TeamContextHeader
            team={selectedTeam}
            onBack={() => {
              setSelectedTeam(null);
              setPlayerSearchQuery("");
              setPlayerPage(1);
              setPlayers([]);
              setPlayerPagination(null);
            }}
          />

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

function TeamContextHeader({
  team,
  onBack,
}: {
  team: SelectedTeam;
  onBack: () => void;
}) {
  const displayTeamName = getDisplayTeamName(team.name);

  return (
    <section className="mb-9 max-w-3xl border-l border-blue-500/30 pl-5">
      <div className="flex min-w-0 items-center gap-5">
        <TeamLogoMark team={team} displayTeamName={displayTeamName} />

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-300/70">
            Selected Team
          </p>
          <h2 className="mt-1 truncate text-2xl font-black uppercase italic leading-tight text-white md:text-3xl">
            {displayTeamName}
          </h2>
        </div>
      </div>

      <div className="mt-5">
        <BackButton
          label="Back to teams"
          onClick={onBack}
          className="h-10 rounded-xl px-4 text-[10px]"
        />
      </div>
    </section>
  );
}

function TeamLogoMark({
  team,
  displayTeamName,
}: {
  team: SelectedTeam;
  displayTeamName: string;
}) {
  const [hasLogoError, setHasLogoError] = useState(false);
  const logoUrl = hasLogoError ? null : team.logo_url;

  useEffect(() => {
    setHasLogoError(false);
  }, [team.id, team.logo_url]);

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl shadow-slate-950/30 ring-1 ring-blue-500/10 md:h-[72px] md:w-[72px]">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${displayTeamName} logo`}
          loading="lazy"
          decoding="async"
          onError={() => setHasLogoError(true)}
          className="h-12 w-12 object-contain md:h-14 md:w-14"
        />
      ) : (
        <span
          aria-hidden="true"
          className="text-2xl font-black uppercase text-blue-300 md:text-3xl"
        >
          {displayTeamName.charAt(0) || "T"}
        </span>
      )}
    </div>
  );
}

function getPlayerTeamLogoUrl(player: PlayerListItem) {
  return (
    getOptionalPlayerField(player, "team_logo") ??
    getOptionalPlayerField(player, "teamLogo")
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
      sortPlayersByPosition(
        players.map((player) =>
          normalizePlayersPagePlayer(player, selectedTeamName),
        ),
      ),
    [players, selectedTeamName],
  );

  if (isLoading && players.length === 0) {
    return <div className={standingsTheme.loadingPanel}>Loading players...</div>;
  }

  return (
    <PlayerRosterTable
      title="Current Squad"
      players={tablePlayers}
      emptyMessage="No players found."
      getPlayerLink={(player) => {
        const fromTeamName = player.teamName ?? pageState.teamName ?? null;

        return {
          to: `/player/${getPlayerRouteKey(player)}`,
          state: {
            fromTeamId: player.teamId,
            fromTeamName: fromTeamName
              ? getDisplayTeamName(fromTeamName)
              : undefined,
            fromTeamLogo: pageState.teamLogo ?? null,
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
  const teamLogo = typeof value.teamLogo === "string" ? value.teamLogo : null;

  return {
    page: getPositiveIntegerValue(value.page) ?? 1,
    search: typeof value.search === "string" ? value.search : "",
    team:
      teamId && teamName
        ? {
            id: teamId,
            name: teamName,
            logo_url: teamLogo,
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
