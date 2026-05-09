import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Users, ChevronRight, Trophy, Building2, MapPin, Award } from "lucide-react";
import { useTeams } from "../hooks/useTeams";
import type { TeamListItem } from "../api/api";
import {
  getTeamCountry,
  getTeamLocation,
  getTeamStadium,
} from "../utils/teamDisplay";
import SegmentedTabs from "../components/ui/SegmentedTabs";
import { filterAndRankSearchResults } from "../utils/search";
import {
  PageHeader,
  PageShell,
  SearchInput,
  standingsTheme,
} from "../components/ui/design";

const ALL_TAB = "ALL";
const OTHER_TAB = "Other";

export default function Teams() {
  const { teams, isLoading } = useTeams();
  const [activeCountry, setActiveCountry] = useState(ALL_TAB);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");

  const countryTabs = useMemo(() => {
    const countries = new Set<string>();
    let hasOther = false;

    teams.forEach((team) => {
      const country = getTeamCountry(team);

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

  const countryFilteredTeams = useMemo(() => {
    if (activeCountry === ALL_TAB) {
      return teams;
    }

    if (activeCountry === OTHER_TAB) {
      return teams.filter((team) => !normalizeCountryForComparison(team));
    }

    const activeCountryValue = normalizeCountryValue(activeCountry);

    return teams.filter(
      (team) => normalizeCountryForComparison(team) === activeCountryValue,
    );
  }, [activeCountry, teams]);

  const filteredTeams = useMemo(
    () =>
      filterAndRankSearchResults(
        countryFilteredTeams,
        teamSearchQuery,
        getTeamSearchFields,
      ),
    [countryFilteredTeams, teamSearchQuery],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black italic uppercase tracking-widest animate-pulse">
        ΦΟΡΤΩΣΗ ΟΜΑΔΩΝ...
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Teams"
        subtitle="Professional Scouting Network"
        icon={Award}
      />

      <SearchInput
        value={teamSearchQuery}
        onChange={setTeamSearchQuery}
        placeholder="Search teams..."
      />

      <div className="mb-8">
        <SegmentedTabs
          items={countryTabs.map((country) => ({
            value: country,
            label: country,
          }))}
          value={activeCountry}
          onChange={setActiveCountry}
          className={standingsTheme.segmentedTabs}
          buttonClassName={standingsTheme.segmentedTabButton}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTeams.map((team) => (
          <Link
            key={team.id}
            to={`/team/${team.id}`}
            className="group flex flex-col justify-between rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-xl transition-all hover:border-blue-500 hover:bg-blue-500/[0.03]"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-slate-950/80 p-2 shadow-[0_10px_24px_rgba(2,6,23,0.35),0_0_18px_rgba(59,130,246,0.12)] ring-1 ring-slate-800/80">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="w-full h-full object-contain"
                  />
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

            <h2 className="mb-4 text-2xl leading-tight font-black tracking-tighter uppercase italic transition-colors group-hover:text-blue-400">
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

            <div className="mt-4 flex items-center text-xs font-black uppercase tracking-widest text-slate-500 transition-all group-hover:gap-3 group-hover:text-blue-500">
              View Profile <ChevronRight size={16} />
            </div>
          </Link>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className={`mt-10 ${standingsTheme.emptyPanel}`}>
          No teams found for this country.
        </div>
      )}
    </PageShell>
  );
}

function getTeamSearchFields(team: TeamListItem) {
  return [
    team.name,
    getTeamCountry(team),
    team.country,
    team.city,
    team.stadium,
    getTeamLocation(team),
    getTeamStadium(team),
    getVenueName(team.venue),
    getVenueCity(team.venue),
    team.badge_label,
  ];
}

function normalizeCountryForComparison(team: TeamListItem) {
  return normalizeCountryValue(getTeamCountry(team));
}

function normalizeCountryValue(value: string | null | undefined) {
  const country = value?.trim();
  return country ? country.toLocaleLowerCase() : null;
}

function getVenueName(venue: TeamListItem["venue"]) {
  if (typeof venue === "string") {
    return venue;
  }

  return venue?.name ?? null;
}

function getVenueCity(venue: TeamListItem["venue"]) {
  return typeof venue === "object" && venue ? venue.city ?? null : null;
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
