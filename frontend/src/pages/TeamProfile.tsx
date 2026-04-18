import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTeam, getTeamStats, getPlayers, getCurrentTournaments, getStandings } from "../api/api";
import { ArrowLeft, Trophy, Shield } from "lucide-react";

export default function TeamProfile() {
  const { id } = useParams();
  
  const [team, setTeam] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [teamSquad, setTeamSquad] = useState<any[]>([]);
  
  const [teamStanding, setTeamStanding] = useState<any>(null);
  const [miniStandings, setMiniStandings] = useState<any[]>([]); 
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'standings' | 'statistics' | 'squad'>('statistics');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;

        const [fetchedTeam, fetchedStats, fetchedPlayers, tournaments] = await Promise.all([
          getTeam(id),
          getTeamStats(id),
          getPlayers(id),
          getCurrentTournaments()
        ]);

        setTeam(fetchedTeam);
        setStats(fetchedStats || null);
        setTeamSquad(fetchedPlayers || []);

        let foundStanding = null;
        let nearbyTeams: any[] = [];

        if (tournaments && tournaments.length > 0) {
          const standingsPromises = tournaments.map((t: any) => 
            getStandings(t.tournament_id, t.season_id)
          );
          const allStandings = await Promise.all(standingsPromises);

          allStandings.forEach((standingsArray, index) => {
            const teamIndex = standingsArray?.findIndex((row: any) => String(row.team_id) === String(id));
            
            if (teamIndex !== -1 && teamIndex !== undefined) {
              const teamPos = standingsArray[teamIndex];
              foundStanding = {
                ...teamPos,
                leagueName: tournaments[index].season_name
              };

              let startIdx = Math.max(0, teamIndex - 1);
              let endIdx = Math.min(standingsArray.length, startIdx + 4);
              
              if (endIdx - startIdx < 4) {
                  startIdx = Math.max(0, endIdx - 4);
              }

              nearbyTeams = standingsArray.slice(startIdx, endIdx);
            }
          });
        }
        
        setTeamStanding(foundStanding);
        setMiniStandings(nearbyTeams);

      } catch (err) {
        console.error("Σφάλμα κατά τη φόρτωση του Profile:", err);
        setError("Δεν βρέθηκαν δεδομένα για αυτή την ομάδα.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const getAge = (dobString: string) => {
    if (!dobString) return "-";
    const dob = new Date(dobString);
    const diff = Date.now() - dob.getTime();
    return new Date(diff).getUTCFullYear() - 1970;
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-widest">Loading Profile...</div>;
  if (error || !team) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold uppercase tracking-widest text-rose-500">{error || "Team not found"}</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-white font-sans">
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <Link 
          to="/teams"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors font-bold uppercase text-xs tracking-widest"
        >
          <ArrowLeft size={16} /> Back to Teams
        </Link>

        <div className="flex items-center gap-6 mb-10 pb-8 border-b border-slate-800">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center border-4 border-slate-900 shadow-2xl p-3 overflow-hidden">
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
            ) : (
              <Shield className="text-slate-400" size={40} />
            )}
          </div>
          <div>
            <h1 className="text-5xl font-black uppercase text-white tracking-tight italic">
              {team.name}
            </h1>
            {teamStanding ? (
              <p className="text-blue-400 text-sm font-black mt-2 uppercase tracking-widest flex items-center gap-2">
                <Trophy size={14} className="text-blue-500" />
                {teamStanding.leagueName}
              </p>
            ) : (
              <p className="text-slate-500 text-sm font-bold mt-2 uppercase tracking-widest">
                {team.city || "Professional Club"}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max">
          <TabButton label="Standings" isActive={activeTab === 'standings'} onClick={() => setActiveTab('standings')} />
          <TabButton label="Statistics" isActive={activeTab === 'statistics'} onClick={() => setActiveTab('statistics')} />
          <TabButton label="Squad" isActive={activeTab === 'squad'} onClick={() => setActiveTab('squad')} />
        </div>

        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 p-6 md:p-10 shadow-2xl backdrop-blur-sm">
          
          {activeTab === 'standings' && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                <Trophy size={16} className="text-blue-500" /> 
                {teamStanding ? teamStanding.leagueName : "League Position"}
              </h3>
              
              {teamStanding && miniStandings.length > 0 ? (
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
                      {miniStandings.map((row: any) => {
                        const isCurrentTeam = String(row.team_id) === String(id);
                        return (
                          <tr 
                            key={row.team_id} 
                            className={`transition-colors ${isCurrentTeam ? 'bg-blue-600/10' : 'hover:bg-slate-800/40'}`}
                          >
                            <td className="py-4 pl-6 text-center">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black mx-auto ${isCurrentTeam ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>
                                {row.position}
                              </span>
                            </td>
                            <td className={`py-4 pl-4 font-bold ${isCurrentTeam ? 'text-blue-400' : 'text-slate-300'}`}>
                              {row.team_name || "Unknown"}
                            </td>
                            <td className="py-4 text-center text-slate-400 text-sm">{row.matches || 0}</td>
                            <td className="py-4 text-center text-slate-400 text-sm">{row.wins || 0}</td>
                            <td className="py-4 text-center text-slate-400 text-sm">{row.draws || 0}</td>
                            <td className="py-4 text-center text-slate-400 text-sm">{row.losses || 0}</td>
                            <td className={`py-4 pr-6 text-right font-black ${isCurrentTeam ? 'text-white' : 'text-slate-300'}`}>
                              {row.points || 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="bg-slate-900/80 border-t border-slate-800 p-4 text-center">
                     <Link to="/standings" className="text-[10px] font-black uppercase text-blue-500 tracking-widest hover:text-blue-400 transition-colors">
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
          )}

          {activeTab === 'statistics' && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">Season Statistics</h3>
              {stats ? (
                <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-inner">
                  <StatLine label="Matches Played" value={stats.matches || 0} />
                  <StatLine label="Goals Scored" value={stats.goals_scored || 0} />
                  <StatLine label="Goals Conceded" value={stats.goals_conceded || 0} />
                  <StatLine label="Total Assists" value={stats.assists || 0} />
                  <StatLine label="Clean Sheets" value={stats.cleansheats || 0} />
                  <StatLine label="Yellow Cards" value={stats.yellowcards || 0} isCard="yellow" />
                  <StatLine label="Red Cards" value={stats.redcards || 0} isCard="red" />
                </div>
              ) : (
                <p className="text-slate-500 italic bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center font-bold">
                  Δεν βρέθηκαν στατιστικά για αυτή την ομάδα.
                </p>
              )}
            </div>
          )}

          {activeTab === 'squad' && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">Current Squad</h3>
              {teamSquad && teamSquad.length > 0 ? (
                <div className="overflow-x-auto bg-slate-900/50 rounded-3xl border border-slate-800 p-2 shadow-inner">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-800/80 bg-slate-900/50">
                        <th className="py-5 pl-6 font-normal rounded-tl-2xl">Player</th>
                        <th className="py-5 font-normal">Nationality</th>
                        <th className="py-5 font-normal text-center">Position</th>
                        <th className="py-5 pr-6 font-normal text-right rounded-tr-2xl">Age</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {teamSquad.map((player: any) => (
                        <tr key={player.id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="py-4 pl-6 font-bold text-slate-200 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-sm font-black overflow-hidden shrink-0 border border-slate-700 group-hover:border-blue-500 transition-colors">
                              {player.photo_url ? (
                                <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                player.name.charAt(0)
                              )}
                            </div>
                            <span className="truncate max-w-[150px] sm:max-w-[250px] text-sm md:text-base group-hover:text-blue-400 transition-colors">{player.name}</span>
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
                            {getAge(player.date_of_birth)}
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
          )}

        </div>
      </div>
    </div>
  );
}

/* === ΒΟΗΘΗΤΙΚΑ COMPONENTS (Που είχα ξεχάσει!) === */

function TabButton({ label, isActive, onClick }: { label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
        isActive 
          ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border-b-2 border-blue-400' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-b-2 border-transparent'
      }`}
    >
      {label}
    </button>
  );
}

function StatLine({ label, value, isCard }: { label: string, value: string | number, isCard?: 'yellow' | 'red' }) {
  return (
    <div className="flex justify-between items-center py-5 px-8 border-b border-slate-800/80 last:border-0 hover:bg-white/[0.02] transition-colors group">
      <div className="flex items-center gap-3">
        {isCard === 'yellow' && <div className="w-3 h-4 bg-yellow-500 rounded-sm shadow-sm" />}
        {isCard === 'red' && <div className="w-3 h-4 bg-red-500 rounded-sm shadow-sm" />}
        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors">{label}</span>
      </div>
      <span className="text-white font-black text-lg">{value}</span>
    </div>
  );
}