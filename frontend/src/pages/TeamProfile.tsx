import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import {
  type TeamProfileData,
  getTeam,
  getTeamSeasons,
  getTeamStats,
  getPlayers,
  getStandings,
} from "../api/api";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Trophy,
  Shield,
  Building2,
  MapPin,
} from "lucide-react";
import {
  TEAM_STATS_CATEGORIES,
  formatTeamStatValue,
  getTeamStatMeta,
  type TeamStats,
  type TeamStatsCategoryId,
  type TeamStatKey,
} from "../teamStatsConfig";

function normalizeCountry(value: unknown) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function getTeamLocation(team: TeamProfileData | null) {
  if (!team) {
    return null;
  }

  const city =
    (typeof team.city === "string" ? team.city : null) ||
    (typeof team.venue === "object" && team.venue
      ? team.venue.city ?? null
      : null);
  const country = normalizeCountry(team.country);

  if (city && country) {
    return `${city}, ${country}`;
  }

  return city || country || null;
}

function getTeamStadium(team: TeamProfileData | null) {
  if (!team) {
    return null;
  }

  if (typeof team.venue === "object" && team.venue) {
    const venueName = team.venue.name?.trim();
    if (venueName) {
      return venueName;
    }
  }

  if (typeof team.stadium === "string" && team.stadium.trim()) {
    return team.stadium.trim();
  }

  if (typeof team.venue === "string" && team.venue.trim()) {
    return team.venue.trim();
  }

  return null;
}

