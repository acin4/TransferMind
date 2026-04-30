import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Users, ChevronRight, Trophy, Building2, MapPin } from "lucide-react";
import { useTeams } from "../hooks/useTeams";
import {
  getTeamLocation,
  getTeamStadium,
  normalizeCountry,
} from "../utils/teamDisplay";
import SegmentedTabs from "../components/ui/SegmentedTabs";

const ALL_TAB = "ALL";
const OTHER_TAB = "Other";

export default function Teams() {
  const { teams, isLoading } = useTeams();
  const [activeCountry, setActiveCountry] = useState(ALL_TAB);

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

  if (isLoading) {
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
          <SegmentedTabs
            items={countryTabs.map((country) => ({
              value: country,
              label: country,
            }))}
            value={activeCountry}
            onChange={setActiveCountry}
            className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max overflow-x-auto"
            buttonClassName="px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTeams.map((team) => (
            <Link 
              key={team.id} 
              to={`/team/${team.id}`}
              className="flex flex-col justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-blue-500 hover:bg-slate-800/50 transition-all group shadow-xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-slate-950/80 p-2 shadow-[0_10px_24px_rgba(2,6,23,0.35),0_0_18px_rgba(59,130,246,0.12)] ring-1 ring-slate-800/80">
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
