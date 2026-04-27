import type { ChangeEvent, ReactNode } from "react";
import {
  Building2,
  Calendar,
  ChevronRight,
  MapPin,
  Shield,
  Trophy,
} from "lucide-react";
import type { TeamProfileData, TeamProfileSeason } from "../../api/api";

type TeamHeaderProps = {
  team: TeamProfileData;
  headerSubtitle: string;
  availableSeasons: TeamProfileSeason[];
  selectedSeasonId: number | null;
  onSeasonChange: (event: ChangeEvent<HTMLSelectElement>) => void;
};

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

export default function TeamHeader({
  team,
  headerSubtitle,
  availableSeasons,
  selectedSeasonId,
  onSeasonChange,
}: TeamHeaderProps) {
  return (
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
          onChange={onSeasonChange}
          disabled={availableSeasons.length === 0}
        >
          {availableSeasons.length === 0 ? (
            <option value="">No Seasons</option>
          ) : (
            availableSeasons.map((season) => (
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
  );
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
