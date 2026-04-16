import { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // Προστέθηκε για το ChevronRight Link
import { getCurrentTournaments, getStandings } from "../api/api";
// Προστέθηκαν όλα τα εικονίδια που έλειπαν
import { Trophy, Hash, ChevronRight, Loader2, Award } from "lucide-react";

export default function Standings() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ΒΗΜΑ 1: Φέρνουμε τα πρωταθλήματα
  useEffect(() => {
    const init = async () => {
      const leagues = await getCurrentTournaments();
      setTournaments(leagues);
      if (leagues.length > 0) {
        setSelectedTournament(leagues[0]);
      }
    };
    init();
  }, []);

// ΒΗΜΑ 2: Φέρνουμε τη βαθμολογία
  useEffect(() => {
    if (selectedTournament) {
      setLoading(true);
      // 🟢 Η ΛΥΣΗ: Στέλνουμε τα API IDs (π.χ. 185) και ΟΧΙ τα εσωτερικά IDs (π.χ. 7)
      getStandings(selectedTournament.tournament_api_id, selectedTournament.season_api_id)
        .then(data => {
          setStandings(data);
          setLoading(false);
        });
    }
  }, [selectedTournament]);

  if (!selectedTournament) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black gap-2">
        <Loader2 className="animate-spin" /> <span className="italic uppercase">Initializing...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-white font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER & ICON (Χρήση του Award) */}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
          <div>
            <h1 className="text-6xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-white via-blue-400 to-blue-600 bg-clip-text text-transparent leading-none">
              Standings
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4 flex items-center gap-2">
              <Award size={14} className="text-blue-500" /> Professional Scouting Network
            </p>
          </div>

          <select 
            className="bg-slate-900 border-2 border-slate-800 text-white px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest focus:outline-none focus:border-blue-500 transition-all cursor-pointer hover:bg-slate-800 shadow-xl"
            value={selectedTournament.tournament_id}
            onChange={(e) => {
              const found = tournaments.find(t => t.tournament_id === Number(e.target.value));
              setSelectedTournament(found);
            }}
          >
            {tournaments.map(t => (
              <option key={t.tournament_id} value={t.tournament_id}>
                {t.season_name}
              </option>
            ))}
          </select>
        </div>

        {/* TABLE SECTION */}
        {loading ? (
           <div className="text-center p-20 opacity-50 italic animate-pulse font-black uppercase tracking-widest">
             Updating {selectedTournament.season_name}...
           </div>
        ) : (

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-[0.25em]">
                    <th className="px-8 py-6 text-center"><Hash size={14} /></th>
                    <th className="px-8 py-6">Club</th>
                    <th className="px-4 py-6 text-center">MP</th>
                    <th className="px-4 py-6 text-center text-blue-400 font-bold italic">Pts</th>
                    <th className="px-8 py-6 text-right">Analysis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {standings.map((row, index) => (
                    <tr key={row.id || row.team_id} className="hover:bg-blue-500/[0.03] transition-all group">
                      <td className="px-8 py-5 text-center">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-sm ${index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' : 'text-slate-600'}`}>
                          {row.position}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <span className="font-black text-xl tracking-tighter uppercase italic group-hover:text-blue-400 transition-colors">
                            {/* Χρήση team_name για να μη χτυπάει το TypeScript */}
                            {row.team_name || row.teams?.name || "Unknown Team"}
                          </span>
                          {index === 0 && <Trophy size={18} className="text-yellow-500 animate-pulse" />}
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center font-bold text-slate-500">
                        {row.matches || 0}
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span className="text-2xl font-black text-blue-400">{row.points}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <Link 
                          to={`/team/${row.team_id}`} 
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-800 text-slate-600 group-hover:border-blue-500 group-hover:text-blue-400 transition-all hover:bg-blue-500 hover:text-white"
                        >
                          <ChevronRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}