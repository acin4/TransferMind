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

type TournamentSeasonRecord = {
  tournament_id: number;
  tournament_name?: string | null;
};

function parseOptionalNumber(value: string | null) {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function Standings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSelectionRef = useRef({
    tournamentId: parseOptionalNumber(searchParams.get("tournamentId")),
    seasonId: parseOptionalNumber(searchParams.get("seasonId")),
    standingGroupId: parseOptionalNumber(searchParams.get("standingGroupId")),
    stageTournamentId: parseOptionalNumber(searchParams.get("stageTournamentId")),
    tournamentName: searchParams.get("tournamentName")?.trim() || null,
  });
  const initialGroupSelectionConsumedRef = useRef(false);

  const [tournaments, setTournaments] = useState<TournamentSeasonRecord[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<SeasonOption[]>([]);
  const [standingsGroups, setStandingsGroups] = useState<StandingsGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const data = await getCurrentTournaments();

        if (data && data.length > 0) {
          setTournaments(data);
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

  useEffect(() => {
    if (!selectedLeagueId) {
      setAvailableSeasons([]);
      setSelectedSeasonId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);
    setStandingsGroups([]);
    setSelectedGroupKey(null);

    const fetchSeasons = async () => {
      try {
        const seasons = await getTournamentSeasons(selectedLeagueId);

        if (cancelled) {
          return;
        }

        const nextSeasons: SeasonOption[] = seasons || [];
        const requestedSeason =
          selectedLeagueId === initialSelectionRef.current.tournamentId
            ? nextSeasons.find(
                (season) =>
                  season.season_id === initialSelectionRef.current.seasonId,
              )
            : null;
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
      cancelled = true;
    };
  }, [selectedLeagueId]);

  useEffect(() => {
    if (!selectedLeagueId || !selectedSeasonId) {
      setStandingsGroups([]);
      setSelectedGroupKey(null);
      return;
    }

    let cancelled = false;
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
          console.debug("[Standings] API groups", nextGroups);
        }

        setStandingsGroups(nextGroups);
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
      cancelled = true;
    };
  }, [selectedLeagueId, selectedSeasonId]);

  const uniqueLeagues = useMemo<TournamentOption[]>(() => {
    if (!tournaments || tournaments.length === 0) {
      return [];
    }

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

  const selectedStandingsRows = useMemo<TeamStandingRow[]>(() => {
    const selectedGroup =
      standingsGroups.find((group) => group.key === selectedGroupKey) ??
      standingsGroups[0];

    return selectedGroup?.rows ?? [];
  }, [standingsGroups, selectedGroupKey]);

  const updateStandingsUrl = (
    tournamentId: number | null,
    seasonId: number | null,
    group?: StandingsGroup | null,
  ) => {
    const nextParams = new URLSearchParams();

    if (tournamentId != null) {
      nextParams.set("tournamentId", String(tournamentId));
    }

    if (seasonId != null) {
      nextParams.set("seasonId", String(seasonId));
    }

    const tournamentName =
      uniqueLeagues.find((league) => league.id === tournamentId)?.name ??
      initialSelectionRef.current.tournamentName;

    if (tournamentName) {
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

  const handleLeagueChange = (newLeagueId: number | null) => {
    setSelectedLeagueId(newLeagueId);
    setSelectedSeasonId(null);
    updateStandingsUrl(newLeagueId, null, null);
  };

  const handleSeasonChange = (newSeasonId: number | null) => {
    setSelectedSeasonId(newSeasonId);
    updateStandingsUrl(selectedLeagueId, newSeasonId, null);
  };

  const handleGroupSelect = async (groupKey: string) => {
    const selectedGroup = standingsGroups.find(
      (group) => group.key === groupKey,
    );

    if (!selectedGroup || !selectedLeagueId || !selectedSeasonId) {
      setSelectedGroupKey(groupKey);
      return;
    }

    setSelectedGroupKey(groupKey);
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
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-white font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-8">
          <div>
            <h1 className="text-6xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-white via-blue-400 to-blue-600 bg-clip-text text-transparent leading-none">
              Standings
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4 flex items-center gap-2">
              <Award size={14} className="text-blue-500" /> Professional
              Scouting Network
            </p>
          </div>

          <StandingsFilters
            tournaments={uniqueLeagues}
            seasons={availableSeasons}
            selectedTournamentId={selectedLeagueId}
            selectedSeasonId={selectedSeasonId}
            onTournamentChange={handleLeagueChange}
            onSeasonChange={handleSeasonChange}
          />
        </div>

        {loading ? (
          <div className="text-center p-32 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] italic animate-pulse font-black uppercase tracking-widest text-blue-500 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin" size={40} />
            Loading Standings...
          </div>
        ) : error ? (
          <div className="text-center p-20 bg-rose-500/10 border border-rose-500/20 rounded-[3rem] text-rose-400 font-black uppercase tracking-widest">
            {error}
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StageTabs
              groups={standingsGroups}
              selectedGroupKey={selectedGroupKey}
              onSelectGroup={handleGroupSelect}
            />
            <StandingsTable rows={selectedStandingsRows} />
          </div>
        )}
      </div>
    </div>
  );
}
