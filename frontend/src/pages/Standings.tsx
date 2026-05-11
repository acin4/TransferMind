import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Award, Loader2 } from "lucide-react";
import {
  getCurrentTournaments,
  getStandings,
  getTournamentSeasons,
  type StandingsGroup,
  type TeamStandingRow,
} from "../api/api";
import StandingsFilters from "../components/standings/StandingsFilters";
import StageTabs from "../components/standings/StageTabs";
import StandingsTable from "../components/standings/StandingsTable";
import type {
  SeasonOption,
  TournamentOption,
} from "../components/standings/types";
import { filterAndRankSearchResults } from "../utils/search";
import {
  PageHeader,
  PageShell,
  SearchInput,
  SurfacePanel,
  standingsTheme,
} from "../components/ui/design";

// Minimal tournament record returned by the current-tournaments endpoint.
// The page later converts these records into dropdown options.
type TournamentSeasonRecord = {
  tournament_id: number;
  tournament_name?: string | null;
};

// Reads optional numeric values from URL search params.
// Invalid or missing values become null so state never receives NaN.
function parseOptionalNumber(value: string | null) {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Standings is the page for selecting a tournament/season and viewing the table.
// It keeps the selected ids in both React state and URL search params.
export default function Standings() {
  // useSearchParams lets the page read and update query-string values like
  // ?tournamentId=...&seasonId=...
  const [searchParams, setSearchParams] = useSearchParams();
  // Store the first URL selection in a ref so it stays stable across re-renders.
  // This is used to restore direct links into a specific standings view.
  const initialSelectionRef = useRef({
    tournamentId: parseOptionalNumber(searchParams.get("tournamentId")),
    seasonId: parseOptionalNumber(searchParams.get("seasonId")),
    standingGroupId: parseOptionalNumber(searchParams.get("standingGroupId")),
    stageTournamentId: parseOptionalNumber(searchParams.get("stageTournamentId")),
    tournamentName: searchParams.get("tournamentName")?.trim() || null,
  });
  // This ref ensures the legacy group/stage URL selection is applied only once.
  const initialGroupSelectionConsumedRef = useRef(false);

  // Data loaded from the backend.
  const [tournaments, setTournaments] = useState<TournamentSeasonRecord[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<SeasonOption[]>([]);
  const [standingsGroups, setStandingsGroups] = useState<StandingsGroup[]>([]);
  // Page-level request state.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current UI selections.
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  // Search text for filtering rows inside the selected standings table.
  const [standingsSearchQuery, setStandingsSearchQuery] = useState("");

  // First load: fetch tournaments that have current/available seasons.
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        // Backend returns tournaments that can be used in the standings filters.
        const data = await getCurrentTournaments();

        if (data && data.length > 0) {
          setTournaments(data);
          // Prefer the tournament from the URL. If there is none, default to the
          // first tournament returned by the backend.
          setSelectedLeagueId(
            initialSelectionRef.current.tournamentId ?? data[0].tournament_id,
          );
          setError(null);
        } else {
          setTournaments([]);
          setAvailableSeasons([]);
          setError("Δεν βρέθηκαν διαθέσιμες διοργανώσεις.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Σφάλμα φόρτωσης διοργανώσεων:", err);
        setTournaments([]);
        setAvailableSeasons([]);
        setError("Αδυναμία φόρτωσης διοργανώσεων από τον server.");
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  // Second load: whenever the selected tournament changes, fetch its seasons.
  useEffect(() => {
    if (!selectedLeagueId) {
      // Without a tournament, there are no seasons or standings to show.
      setAvailableSeasons([]);
      setSelectedSeasonId(null);
      setLoading(false);
      return;
    }

    // cancelled prevents stale season requests from updating state after the
    // selected tournament changes quickly.
    let cancelled = false;

    setLoading(true);
    setError(null);
    // Clear previous standings while new season options are loading.
    setStandingsGroups([]);
    setSelectedGroupKey(null);

    const fetchSeasons = async () => {
      try {
        // Backend seasons for the selected tournament.
        const seasons = await getTournamentSeasons(selectedLeagueId);

        if (cancelled) {
          return;
        }

        const nextSeasons: SeasonOption[] = seasons || [];
        // If the URL requested a season for this same tournament, try to restore it.
        const requestedSeason =
          selectedLeagueId === initialSelectionRef.current.tournamentId
            ? nextSeasons.find(
                (season) =>
                  season.season_id === initialSelectionRef.current.seasonId,
              )
            : null;
        // Otherwise prefer the current season, then the first available season.
        const defaultSeason =
          requestedSeason ??
          nextSeasons.find((season) => season.is_current) ??
          nextSeasons[0] ??
          null;

        setAvailableSeasons(nextSeasons);
        setSelectedSeasonId(defaultSeason?.season_id ?? null);

        if (!defaultSeason) {
          setError("Δεν βρέθηκαν διαθέσιμες σεζόν για αυτό το πρωτάθλημα.");
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error("Σφάλμα φόρτωσης σεζόν:", err);
        setAvailableSeasons([]);
        setSelectedSeasonId(null);
        setError("Αδυναμία φόρτωσης των σεζόν.");
        setLoading(false);
      }
    };

    fetchSeasons();

    return () => {
      // Mark this seasons request as stale.
      cancelled = true;
    };
  }, [selectedLeagueId]);

  // Third load: whenever tournament and season are selected, fetch standings.
  useEffect(() => {
    if (!selectedLeagueId || !selectedSeasonId) {
      // Both ids are required for a standings request.
      setStandingsGroups([]);
      setSelectedGroupKey(null);
      return;
    }

    // cancelled prevents an old standings request from overwriting newer results.
    let cancelled = false;
    // Older URLs may include a specific group/stage. Restore it only for the
    // initial tournament/season combination.
    const hasInitialGroupSelection =
      initialSelectionRef.current.standingGroupId != null ||
      initialSelectionRef.current.stageTournamentId != null;
    const shouldUseLegacyGroupSelection =
      hasInitialGroupSelection &&
      !initialGroupSelectionConsumedRef.current &&
      selectedLeagueId === initialSelectionRef.current.tournamentId &&
      selectedSeasonId === initialSelectionRef.current.seasonId;

    setLoading(true);
    getStandings(
      selectedLeagueId,
      selectedSeasonId,
      // Send group/stage ids only for the first legacy restoration request.
      shouldUseLegacyGroupSelection
        ? {
            standingGroupId: initialSelectionRef.current.standingGroupId,
            stageTournamentId: initialSelectionRef.current.stageTournamentId,
          }
        : {},
    )
      .then((data) => {
        if (cancelled) {
          return;
        }

        const nextGroups = data?.groups ?? [];
        if (import.meta.env.DEV) {
          // Development-only visibility into the backend response shape.
          console.debug("[Standings] API groups", nextGroups);
        }

        setStandingsGroups(nextGroups);
        // The backend can choose the best default/selected group key.
        setSelectedGroupKey(data?.selectedGroupKey ?? null);
        initialGroupSelectionConsumedRef.current =
          initialGroupSelectionConsumedRef.current ||
          shouldUseLegacyGroupSelection;
        setError(null);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        console.error("Σφάλμα φόρτωσης βαθμολογίας:", err);
        setStandingsGroups([]);
        setSelectedGroupKey(null);
        setError("Αδυναμία φόρτωσης της βαθμολογίας.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      // Mark this standings request as stale.
      cancelled = true;
    };
  }, [selectedLeagueId, selectedSeasonId]);

  // Convert raw tournament rows into unique dropdown options.
  const uniqueLeagues = useMemo<TournamentOption[]>(() => {
    if (!tournaments || tournaments.length === 0) {
      return [];
    }

    // Map removes duplicate tournament ids while keeping a simple option shape.
    const leagueMap = new Map<number, TournamentOption>();
    tournaments.forEach((tournament) => {
      if (!leagueMap.has(tournament.tournament_id)) {
        leagueMap.set(tournament.tournament_id, {
          id: tournament.tournament_id,
          name:
            tournament.tournament_name ||
            `Tournament ${tournament.tournament_id}`,
        });
      }
    });

    // If the page was opened from a URL with a tournament id not present in the
    // current list, keep it as an option so the selection still displays.
    if (
      initialSelectionRef.current.tournamentId &&
      !leagueMap.has(initialSelectionRef.current.tournamentId)
    ) {
      leagueMap.set(initialSelectionRef.current.tournamentId, {
        id: initialSelectionRef.current.tournamentId,
        name:
          initialSelectionRef.current.tournamentName ||
          `Tournament ${initialSelectionRef.current.tournamentId}`,
      });
    }

    return Array.from(leagueMap.values());
  }, [tournaments]);

  // Pick the active standings group. If the selected key is missing, fall back to
  // the first group returned by the backend.
  const selectedStandingsGroup = useMemo<StandingsGroup | undefined>(
    () =>
      standingsGroups.find((group) => group.key === selectedGroupKey) ??
      standingsGroups[0],
    [standingsGroups, selectedGroupKey],
  );

  // Rows for the currently selected table/group.
  const selectedStandingsRows = useMemo<TeamStandingRow[]>(
    () => selectedStandingsGroup?.rows ?? [],
    [selectedStandingsGroup],
  );

  // Search/filter the visible standings rows by team, stage, group, and context.
  const visibleStandingsRows = useMemo(
    () =>
      filterAndRankSearchResults(
        selectedStandingsRows,
        standingsSearchQuery,
        (row) => getStandingRowSearchFields(row, selectedStandingsGroup),
      ),
    [selectedStandingsGroup, selectedStandingsRows, standingsSearchQuery],
  );

  // Keeps the browser URL synchronized with the current standings selection.
  // This makes standings views shareable/bookmarkable.
  const updateStandingsUrl = (
    tournamentId: number | null,
    seasonId: number | null,
    group?: StandingsGroup | null,
  ) => {
    const nextParams = new URLSearchParams();

    if (tournamentId != null) {
      // Query params are always strings, so convert ids before storing them.
      nextParams.set("tournamentId", String(tournamentId));
    }

    if (seasonId != null) {
      nextParams.set("seasonId", String(seasonId));
    }

    const tournamentName =
      uniqueLeagues.find((league) => league.id === tournamentId)?.name ??
      initialSelectionRef.current.tournamentName;

    if (tournamentName) {
      // tournamentName is included for friendlier restoration if the id is not in
      // the current tournament list.
      nextParams.set("tournamentName", tournamentName);
    }

    if (group?.standingGroupId != null) {
      nextParams.set("standingGroupId", String(group.standingGroupId));
    }

    if (group?.stageTournamentId != null) {
      nextParams.set("stageTournamentId", String(group.stageTournamentId));
    }

    setSearchParams(nextParams, { replace: false });
  };

  // User changed the tournament dropdown. Reset season/group because they belong
  // to the previous tournament.
  const handleLeagueChange = (newLeagueId: number | null) => {
    setSelectedLeagueId(newLeagueId);
    setSelectedSeasonId(null);
    updateStandingsUrl(newLeagueId, null, null);
  };

  // User changed the season dropdown. Group selection is reset because groups can
  // differ between seasons.
  const handleSeasonChange = (newSeasonId: number | null) => {
    setSelectedSeasonId(newSeasonId);
    updateStandingsUrl(selectedLeagueId, newSeasonId, null);
  };

  // User selected a stage/group tab. Fetching again lets the backend return the
  // exact group/stage context for that selection.
  const handleGroupSelect = async (groupKey: string) => {
    const selectedGroup = standingsGroups.find(
      (group) => group.key === groupKey,
    );

    if (!selectedGroup || !selectedLeagueId || !selectedSeasonId) {
      // If the group cannot be found locally, still update the selected key so
      // the UI reflects the user's click.
      setSelectedGroupKey(groupKey);
      return;
    }

    setSelectedGroupKey(groupKey);
    // Put the selected group/stage into the URL before fetching the refined data.
    updateStandingsUrl(selectedLeagueId, selectedSeasonId, selectedGroup);

    try {
      setLoading(true);
      setError(null);

      const data = await getStandings(selectedLeagueId, selectedSeasonId, {
        standingGroupId: selectedGroup.standingGroupId,
        stageTournamentId: selectedGroup.stageTournamentId,
      });
      const nextGroups = data?.groups ?? [];

      if (import.meta.env.DEV) {
        // Development-only visibility into the backend response shape.
        console.debug("[Standings] API groups", nextGroups);
      }

      setStandingsGroups(nextGroups);
      setSelectedGroupKey(data?.selectedGroupKey ?? groupKey);
    } catch (err) {
      console.error("Î£Ï†Î¬Î»Î¼Î± Ï†ÏŒÏÏ„Ï‰ÏƒÎ·Ï‚ Î¿Î¼Î¬Î´Î±Ï‚ Î²Î±Î¸Î¼Î¿Î»Î¿Î³Î¯Î±Ï‚:", err);
      setError("Î‘Î´Ï…Î½Î±Î¼Î¯Î± Ï†ÏŒÏÏ„Ï‰ÏƒÎ·Ï‚ Ï„Î·Ï‚ ÎµÏ€Î¹Î»ÎµÎ³Î¼Î­Î½Î·Ï‚ Î²Î±Î¸Î¼Î¿Î»Î¿Î³Î¯Î±Ï‚.");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedLeagueId || (!selectedSeasonId && loading)) {
    // Initial full-screen state while the page finds a tournament and season.
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black gap-2">
        {error ? (
          <span className="italic uppercase text-rose-400">{error}</span>
        ) : (
          <>
            <Loader2 className="animate-spin" />{" "}
            <span className="italic uppercase">Initializing Data...</span>
          </>
        )}
      </div>
    );
  }

  return (
    <PageShell>
      {/* Header row contains page title and tournament/season filters. */}
      <PageHeader
        title="Standings"
        subtitle="Professional Scouting Network"
        icon={Award}
        actions={
          <StandingsFilters
            tournaments={uniqueLeagues}
            seasons={availableSeasons}
            selectedTournamentId={selectedLeagueId}
            selectedSeasonId={selectedSeasonId}
            onTournamentChange={handleLeagueChange}
            onSeasonChange={handleSeasonChange}
          />
        }
      />

      {/* Search box filters only the rows in the currently selected standings group. */}
      <SearchInput
        value={standingsSearchQuery}
        onChange={setStandingsSearchQuery}
        placeholder="Search standings..."
      />

      {loading ? (
        // Loading panel shown while standings or a selected group is being fetched.
        <div className={standingsTheme.loadingPanel}>
          <Loader2 className="animate-spin" size={40} />
          Loading Standings...
        </div>
      ) : error ? (
        // Error panel shown when the standings request fails.
        <div className={standingsTheme.errorPanel}>{error}</div>
      ) : (
        // Successful state: tabs choose the stage/group, table renders filtered rows.
        <SurfacePanel>
          <StageTabs
            groups={standingsGroups}
            selectedGroupKey={selectedGroupKey}
            onSelectGroup={handleGroupSelect}
          />
          <StandingsTable rows={visibleStandingsRows} />
        </SurfacePanel>
      )}
    </PageShell>
  );
}

// Search fields used to rank/filter standings rows.
// It includes both row-level fields and the selected group context.
function getStandingRowSearchFields(
  row: TeamStandingRow,
  group: StandingsGroup | undefined,
) {
  return [
    row.team_name,
    row.standing_group_name,
    row.stage_tournament_name,
    row.stage_label,
    group?.label,
    group?.stage,
    group?.tournamentId,
    group?.seasonId,
  ];
}
