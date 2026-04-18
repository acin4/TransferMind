import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getCurrentTournaments, getStandings } from "../api/api";
import { Trophy, Hash, ChevronRight, Loader2, Award, Calendar, Shield } from "lucide-react";

export default function Standings() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  // 1. Φόρτωση Λίστας Πρωταθλημάτων & Σεζόν από το Backend
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const data = await getCurrentTournaments();
        
        if (data && data.length > 0) {
          setTournaments(data);
          // Διαλέγουμε το 1ο πρωτάθλημα και την 1η του σεζόν ως αρχική επιλογή
          setSelectedLeagueId(data[0].tournament_id);
          setSelectedSeasonId(data[0].season_id);
          setError(null);
        } else {
          setTournaments([]);
          setError("Δεν βρέθηκαν διαθέσιμες διοργανώσεις.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Σφάλμα φόρτωσης διοργανώσεων:", err);
        setTournaments([]);
        setError("Αδυναμία φόρτωσης διοργανώσεων από τον server.");
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  // 2. Φόρτωση Βαθμολογίας όταν αλλάζει η Λίγκα ή η Σεζόν
  useEffect(() => {
    if (selectedLeagueId && selectedSeasonId) {
      setLoading(true);
      getStandings(selectedLeagueId, selectedSeasonId)
        .then((data) => {
          setStandings(data || []);
          setError(null);
        })
        .catch((err) => {
          console.error("Σφάλμα φόρτωσης βαθμολογίας:", err);
          setStandings([]);
          setError("Αδυναμία φόρτωσης της βαθμολογίας.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [selectedLeagueId, selectedSeasonId]);

  // 3. Δυναμικά Φίλτρα (Dropdowns) με βάση τα δεδομένα
  const { uniqueLeagues, availableSeasons } = useMemo(() => {
    if (!tournaments || tournaments.length === 0) {
      return { uniqueLeagues: [], availableSeasons: [] };
    }

    // Βρίσκουμε τα μοναδικά Πρωταθλήματα
    const leagueMap = new Map();
    tournaments.forEach(t => {
      if (!leagueMap.has(t.tournament_id)) {
        leagueMap.set(t.tournament_id, {
          id: t.tournament_id,
          name: t.tournament_name || `Tournament ${t.tournament_id}` 
          // (Αν το backend επιστρέφει το όνομα αλλιώς, άλλαξε το t.tournament_name στο σωστό)
        });
      }
    });

    const leagues = Array.from(leagueMap.values());
    const seasons = tournaments.filter(t => t.tournament_id === selectedLeagueId);

    return { uniqueLeagues: leagues, availableSeasons: seasons };
  }, [tournaments, selectedLeagueId]);

  // Handle αλλαγής Πρωταθλήματος
  const handleLeagueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLeagueId = Number(e.target.value);
    setSelectedLeagueId(newLeagueId);
    
    // Όταν ο χρήστης αλλάζει λίγκα, βάζουμε αυτόματα την 1η διαθέσιμη σεζόν αυτής της νέας λίγκας!
    const seasonsForNewLeague = tournaments.filter(t => t.tournament_id === newLeagueId);
    if (seasonsForNewLeague.length > 0) {
      setSelectedSeasonId(seasonsForNewLeague[0].season_id);
    }
  };

  // Handle αλλαγής Σεζόν
  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeasonId(Number(e.target.value));
  };


  if (!selectedLeagueId || !selectedSeasonId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black gap-2">
        {error ? (
          <span className="italic uppercase text-rose-400">{error}</span>
        ) : (
          <>
            <Loader2 className="animate-spin" /> <span className="italic uppercase">Initializing Data...</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-white font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER & ΤΑ 2 DROPDOWNS */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-8">
          
          <div>
            <h1 className="text-6xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-white via-blue-400 to-blue-600 bg-clip-text text-transparent leading-none">
              Standings
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4 flex items-center gap-2">
              <Award size={14} className="text-blue-500" /> Professional Scouting Network
            </p>
          </div>

          {/* ΤΑ ΦΙΛΤΡΑ (DROPDOWNS) */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto animate-in fade-in slide-in-from-right-8 duration-700">
            
            {/* 🟢 DROPDOWN 1: LEAGUE */}
            <div className="relative w-full sm:w-auto group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none group-hover:text-white transition-colors">
                <Shield size={18} />
              </div>
              <select 
                className="w-full sm:w-[240px] appearance-none bg-slate-900 border-2 border-slate-800 text-white pl-12 pr-10 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest focus:outline-none focus:border-blue-500 transition-all cursor-pointer hover:bg-slate-800 shadow-xl truncate"
                value={selectedLeagueId}
                onChange={handleLeagueChange}
              >
                {uniqueLeagues.map(league => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>

            {/* 🟢 DROPDOWN 2: SEASON */}
            <div className="relative w-full sm:w-auto group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none group-hover:text-white transition-colors">
                <Calendar size={18} />
              </div>
              <select 
                className="w-full sm:w-[200px] appearance-none bg-slate-900 border-2 border-slate-800 text-white pl-12 pr-10 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest focus:outline-none focus:border-emerald-500 transition-all cursor-pointer hover:bg-slate-800 shadow-xl disabled:opacity-50 truncate"
                value={selectedSeasonId}
                onChange={handleSeasonChange}
                disabled={availableSeasons.length === 0}
              >
                {availableSeasons.map(season => (
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
        </div>

        {/* TABLE SECTION */}
        {loading ? (
           <div className="text-center p-32 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] italic animate-pulse font-black uppercase tracking-widest text-blue-500 flex flex-col items-center gap-4">
             <Loader2 className="animate-spin" size={40} />
             Loading Standings...
           </div>
        ) : error ? (
          <div className="text-center p-20 bg-rose-500/10 border border-rose-500/20 rounded-[3rem] text-rose-400 font-black uppercase tracking-widest">
            {error}
          </div>
        ) : (

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-sm transition-colors ${index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' : index < 3 ? 'bg-slate-800 text-slate-300' : 'text-slate-600'}`}>
                          {row.position}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <span className="font-black text-xl tracking-tighter uppercase italic group-hover:text-blue-400 transition-colors">
                            {row.team_name || "Unknown Team"}
                          </span>
                          {index === 0 && <Trophy size={18} className="text-yellow-500 animate-pulse" />}
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center font-bold text-slate-500">
                        {row.matches || 0}
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span className="text-2xl font-black text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                          {row.points}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {row.team_id ? (
                          <Link 
                            to={`/team/${row.team_id}`} 
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-800 text-slate-600 group-hover:border-blue-500 group-hover:text-blue-400 transition-all hover:bg-blue-500 hover:text-white hover:scale-110"
                          >
                            <ChevronRight size={18} />
                          </Link>
                        ) : (
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-800 text-slate-700">
                            <ChevronRight size={18} />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {standings.length === 0 && (
                <div className="p-32 text-center flex flex-col items-center gap-4">
                  <Shield size={48} className="text-slate-800 mb-4" />
                  <span className="text-slate-500 font-bold italic uppercase tracking-widest text-lg">Δεν υπαρχουν δεδομενα βαθμολογιας.</span>
                  <span className="text-slate-600 text-sm">Επίλεξε διαφορετικό Πρωτάθλημα ή Σεζόν από το μενού.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}