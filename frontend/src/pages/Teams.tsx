import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTeams, getCurrentTournaments, getStandings } from "../api/api";
import { Users, ChevronRight, Trophy } from "lucide-react";

export default function Teams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamsAndLeagues = async () => {
      try {
        const fetchedTeams = await getTeams();
        
        // Φέρνουμε τα πρωταθλήματα για να ξέρουμε ποια ομάδα παίζει πού
        const tournaments = await getCurrentTournaments();
        let leagueMap: Record<string, string> = {};

        if (tournaments && tournaments.length > 0) {
          const standingsPromises = tournaments.map((t: any) => 
            getStandings(t.tournament_id, t.season_id)
          );
          const allStandings = await Promise.all(standingsPromises);
          
          allStandings.forEach((standingsArray, index) => {
            standingsArray?.forEach((row: any) => {
              if (row.team_id) {
                leagueMap[row.team_id] = tournaments[index].season_name;
              }
            });
          });
        }

        // Ενώνουμε τα δεδομένα
        const teamsWithLeagues = (fetchedTeams || []).map((team: any) => ({
          ...team,
          leagueName: leagueMap[team.id] || "Professional League"
        }));

        setTeams(teamsWithLeagues);
      } catch (error) {
        console.error("Σφάλμα κατά τη φόρτωση λίστας ομάδων:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamsAndLeagues();
  }, []);

  if (loading) {
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teams.map((team) => (
            // 🟢 ΕΔΩ Η ΑΛΛΑΓΗ: Είναι Link πλέον και σε πάει στο /team/:id
            <Link 
              key={team.id} 
              to={`/team/${team.id}`}
              className="flex flex-col justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-blue-500 hover:bg-slate-800/50 transition-all group shadow-xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="bg-white p-2 rounded-xl border border-slate-800 w-12 h-12 flex items-center justify-center">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
                  ) : (
                    <Users className="text-slate-400" size={20} />
                  )}
                </div>
                
                <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 font-black uppercase tracking-widest flex items-center gap-1">
                  <Trophy size={10} />
                  {team.leagueName}
                </span>
              </div>
              
              <h2 className="text-2xl font-black uppercase italic mb-4 group-hover:text-blue-400 transition-colors leading-tight">
                {team.name}
              </h2>
              
              <div className="mt-4 flex items-center text-slate-500 text-xs font-black uppercase tracking-widest group-hover:gap-3 group-hover:text-blue-500 transition-all">
                View Profile <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}