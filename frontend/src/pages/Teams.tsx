import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getTeams, type TeamListItem } from "../api/api";
import { Users, ChevronRight, Trophy, Building2, MapPin } from "lucide-react";

const ALL_TAB = "ALL";
const OTHER_TAB = "Other";

function normalizeCountry(value: unknown) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function getTeamLocation(team: TeamListItem) {
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

function getTeamStadium(team: TeamListItem) {
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

export default function Teams() {
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCountry, setActiveCountry] = useState(ALL_TAB);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const fetchedTeams = await getTeams();

        setTeams(fetchedTeams || []);
      } catch (error) {
        console.error("Σφάλμα κατά τη φόρτωση λίστας ομάδων:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const countryTabs = useMemo(() => {
    const countries = new Set<string>();
    let hasOther = false;

    teams.forEach((team) => {
      const country = normalizeCountry(team.country);

      if (country) {
        countries.add(country);
      } else {
        hasOther = true;
      }
    });

    const orderedCountries = Array.from(countries).sort((a, b) =>
      a.localeCompare(b),
    );

    return [
      ALL_TAB,
      ...orderedCountries,
      ...(hasOther ? [OTHER_TAB] : []),
    ];
  }, [teams]);

  useEffect(() => {
    if (!countryTabs.includes(activeCountry)) {
      setActiveCountry(ALL_TAB);
    }
  }, [activeCountry, countryTabs]);

  const filteredTeams = useMemo(() => {
    if (activeCountry === ALL_TAB) {
      return teams;
    }

    if (activeCountry === OTHER_TAB) {
      return teams.filter((team) => !normalizeCountry(team.country));
    }

    return teams.filter(
      (team) => normalizeCountry(team.country) === activeCountry,
    );
  }, [activeCountry, teams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-bold tracking-widest animate-pulse">
        ΦΟΡΤΩΣΗ ΟΜΑΔΩΝ...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-white font-sans">
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
        <h1 className="text-4xl font-black uppercase mb-10 text-white tracking-tight">
          Teams
        </h1>

        <div className="mb-8">
          <div className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max overflow-x-auto">
            {countryTabs.map((country) => (
              <CountryTabButton
                key={country}
                label={country}
                isActive={activeCountry === country}
                onClick={() => setActiveCountry(country)}
              />
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTeams.map((team) => (
            <Link 
              key={team.id} 
              to={`/team/${team.id}`}
              className="flex flex-col justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-blue-500 hover:bg-slate-800/50 transition-all group shadow-xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="bg-white p-2 rounded-xl border border-slate-800 w-12 h-12 flex items-center justify-center">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
                  ) : (
                    <Users className="text-slate-400" size={20} />
                  )}
                </div>
                
                {team.badge_label ? (
                  <span
                    className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest flex items-center gap-1 border ${
                      team.badge_is_current
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        : "bg-slate-800/80 border-slate-700 text-slate-300"
                    }`}
                  >
                    <Trophy size={10} />
                    {team.badge_label}
                  </span>
                ) : null}
              </div>
              
              <h2 className="text-2xl font-black uppercase italic mb-4 group-hover:text-blue-400 transition-colors leading-tight">
                {team.name}
              </h2>

              <div className="space-y-2 min-h-[48px]">
                <TeamMetaLine
                  icon={<MapPin size={14} />}
                  value={getTeamLocation(team)}
                />
                <TeamMetaLine
                  icon={<Building2 size={14} />}
                  value={getTeamStadium(team)}
                />
              </div>
              
              <div className="mt-4 flex items-center text-slate-500 text-xs font-black uppercase tracking-widest group-hover:gap-3 group-hover:text-blue-500 transition-all">
                View Profile <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>

        {filteredTeams.length === 0 && (
          <div className="mt-10 text-center p-16 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] font-black uppercase tracking-widest text-slate-500">
            No teams found for this country.
          </div>
        )}
      </div>
    </div>
  );
}

function TeamMetaLine({
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
    <div className="flex items-center gap-2 min-w-0 text-sm">
      <span className="shrink-0 text-blue-500">{icon}</span>
      <span className="truncate text-slate-300 font-medium" title={value}>
        {value}
      </span>
    </div>
  );
}

function CountryTabButton({
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
