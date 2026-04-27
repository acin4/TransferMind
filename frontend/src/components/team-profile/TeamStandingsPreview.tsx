import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import type { TeamStandingRow } from "../../api/api";

type TeamStandingsPreviewProps = {
  seasonLoading: boolean;
  standingsLabel: string;
  teamId: string | undefined;
  teamStanding: TeamStandingRow | null;
  miniStandings: TeamStandingRow[];
  fullStandingsPath: string;
};

export default function TeamStandingsPreview({
  seasonLoading,
  standingsLabel,
  teamId,
  teamStanding,
  miniStandings,
  fullStandingsPath,
}: TeamStandingsPreviewProps) {
  return (
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
              {miniStandings.map((row) => {
                const isCurrentTeam = String(row.team_id) === String(teamId);
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
              to={fullStandingsPath}
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
  );
}
