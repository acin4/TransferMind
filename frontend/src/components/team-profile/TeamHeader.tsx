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
import { getTeamLocation, getTeamStadium } from "../../utils/teamDisplay";

type TeamHeaderProps = {
  team: TeamProfileData;
  headerSubtitle: string;
  availableSeasons: TeamProfileSeason[];
  selectedSeasonId: number | null;
  onSeasonChange: (event: ChangeEvent<HTMLSelectElement>) => void;
};

export default function TeamHeader({
  team,
  headerSubtitle,
  availableSeasons,
  selectedSeasonId,
  onSeasonChange,
}: TeamHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10 pb-8 border-b border-slate-800">
      <div className="flex items-center gap-7">
        <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-[2rem] border border-slate-700/80 bg-slate-950 p-3 shadow-[0_22px_48px_rgba(2,6,23,0.55),0_0_28px_rgba(59,130,246,0.14)] ring-1 ring-slate-900/80 md:h-40 md:w-40">
          {team.logo_url ? (
            <img
              src={team.logo_url}
              alt={team.name}
              className="h-full w-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)]"
            />
          ) : (
            <Shield className="text-slate-400" size={52} />
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
