import { Link } from "react-router-dom";
import { Shield, Trophy } from "lucide-react";
import type { TeamStandingRow } from "../../api/api";

type StandingsTableProps = {
  rows: TeamStandingRow[];
};

export default function StandingsTable({ rows }: StandingsTableProps) {
  return (
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
          {rows.map((row, index) => (
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
                    <TeamLogoMark
                      logoUrl={row.team_logo}
                      teamName={row.team_name}
                    />
                    <TeamNameWithLeaderIcon row={row} isLeader={index === 0} />
                  </Link>
                ) : (
                  <div className="flex items-center gap-4">
                    <TeamLogoMark
                      logoUrl={row.team_logo}
                      teamName={row.team_name}
                    />
                    <TeamNameWithLeaderIcon row={row} isLeader={index === 0} />
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
      {rows.length === 0 && (
        <div className="p-32 text-center flex flex-col items-center gap-4">
          <Shield size={48} className="text-slate-800 mb-4" />
          <span className="text-slate-500 font-bold italic uppercase tracking-widest text-lg">
            Δεν υπάρχουν δεδομένα βαθμολογίας.
          </span>
          <span className="text-slate-600 text-sm">
            Επίλεξε διαφορετικό Πρωτάθλημα ή Σεζόν από το μενού.
          </span>
        </div>
      )}
    </div>
  );
}

function TeamLogoMark({
  logoUrl,
  teamName,
}: {
  logoUrl?: string | null;
  teamName?: string | null;
}) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/80 p-2 shadow-[0_10px_24px_rgba(2,6,23,0.35)]">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={teamName ? `${teamName} logo` : "Team logo"}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      ) : (
        <Shield size={20} className="text-slate-600" />
      )}
    </span>
  );
}

function TeamNameWithLeaderIcon({
  row,
  isLeader,
}: {
  row: TeamStandingRow;
  isLeader: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="truncate font-black text-xl tracking-tighter uppercase italic group-hover:text-blue-400 transition-colors">
        {row.team_name || "Unknown Team"}
      </span>
      {isLeader && (
        <Trophy size={18} className="shrink-0 text-yellow-500 animate-pulse" />
      )}
    </span>
  );
}
