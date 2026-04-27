import { useState, useEffect } from "react";
import { 
  Search, Trophy, User, Table2, Shield, Brain, 
  ChevronRight, Activity, X, LineChart, Database 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getSearchResults,
  type SearchPlayerResult,
  type SearchTeamResult,
} from "../api/api";

export default function Home() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<SearchPlayerResult[]>([]);
  const [teams, setTeams] = useState<SearchTeamResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 🟢 ΝΕΟ STATE ΓΙΑ ΤΟ POP-UP
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setPlayers([]);
      setTeams([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const fetchData = async () => {
      try {
        const results = await getSearchResults(trimmedQuery);

        if (!cancelled) {
          setPlayers(results?.players ?? []);
          setTeams(results?.teams ?? []);
          setError(null);
        }
      } catch (err) {
        console.error(err);
        if (cancelled) {
          return;
        }
        setPlayers([]);
        setTeams([]);
        setError("Αδυναμία φόρτωσης δεδομένων.");
      }
    };

    const timeoutId = window.setTimeout(fetchData, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 font-sans relative py-32 text-slate-100 overflow-x-hidden">
      
      {/* ΚΕΝΤΡΙΚΟΣ ΤΙΤΛΟΣ ΚΑΙ ΥΠΟΤΙΤΛΟΣ */}
      <div className="text-center mb-16 w-full max-w-4xl relative z-20">
        <h1 className="text-7xl md:text-8xl font-black mb-6 tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl italic uppercase">
          TransferMind
        </h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto uppercase tracking-widest">
          The Ultimate Professional Scouting & Analytics Network
        </p>
      </div>

      {/* SEARCH BAR ΚΟΝΤΕΙΝΕΡ */}
      <div className="w-full max-w-3xl relative z-30 flex flex-col items-center">
        <div className="relative w-full group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-[2.5rem] blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
          
          <div className="relative flex items-center w-full bg-slate-100 rounded-[2rem] p-2 shadow-2xl">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση ομάδας ή παίκτη..."
              className="w-full py-6 px-10 text-center text-xl md:text-2xl font-bold bg-transparent border-none focus:ring-0 outline-none text-slate-900 placeholder-slate-400"
            />
            <div className="absolute right-4 p-4 bg-blue-600 rounded-full text-white shadow-lg">
               <Search size={28} />
            </div>
          </div>
        </div>

        {/* RESULTS DROPDOWN */}
        {query && (
          <div className="absolute top-[110%] left-0 w-full mt-4 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-[2rem] shadow-2xl max-h-[400px] overflow-y-auto z-50 custom-scrollbar">
            {players.length === 0 && teams.length === 0 && (
              <div className="p-12 text-center text-slate-500 font-medium text-lg uppercase tracking-widest italic">
                Δεν βρέθηκαν αποτελέσματα για "{query}"
              </div>
            )}

            {teams.length > 0 && (
              <div className="p-6">
                <h3 className="text-xs font-black text-center text-slate-500 uppercase tracking-[0.3em] px-4 pb-4 pt-2">Ομαδες</h3>
                {teams.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/team/${t.id}`)}
                    className="flex items-center gap-5 p-4 rounded-2xl hover:bg-slate-800/80 cursor-pointer transition-all border border-transparent hover:border-slate-700 group"
                  >
                    <div className="bg-blue-500/10 p-3 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                      <Trophy size={24} />
                    </div>
                    <span className="font-black italic uppercase text-slate-200 text-xl group-hover:text-blue-400 transition-colors">{t.name}</span>
                  </div>
                ))}
              </div>
            )}

            {teams.length > 0 && players.length > 0 && (
              <div className="h-px bg-slate-800/50 mx-8 my-2"></div>
            )}

            {players.length > 0 && (
              <div className="p-6">
                <h3 className="text-xs font-black text-center text-slate-500 uppercase tracking-[0.3em] px-4 pb-4 pt-2">Παικτες</h3>
                {players.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/player/${p.id}`)}
                    className="flex items-center gap-5 p-4 rounded-2xl hover:bg-slate-800/80 cursor-pointer transition-all border border-transparent hover:border-slate-700 group"
                  >
                    <div className="bg-purple-500/10 p-3 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                      <User size={24} />
                    </div>
                    <span className="font-bold italic uppercase text-slate-300 text-xl group-hover:text-purple-400 transition-colors">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 text-center text-sm font-bold uppercase tracking-widest text-rose-400 relative z-30">
          {error}
        </div>
      )}

      {/* QUICK LINKS & ΕΠΕΞΗΓΗΣΗ ΠΛΑΤΦΟΡΜΑΣ */}
      <div className="w-full max-w-6xl mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        
        {/* CARD 1: STANDINGS */}
        <button 
          onClick={() => navigate('/standings')}
          className="text-left bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-8 rounded-[2.5rem] hover:bg-slate-800/50 hover:border-blue-500 hover:-translate-y-2 transition-all duration-300 group shadow-xl"
        >
          <div className="bg-blue-500/10 w-16 h-16 flex items-center justify-center rounded-2xl mb-8 group-hover:bg-blue-500 transition-colors duration-300">
            <Table2 size={28} className="text-blue-400 group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-2xl font-black italic uppercase text-slate-100 mb-4 flex items-center justify-between">
            Standings <ChevronRight size={20} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            Παρακολούθησε ζωντανά τη βαθμολογία, τους πόντους και την ακριβή κατάταξη των κορυφαίων συλλόγων.
          </p>
        </button>

        {/* CARD 2: TEAM ANALYTICS */}
        <button 
          onClick={() => navigate('/teams')}
          className="text-left bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-8 rounded-[2.5rem] hover:bg-slate-800/50 hover:border-purple-500 hover:-translate-y-2 transition-all duration-300 group shadow-xl"
        >
          <div className="bg-purple-500/10 w-16 h-16 flex items-center justify-center rounded-2xl mb-8 group-hover:bg-purple-500 transition-colors duration-300">
            <Shield size={28} className="text-purple-400 group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-2xl font-black italic uppercase text-slate-100 mb-4 flex items-center justify-between">
            Team Stats <ChevronRight size={20} className="text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            Βαθιά ανάλυση ομάδων. Εξερεύνησε επιθετικά στατιστικά, αμυντικές επιδόσεις και ποσοστά.
          </p>
        </button>

        {/* CARD 3: ABOUT (Πλέον είναι κουμπί που ανοίγει το Pop-Up) */}
        <button 
          onClick={() => setIsAboutOpen(true)}
          className="text-left bg-gradient-to-br from-slate-900/80 to-slate-900/20 backdrop-blur-sm border border-slate-800 p-8 rounded-[2.5rem] hover:border-emerald-500 hover:-translate-y-2 transition-all duration-300 shadow-xl relative overflow-hidden group"
        >
          <Brain size={120} className="absolute -right-8 -bottom-8 text-white/[0.03] rotate-12 group-hover:text-emerald-500/10 transition-colors duration-500" />
          
          <div className="bg-emerald-500/10 w-16 h-16 flex items-center justify-center rounded-2xl mb-8 relative z-10 group-hover:bg-emerald-500 transition-colors duration-300">
            <Activity size={28} className="text-emerald-400 group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-2xl font-black italic uppercase text-slate-100 mb-4 flex items-center justify-between relative z-10">
            Η Πλατφορμα <ChevronRight size={20} className="text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed relative z-10">
            Πάτησε εδώ για να ανακαλύψεις τις δυνατότητες του TransferMind και πώς λειτουργεί η ανάλυση δεδομένων μας.
          </p>
        </button>
      </div>

      {/* 🟢 ΤΟ POP-UP (MODAL) ΤΗΣ ΠΛΑΤΦΟΡΜΑΣ */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Σκοτεινό background - όταν πατάς έξω, κλείνει */}
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsAboutOpen(false)}
          ></div>
          
          {/* Το κυρίως παραθυράκι */}
          <div className="relative bg-slate-900 border border-slate-700 rounded-[3rem] p-8 md:p-12 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300">
            
            {/* Κουμπί κλεισίματος (X) */}
            <button 
              onClick={() => setIsAboutOpen(false)}
              className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-rose-500 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-3xl md:text-4xl font-black italic uppercase text-white mb-2">
              Τι ειναι το TransferMind;
            </h2>
            <p className="text-slate-400 mb-10 font-medium">
              Το απόλυτο εργαλείο στατιστικής ανάλυσης για scouters, αναλυτές και οπαδούς.
            </p>

            {/* Τα 3 Χαρακτηριστικά (Features) */}
            <div className="space-y-6">
              
              {/* Feature 1 */}
              <div className="flex items-start gap-5 p-4 bg-slate-800/30 rounded-3xl border border-slate-800">
                <div className="bg-blue-500/20 p-4 rounded-2xl">
                  <Table2 size={28} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Άμεση Βαθμολογία</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Δες πού βρίσκεται η αγαπημένη σου ομάδα σε πραγματικό χρόνο, με απόλυτη ακρίβεια σε πόντους και θέσεις.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-5 p-4 bg-slate-800/30 rounded-3xl border border-slate-800">
                <div className="bg-purple-500/20 p-4 rounded-2xl">
                  <LineChart size={28} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Προηγμένα Στατιστικά (xG)</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Δεν βλέπουμε μόνο τα γκολ. Αναλύουμε επιθέσεις, άμυνες, μονομαχίες εδάφους και αέρα για πλήρη εικόνα του γηπέδου.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-5 p-4 bg-slate-800/30 rounded-3xl border border-slate-800">
                <div className="bg-emerald-500/20 p-4 rounded-2xl">
                  <Database size={28} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Τεράστια Βάση Δεδομένων</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Χιλιάδες παίκτες και ομάδες στο δάχτυλό σου, μέσω της γρήγορης και έξυπνης αναζήτησης του TransferMind.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
