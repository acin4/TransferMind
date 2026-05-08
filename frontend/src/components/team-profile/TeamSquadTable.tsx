import type { TeamProfilePlayer } from "../../api/api";
import { formatAgeFromBirthDate } from "../../utils/dateFormat";

type TeamSquadTableProps = {
  squad: TeamProfilePlayer[];
};

export default function TeamSquadTable({ squad }: TeamSquadTableProps) {
  return (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">
        Current Squad
      </h3>
      {squad && squad.length > 0 ? (
        <div className="overflow-x-auto bg-slate-900/50 rounded-3xl border border-slate-800 p-2 shadow-inner">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-800/80 bg-slate-900/50">
                <th className="py-5 pl-6 font-normal rounded-tl-2xl">
                  Player
                </th>
                <th className="py-5 font-normal">Nationality</th>
                <th className="py-5 font-normal text-center">Position</th>
                <th className="py-5 pr-6 font-normal text-right rounded-tr-2xl">
                  Age
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {squad.map((player) => (
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
                    {formatAgeFromBirthDate(player.date_of_birth)}
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
  );
}
