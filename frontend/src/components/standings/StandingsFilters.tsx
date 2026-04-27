import { Calendar, ChevronRight, Shield } from "lucide-react";
import type { SeasonOption, TournamentOption } from "./types";

type StandingsFiltersProps = {
  tournaments: TournamentOption[];
  seasons: SeasonOption[];
  selectedTournamentId: number | null;
  selectedSeasonId: number | null;
  onTournamentChange: (tournamentId: number | null) => void;
  onSeasonChange: (seasonId: number | null) => void;
};

export default function StandingsFilters({
  tournaments,
  seasons,
  selectedTournamentId,
  selectedSeasonId,
  onTournamentChange,
  onSeasonChange,
}: StandingsFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="relative w-full sm:w-auto group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none group-hover:text-white transition-colors">
          <Shield size={18} />
        </div>
        <select
          className="w-full sm:w-[240px] appearance-none bg-slate-900 border-2 border-slate-800 text-white pl-12 pr-10 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest focus:outline-none focus:border-blue-500 transition-all cursor-pointer hover:bg-slate-800 shadow-xl truncate"
          value={selectedTournamentId ?? ""}
          onChange={(event) =>
            onTournamentChange(
              event.target.value ? Number(event.target.value) : null,
            )
          }
        >
          {tournaments.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors">
          <ChevronRight size={16} className="rotate-90" />
        </div>
      </div>

      <div className="relative w-full sm:w-auto group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none group-hover:text-white transition-colors">
          <Calendar size={18} />
        </div>
        <select
          className="w-full sm:w-[200px] appearance-none bg-slate-900 border-2 border-slate-800 text-white pl-12 pr-10 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest focus:outline-none focus:border-emerald-500 transition-all cursor-pointer hover:bg-slate-800 shadow-xl disabled:opacity-50 truncate"
          value={selectedSeasonId ?? ""}
          onChange={(event) =>
            onSeasonChange(event.target.value ? Number(event.target.value) : null)
          }
          disabled={seasons.length === 0}
        >
          {seasons.map((season) => (
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
  );
}
