import { Calendar, ChevronRight, Shield } from "lucide-react";
import { standingsTheme } from "../ui/design";
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
        <div className={standingsTheme.selectIcon}>
          <Shield size={18} />
        </div>
        <select
          className={`${standingsTheme.select} sm:w-[240px]`}
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
        <div className={standingsTheme.selectChevron}>
          <ChevronRight size={16} className="rotate-90" />
        </div>
      </div>

      <div className="relative w-full sm:w-auto group">
        <div className={standingsTheme.selectIcon}>
          <Calendar size={18} />
        </div>
        <select
          className={`${standingsTheme.select} sm:w-[200px]`}
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
        <div className={standingsTheme.selectChevron}>
          <ChevronRight size={16} className="rotate-90" />
        </div>
      </div>
    </div>
  );
}
