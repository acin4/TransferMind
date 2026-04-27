import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getCurrentTournaments,
  getStandings,
  getTournamentSeasons,
} from "../api/api";
import {
  Trophy,
  ChevronRight,
  Loader2,
  Award,
  Calendar,
  Shield,
} from "lucide-react";

const STAGE_ORDER = [
  "Regular Season",
  "Championship Round",
  "Playoffs",
  "Playout",
  "Relegation Round",
  "Qualifying",
];

const STAGE_PRIORITY = new Map(
  STAGE_ORDER.map((label, index) => [normalizeStageKey(label), index]),
);

function normalizeStageKey(value: unknown) {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.toLocaleLowerCase();
}

function parseOptionalNumber(value: string | null) {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getStandingsGroupKey(row: any) {
  const stageTournamentKey =
    row.stage_tournament_id == null
      ? `stage-name:${normalizeStageKey(row.stage_tournament_name) ?? "none"}`
      : `stage:${row.stage_tournament_id}`;
  const standingGroupKey =
    row.standing_group_id == null
      ? `group-name:${normalizeStageKey(row.standing_group_name) ?? "none"}`
      : `group:${row.standing_group_id}`;

  return `${stageTournamentKey}::${standingGroupKey}`;
}

function getStandingsGroupLabel(row: any) {
  const stageName = row.stage_tournament_name?.trim();
  const groupName = row.standing_group_name?.trim();

  if (stageName && groupName && stageName !== groupName) {
    return `${stageName} - ${groupName}`;
  }

  return row.stage_label || stageName || groupName || "Standings";
}

function dedupeStandingsRowsByTeam(rows: any[]) {
  const rowsByTeamId = new Map<string, any>();

  rows.forEach((row) => {
    const teamKey = row.team_id == null ? `row:${row.id}` : String(row.team_id);
    const existing = rowsByTeamId.get(teamKey);

    if (
      !existing ||
      (row.position ?? Number.MAX_SAFE_INTEGER) <
        (existing.position ?? Number.MAX_SAFE_INTEGER)
    ) {
      rowsByTeamId.set(teamKey, row);
    }
  });

  return Array.from(rowsByTeamId.values()).sort(
    (a, b) =>
      (a.position ?? Number.MAX_SAFE_INTEGER) -
      (b.position ?? Number.MAX_SAFE_INTEGER),
  );
}

export default function Standings() {
  const [searchParams] = useSearchParams();
  const initialSelectionRef = useRef({
    tournamentId: parseOptionalNumber(searchParams.get("tournamentId")),
    seasonId: parseOptionalNumber(searchParams.get("seasonId")),
    standingGroupId: parseOptionalNumber(searchParams.get("standingGroupId")),
    stageTournamentId: parseOptionalNumber(searchParams.get("stageTournamentId")),
    tournamentName: searchParams.get("tournamentName")?.trim() || null,
  });

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  // 1. Φόρτωση Λίστας Πρωταθλημάτων & Σεζόν από το Backend
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
    setStandings([]);

    const fetchSeasons = async () => {
      try {
        const seasons = await getTournamentSeasons(selectedLeagueId);

        if (cancelled) {
          return;
        }

        const nextSeasons = seasons || [];
        const requestedSeason =
          selectedLeagueId === initialSelectionRef.current.tournamentId
            ? nextSeasons.find(
                (season: any) =>
                  season.season_id === initialSelectionRef.current.seasonId,
              )
            : null;
        const defaultSeason =
          requestedSeason ??
          nextSeasons.find((season: any) => season.is_current) ??
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

  // 2. Φόρτωση Βαθμολογίας όταν αλλάζει η Λίγκα ή η Σεζόν
  useEffect(() => {
    if (!selectedLeagueId || !selectedSeasonId) {
      setStandings([]);
      return;
    }

    let cancelled = false;

    setLoading(true);
    getStandings(selectedLeagueId, selectedSeasonId)
      .then((data) => {
        if (cancelled) {
          return;
        }

        setStandings(data || []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        console.error("Σφάλμα φόρτωσης βαθμολογίας:", err);
        setStandings([]);
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

  // 3. Δυναμικά Φίλτρα (Dropdowns) με βάση τα δεδομένα
  const uniqueLeagues = useMemo(() => {
    if (!tournaments || tournaments.length === 0) {
      return [];
    }

    const leagueMap = new Map();
    tournaments.forEach((t) => {
      if (!leagueMap.has(t.tournament_id)) {
        leagueMap.set(t.tournament_id, {
          id: t.tournament_id,
          name: t.tournament_name || `Tournament ${t.tournament_id}`,
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

  const availableGroups = useMemo(() => {
    const groupMap = new Map<
      string,
      {
        key: string;
        label: string;
        rows: any[];
        stageLabelKey: string | null;
        standingGroupId: number | null;
        stageTournamentId: number | null;
      }
    >();

    standings.forEach((row) => {
      const groupKey = getStandingsGroupKey(row);
      const existing = groupMap.get(groupKey);

      if (existing) {
        existing.rows.push(row);
        return;
      }

      groupMap.set(groupKey, {
        key: groupKey,
        label: String(getStandingsGroupLabel(row)).trim(),
        rows: [row],
        stageLabelKey: normalizeStageKey(row.stage_label),
        standingGroupId: row.standing_group_id ?? null,
        stageTournamentId: row.stage_tournament_id ?? null,
      });
    });

    return Array.from(groupMap.values())
      .filter((group) => group.rows.length > 0)
      .sort((a, b) => {
        const aPriority = a.stageLabelKey
          ? STAGE_PRIORITY.get(a.stageLabelKey)
          : undefined;
        const bPriority = b.stageLabelKey
          ? STAGE_PRIORITY.get(b.stageLabelKey)
          : undefined;

        if (aPriority != null || bPriority != null) {
          if (aPriority == null) return 1;
          if (bPriority == null) return -1;
          if (aPriority !== bPriority) return aPriority - bPriority;
        }

        return a.label.localeCompare(b.label);
      });
  }, [standings]);

  const showStageTabs = availableGroups.length > 1;

  useEffect(() => {
    if (!showStageTabs) {
      setSelectedGroupKey(availableGroups[0]?.key ?? null);
      return;
    }

    const hasRequestedGroup =
      initialSelectionRef.current.standingGroupId != null ||
      initialSelectionRef.current.stageTournamentId != null;
    const requestedGroup =
      hasRequestedGroup &&
      selectedLeagueId === initialSelectionRef.current.tournamentId &&
      selectedSeasonId === initialSelectionRef.current.seasonId
        ? availableGroups.find(
            (group) =>
              group.standingGroupId ===
                initialSelectionRef.current.standingGroupId &&
              group.stageTournamentId ===
                initialSelectionRef.current.stageTournamentId,
          )
        : null;
    const preferredGroup =
      requestedGroup ??
      availableGroups.find(
        (group) => group.stageLabelKey === normalizeStageKey("Regular Season"),
      ) ??
      availableGroups[0];

    setSelectedGroupKey(preferredGroup?.key ?? null);
  }, [selectedLeagueId, selectedSeasonId, availableGroups, showStageTabs]);

  const filteredStandings = useMemo(() => {
    const selectedGroup =
      availableGroups.find((group) => group.key === selectedGroupKey) ??
      availableGroups[0];

    return dedupeStandingsRowsByTeam(selectedGroup?.rows ?? standings);
  }, [availableGroups, selectedGroupKey, standings]);

  // Handle αλλαγής Πρωταθλήματος
  const handleLeagueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLeagueId = Number(e.target.value);
    setSelectedLeagueId(newLeagueId);
    setSelectedSeasonId(null);
  };

  // Handle αλλαγής Σεζόν
  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeasonId(Number(e.target.value));
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
        {/* HEADER & ΤΑ 2 DROPDOWNS */}
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

          {/* ΤΑ ΦΙΛΤΡΑ (DROPDOWNS) */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto animate-in fade-in slide-in-from-right-8 duration-700">
            {/* 🟢 DROPDOWN 1: LEAGUE */}
            <div className="relative w-full sm:w-auto group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none group-hover:text-white transition-colors">
                <Shield size={18} />
              </div>
              <select
                className="w-full sm:w-[240px] appearance-none bg-slate-900 border-2 border-slate-800 text-white pl-12 pr-10 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest focus:outline-none focus:border-blue-500 transition-all cursor-pointer hover:bg-slate-800 shadow-xl truncate"
                value={selectedLeagueId}
                onChange={handleLeagueChange}
              >
                {uniqueLeagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>

            {/* 🟢 DROPDOWN 2: SEASON */}
            <div className="relative w-full sm:w-auto group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none group-hover:text-white transition-colors">
                <Calendar size={18} />
              </div>
              <select
                className="w-full sm:w-[200px] appearance-none bg-slate-900 border-2 border-slate-800 text-white pl-12 pr-10 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest focus:outline-none focus:border-emerald-500 transition-all cursor-pointer hover:bg-slate-800 shadow-xl disabled:opacity-50 truncate"
                value={selectedSeasonId ?? ""}
                onChange={handleSeasonChange}
                disabled={availableSeasons.length === 0}
              >
                {availableSeasons.map((season) => (
                  <option key={season.season_id} value={season.season_id}>
                    {season.season_name || `Season ${season.season_id}`}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-emerald-400 transition-colors">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
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
            {showStageTabs && (
              <div className="px-6 pt-6 md:px-8 md:pt-8">
                <div className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max overflow-x-auto">
                  {availableGroups.map((stage) => (
                    <StageTabButton
                      key={stage.key}
                      label={stage.label}
                      isActive={selectedGroupKey === stage.key}
                      onClick={() => setSelectedGroupKey(stage.key)}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-[0.25em]">
                    <th className="px-6 py-6 text-center">#</th>
                    <th className="px-8 py-6">CLUB</th>
                    <th className="px-3 py-6 text-center">MP</th>
                    <th className="px-3 py-6 text-center">W</th>
                    <th className="px-3 py-6 text-center">D</th>
                    <th className="px-3 py-6 text-center">L</th>
                    <th className="px-3 py-6 text-center">GF</th>
                    <th className="px-3 py-6 text-center">GA</th>
                    <th className="px-3 py-6 text-center">GD</th>
                    <th className="px-6 py-6 text-center text-blue-400 font-bold italic">
                      PTS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {filteredStandings.map((row, index) => (
                    <tr
                      key={row.id || row.team_id}
                      className="hover:bg-blue-500/[0.03] transition-all group"
                    >
                      <td className="px-6 py-5 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-sm transition-colors ${index === 0 ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/20" : index < 3 ? "bg-slate-800 text-slate-300" : "text-slate-600"}`}
                        >
                          {row.position}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        {row.team_id ? (
                          <Link
                            to={`/team/${row.team_id}`}
                            className="flex items-center gap-4 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
                          >
                            <span className="font-black text-xl tracking-tighter uppercase italic group-hover:text-blue-400 transition-colors">
                              {row.team_name || "Unknown Team"}
                            </span>
                            {index === 0 && (
                              <Trophy
                                size={18}
                                className="text-yellow-500 animate-pulse"
                              />
                            )}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-4">
                            <span className="font-black text-xl tracking-tighter uppercase italic group-hover:text-blue-400 transition-colors">
                              {row.team_name || "Unknown Team"}
                            </span>
                            {index === 0 && (
                              <Trophy
                                size={18}
                                className="text-yellow-500 animate-pulse"
                              />
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-5 text-center font-bold text-slate-400 tabular-nums">
                        {row.matches ?? 0}
                      </td>
                      <td className="px-3 py-5 text-center font-bold text-slate-400 tabular-nums">
                        {row.wins ?? 0}
                      </td>
                      <td className="px-3 py-5 text-center font-bold text-slate-400 tabular-nums">
                        {row.draws ?? 0}
                      </td>
                      <td className="px-3 py-5 text-center font-bold text-slate-400 tabular-nums">
                        {row.losses ?? 0}
                      </td>
                      <td className="px-3 py-5 text-center font-bold text-slate-400 tabular-nums">
                        {row.goals_for ?? 0}
                      </td>
                      <td className="px-3 py-5 text-center font-bold text-slate-400 tabular-nums">
                        {row.goals_against ?? 0}
                      </td>
                      <td className="px-3 py-5 text-center font-bold text-slate-300 tabular-nums">
                        {row.goal_diff ?? 0}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-2xl font-black text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)] tabular-nums">
                          {row.points ?? 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStandings.length === 0 && (
                <div className="p-32 text-center flex flex-col items-center gap-4">
                  <Shield size={48} className="text-slate-800 mb-4" />
                  <span className="text-slate-500 font-bold italic uppercase tracking-widest text-lg">
                    Δεν υπαρχουν δεδομενα βαθμολογιας.
                  </span>
                  <span className="text-slate-600 text-sm">
                    Επίλεξε διαφορετικό Πρωτάθλημα ή Σεζόν από το μενού.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StageTabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
        isActive
          ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border-b-2 border-blue-400"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-b-2 border-transparent"
      }`}
    >
      {label}
    </button>
  );
}