export default function TeamProfile() {
  const { id } = useParams();

  const [team, setTeam] = useState<TeamProfileData | null>(null);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [teamSquad, setTeamSquad] = useState<any[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  const [teamStanding, setTeamStanding] = useState<any>(null);
  const [miniStandings, setMiniStandings] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasonError, setSeasonError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "standings" | "statistics" | "squad"
  >("statistics");
  const [activeStatsCategory, setActiveStatsCategory] =
    useState<TeamStatsCategoryId>(TEAM_STATS_CATEGORIES[0].id);

  useEffect(() => {
    let cancelled = false;

    const fetchStaticData = async () => {
      try {
        if (!id) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);
        setSeasonError(null);
        setTeam(null);
        setStats(null);
        setTeamSquad([]);
        setTeamStanding(null);
        setMiniStandings([]);
        setAvailableSeasons([]);
        setSelectedSeasonId(null);

        const [fetchedTeam, fetchedPlayers, fetchedSeasons] = await Promise.all(
          [getTeam(id), getPlayers(id), getTeamSeasons(id)],
        );

        if (cancelled) {
          return;
        }

        setTeam(fetchedTeam);
        setTeamSquad(fetchedPlayers || []);
        setAvailableSeasons(fetchedSeasons || []);

        const defaultSeason =
          fetchedSeasons?.find((season: any) => season.is_current) ??
          fetchedSeasons?.[0] ??
          null;

        setSelectedSeasonId(defaultSeason?.season_id ?? null);

        if (!fetchedTeam?.tournament_id || !defaultSeason?.season_id) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Σφάλμα κατά τη φόρτωση του Profile:", err);
        if (!cancelled) {
          setError("Δεν βρέθηκαν δεδομένα για αυτή την ομάδα.");
          setLoading(false);
        }
      }
    };

    fetchStaticData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const fetchSeasonData = async () => {
      if (!team) {
        return;
      }

      if (!id || !team.tournament_id || !selectedSeasonId) {
        setStats(null);
        setTeamStanding(null);
        setMiniStandings([]);
        setSeasonLoading(false);
        setSeasonError(null);
        setLoading(false);
        return;
      }

      try {
        setSeasonLoading(true);
        setSeasonError(null);

        const [fetchedStats, standings] = await Promise.all([
          getTeamStats(id, selectedSeasonId),
          getStandings(team.tournament_id, selectedSeasonId),
        ]);

        if (cancelled) {
          return;
        }

        setStats(fetchedStats || null);

        const standingsRows = standings || [];
        const teamIndex = standingsRows.findIndex(
          (row: any) => String(row.team_id) === String(id),
        );

        if (teamIndex === -1) {
          setTeamStanding(null);
          setMiniStandings([]);
          return;
        }

        const teamPos = standingsRows[teamIndex];
        let startIdx = Math.max(0, teamIndex - 1);
        let endIdx = Math.min(standingsRows.length, startIdx + 4);

        if (endIdx - startIdx < 4) {
          startIdx = Math.max(0, endIdx - 4);
        }

        setTeamStanding(teamPos);
        setMiniStandings(standingsRows.slice(startIdx, endIdx));
      } catch (err) {
        console.error("Σφάλμα κατά τη φόρτωση δεδομένων σεζόν:", err);

        if (!cancelled) {
          setStats(null);
          setTeamStanding(null);
          setMiniStandings([]);
          setSeasonError("Αδυναμία φόρτωσης δεδομένων για τη σεζόν.");
        }
      } finally {
        if (!cancelled) {
          setSeasonLoading(false);
          setLoading(false);
        }
      }
    };

    fetchSeasonData();

    return () => {
      cancelled = true;
    };
  }, [id, selectedSeasonId, team?.tournament_id]);

  const selectedSeason = useMemo(
    () =>
      availableSeasons.find(
        (season: any) => season.season_id === selectedSeasonId,
      ) ?? null,
    [availableSeasons, selectedSeasonId],
  );

  const headerSubtitle =
    [team?.tournament_name, selectedSeason?.season_name]
      .filter(Boolean)
      .join(" - ") ||
    team?.city ||
    "Professional Club";

  const standingsLabel =
    [team?.tournament_name, selectedSeason?.season_name]
      .filter(Boolean)
      .join(" - ") || "League Position";

  const selectedStatsCategory =
    TEAM_STATS_CATEGORIES.find(
      (category) => category.id === activeStatsCategory,
    ) ?? TEAM_STATS_CATEGORIES[0];

  const handleSeasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeasonId(Number(event.target.value));
  };

  const getAge = (dobString: string) => {
    if (!dobString) return "-";
    const dob = new Date(dobString);
    const diff = Date.now() - dob.getTime();
    return new Date(diff).getUTCFullYear() - 1970;
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-widest">
        Loading Profile...
      </div>
    );
  if (error || !team)
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold uppercase tracking-widest text-rose-500">
        {error || "Team not found"}
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-white font-sans">
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link
          to="/teams"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors font-bold uppercase text-xs tracking-widest"
        >
          <ArrowLeft size={16} /> Back to Teams
        </Link>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center border-4 border-slate-900 shadow-2xl p-3 overflow-hidden">
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Shield className="text-slate-400" size={40} />
              )}
            </div>
            <div>
              <h1 className="text-5xl font-black uppercase text-white tracking-tight italic">
                {team.name}
              </h1>
              <p className="text-blue-400 text-sm font-black mt-2 uppercase tracking-widest flex items-center gap-2">
                <Trophy size={14} className="text-blue-500" />
                {headerSubtitle}
              </p>
              <div className="mt-4 space-y-2">
                <HeaderMetaLine
                  icon={<MapPin size={14} />}
                  value={getTeamLocation(team)}
                />
                <HeaderMetaLine
                  icon={<Building2 size={14} />}
                  value={getTeamStadium(team)}
                />
              </div>
            </div>
          </div>

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
              {availableSeasons.length === 0 ? (
                <option value="">No Seasons</option>
              ) : (
                availableSeasons.map((season: any) => (
                  <option key={season.season_id} value={season.season_id}>
                    {season.season_name || `Season ${season.season_id}`}
                  </option>
                ))
              )}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-emerald-400 transition-colors">
              <ChevronRight size={16} className="rotate-90" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max">
          <TabButton
            label="Standings"
            isActive={activeTab === "standings"}
            onClick={() => setActiveTab("standings")}
          />
          <TabButton
            label="Statistics"
            isActive={activeTab === "statistics"}
            onClick={() => setActiveTab("statistics")}
          />
          <TabButton
            label="Squad"
            isActive={activeTab === "squad"}
            onClick={() => setActiveTab("squad")}
          />
        </div>

        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 p-6 md:p-10 shadow-2xl backdrop-blur-sm">
          {seasonError ? (
            <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-xs font-black uppercase tracking-widest text-rose-400">
              {seasonError}
            </div>
          ) : null}

          {activeTab === "standings" && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                <Trophy size={16} className="text-blue-500" />
                {standingsLabel}
              </h3>

              {seasonLoading ? (
                <p className="text-slate-500 italic bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center font-bold">
                  Loading season standings...
                </p>
              ) : teamStanding && miniStandings.length > 0 ? (
                <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-inner">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-800">
                        <th className="py-4 pl-6 text-center w-12">#</th>
                        <th className="py-4 pl-4">Team</th>
                        <th className="py-4 text-center">M</th>
                        <th className="py-4 text-center">W</th>
                        <th className="py-4 text-center">D</th>
                        <th className="py-4 text-center">L</th>
                        <th className="py-4 pr-6 text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {miniStandings.map((row: any) => {
                        const isCurrentTeam =
                          String(row.team_id) === String(id);
                        return (
                          <tr
                            key={row.team_id}
                            className={`transition-colors ${isCurrentTeam ? "bg-blue-600/10" : "hover:bg-slate-800/40"}`}
                          >
                            <td className="py-4 pl-6 text-center">
                              <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black mx-auto ${isCurrentTeam ? "bg-blue-500 text-white" : "text-slate-500"}`}
                              >
                                {row.position}
                              </span>
                            </td>
                            <td
                              className={`py-4 pl-4 font-bold ${isCurrentTeam ? "text-blue-400" : "text-slate-300"}`}
                            >
                              {row.team_name || "Unknown"}
                            </td>
                            <td className="py-4 text-center text-slate-400 text-sm">
                              {row.matches || 0}
                            </td>
                            <td className="py-4 text-center text-slate-400 text-sm">
                              {row.wins || 0}
                            </td>
                            <td className="py-4 text-center text-slate-400 text-sm">
                              {row.draws || 0}
                            </td>
                            <td className="py-4 text-center text-slate-400 text-sm">
                              {row.losses || 0}
                            </td>
                            <td
                              className={`py-4 pr-6 text-right font-black ${isCurrentTeam ? "text-white" : "text-slate-300"}`}
                            >
                              {row.points || 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="bg-slate-900/80 border-t border-slate-800 p-4 text-center">
                    <Link
                      to="/standings"
                      className="text-[10px] font-black uppercase text-blue-500 tracking-widest hover:text-blue-400 transition-colors"
                    >
                      View Full Standings
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center font-bold">
                  Δεν βρέθηκαν δεδομένα βαθμολογίας.
                </p>
              )}
            </div>
          )}

          {activeTab === "statistics" && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">
                Season Statistics
              </h3>
              {seasonLoading ? (
                <p className="text-slate-500 italic bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center font-bold">
                  Loading season statistics...
                </p>
              ) : stats ? (
                <>
                  <div className="flex gap-2 mb-6 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
                    {TEAM_STATS_CATEGORIES.map((category) => (
                      <StatsCategoryTabButton
                        key={category.id}
                        label={`${category.label} (${category.statKeys.length})`}
                        isActive={activeStatsCategory === category.id}
                        onClick={() => setActiveStatsCategory(category.id)}
                      />
                    ))}
                  </div>
                  <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-inner">
                    {selectedStatsCategory.statKeys.map((statKey) => {
                      const statMeta = getTeamStatMeta(statKey);
                      return (
                        <StatLine
                          key={statKey}
                          label={statMeta.label}
                          value={formatTeamStatValue(
                            stats[statKey],
                            statMeta.format,
                          )}
                          isCard={getStatCardColor(statKey)}
                        />
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 italic bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center font-bold">
                  Δεν βρέθηκαν στατιστικά για αυτή την ομάδα.
                </p>
              )}
            </div>
          )}

          {activeTab === "squad" && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">
                Current Squad
              </h3>
              {teamSquad && teamSquad.length > 0 ? (
                <div className="overflow-x-auto bg-slate-900/50 rounded-3xl border border-slate-800 p-2 shadow-inner">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-800/80 bg-slate-900/50">
                        <th className="py-5 pl-6 font-normal rounded-tl-2xl">
                          Player
                        </th>
                        <th className="py-5 font-normal">Nationality</th>
                        <th className="py-5 font-normal text-center">
                          Position
                        </th>
                        <th className="py-5 pr-6 font-normal text-right rounded-tr-2xl">
                          Age
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {teamSquad.map((player: any) => (
                        <tr
                          key={player.id}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          <td className="py-4 pl-6 font-bold text-slate-200 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-sm font-black overflow-hidden shrink-0 border border-slate-700 group-hover:border-blue-500 transition-colors">
                              {player.photo_url ? (
                                <img
                                  src={player.photo_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                player.name.charAt(0)
                              )}
                            </div>
                            <span className="truncate max-w-[150px] sm:max-w-[250px] text-sm md:text-base group-hover:text-blue-400 transition-colors">
                              {player.name}
                            </span>
                          </td>
                          <td className="py-4 text-slate-400 text-sm font-medium">
                            {player.country?.name || player.nationality || "-"}
                          </td>
                          <td className="py-4 text-center">
                            <span className="bg-slate-950 text-slate-300 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border border-slate-800/80 shadow-sm">
                              {player.position || "-"}
                            </span>
                          </td>
                          <td className="py-4 pr-6 text-right text-slate-400 font-bold">
                            {getAge(player.date_of_birth)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-500 italic bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center font-bold">
                  Δεν βρέθηκε ρόστερ.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* === ΒΟΗΘΗΤΙΚΑ COMPONENTS (Που είχα ξεχάσει!) === */

function TabButton({
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
      className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
        isActive
          ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border-b-2 border-blue-400"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-b-2 border-transparent"
      }`}
    >
      {label}
    </button>
  );
}

function StatsCategoryTabButton({
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

function StatLine({
  label,
  value,
  isCard,
}: {
  label: string;
  value: string | number;
  isCard?: "yellow" | "red";
}) {
  return (
    <div className="flex justify-between items-center py-5 px-8 border-b border-slate-800/80 last:border-0 hover:bg-white/[0.02] transition-colors group">
      <div className="flex items-center gap-3">
        {isCard === "yellow" && (
          <div className="w-3 h-4 bg-yellow-500 rounded-sm shadow-sm" />
        )}
        {isCard === "red" && (
          <div className="w-3 h-4 bg-red-500 rounded-sm shadow-sm" />
        )}
        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors">
          {label}
        </span>
      </div>
      <span className="text-white font-black text-lg">{value}</span>
    </div>
  );
}

function getStatCardColor(statKey: TeamStatKey) {
  if (statKey === "yellowcards" || statKey === "yellowcards_against") {
    return "yellow";
  }

  if (statKey === "redcards" || statKey === "redcards_against") {
    return "red";
  }

  return undefined;
}

function HeaderMetaLine({
  icon,
  value,
}: {
  icon: ReactNode;
  value: string | null | undefined;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 min-w-0" title={value}>
      <span className="shrink-0 text-blue-500">{icon}</span>
      <span className="truncate text-sm font-bold text-slate-300">{value}</span>
    </div>
  );
}
