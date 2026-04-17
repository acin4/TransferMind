import { useEffect, useState } from "react";
import { getPlayers, getTeams, getTeamStats } from "../api/api";
import { 
  Users, ChevronRight, MapPin, Landmark, ArrowLeft, 
  Sword, Shield, Zap, Activity, Loader2, User 
} from "lucide-react";

export default function Teams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // States για την αλλαγή οθόνης (Στατιστικά <-> Ρόστερ)
  const [viewMode, setViewMode] = useState<'stats' | 'squad'>('stats');
  const [teamSquad, setTeamSquad] = useState<any[]>([]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await getTeams();
        setTeams(data || []);
        setError(null);
      } catch (err) {
        console.error(err);
        setTeams([]);
        setError("Αδυναμία φόρτωσης ομάδων.");
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  const handleTeamClick = async (team: any) => {
    setSelectedTeam(team);
    setViewMode('stats'); // Επαναφορά στα στατιστικά κάθε φορά που αλλάζεις ομάδα
    setStatsLoading(true);
    
    try {
      const [teamStats, squad] = await Promise.all([
        getTeamStats(team.id),
        getPlayers(team.id),
      ]);

      setStats(teamStats);
      setTeamSquad(squad || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setStats(null);
      setTeamSquad([]);
      setError("Αδυναμία φόρτωσης αναλυτικών δεδομένων.");
    } finally {
      setStatsLoading(false);
    }
  };

  const getAvg = (val: number, matches: number) => matches > 0 && val ? (val / matches).toFixed(1) : "0.0";
  const getPct = (val: number) => val ? Number(val).toFixed(1) : "0.0";

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-bold tracking-widest animate-pulse">
      ΦΟΡΤΩΣΗ ΟΜΑΔΩΝ...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="max-w-7xl mx-auto">
        
        {selectedTeam ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ΚΟΙΝΟ HEADER ΓΙΑ ΟΛΕΣ ΤΙΣ ΟΘΟΝΕΣ ΤΗΣ ΟΜΑΔΑΣ */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
              <button 
                onClick={() => setSelectedTeam(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-900 px-6 py-3 rounded-full border border-slate-800 hover:border-blue-500 transition-all font-bold uppercase text-xs tracking-widest"
              >
                <ArrowLeft size={16} /> Πισω στις Ομαδες
              </button>

              <div className="text-right">
                <h1 className="text-5xl font-black italic uppercase bg-gradient-to-r from-white to-blue-500 bg-clip-text text-transparent">
                  {selectedTeam.name}
                </h1>
                <div className="flex items-center justify-end gap-4 text-slate-400 text-sm mt-2 font-medium">
                  <span className="flex items-center gap-1"><MapPin size={14} className="text-rose-500"/> {selectedTeam.city || "Professional Club"}</span>
                  <span className="flex items-center gap-1"><Landmark size={14} className="text-emerald-500"/> {selectedTeam.stadium || "Home Stadium"}</span>
                </div>
              </div>
            </div>

            {statsLoading ? (
              <div className="py-20 text-center text-blue-500 font-black tracking-widest uppercase flex flex-col items-center gap-4">
                <Loader2 className="animate-spin" size={40} /> Αναλυση Δεδομενων...
              </div>
            ) : error ? (
              <div className="bg-slate-900/20 p-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] text-rose-400 font-bold uppercase italic">
                {error}
              </div>
            ) : viewMode === 'stats' ? (
              
              /* =========================================
                 ΟΘΟΝΗ 1: ΣΤΑΤΙΣΤΙΚΑ ΟΜΑΔΑΣ
                 ========================================= */
              <>
                {stats ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* ΕΠΙΘΕΣΗ */}
                    <StatCategory title="Επίθεση" icon={<Sword className="text-red-500" />}>
                      <StatRow label="Γκολ ανά αγώνα" value={getAvg(stats.goals_scored, stats.matches)} />
                      <StatRow label="Πέναλτυ γκολ" value={`${stats.penalty_scored || 0}/${stats.penalty_taken || 0}`} />
                      <StatRow label="Γκολ Απο Φαουλ" value={`${stats.freekick_goals || 0}/${stats.freekick_taken || 0}`} />
                      <StatRow label="Γκολ μέσα στην περιοχή" value={`${stats.goals_inside_box || 0}/${stats.shots_inside_box || 0}`} />
                      <StatRow label="Γκολ έξω από την περιοχή" value={`${stats.goals_outside_box || 0}/${stats.shots_outside_box || 0}`} />
                      <StatRow label="Κεφαλιές γκολ" value={stats.goals_header || 0} />
                      <StatRow label="Μεγάλες ευκαιρίες / αγώνα" value={getAvg(stats.big_chances, stats.matches)} />
                      <StatRow label="Χαμένες ευκαιρίες / αγώνα" value={getAvg(stats.big_chances_missed, stats.matches)} />
                      <StatRow label="Συνολικά σουτ / αγώνα" value={getAvg(stats.shots, stats.matches)} />
                      <StatRow label="Σουτ στο στόχο / αγώνα" value={getAvg(stats.shots_ontarget, stats.matches)} />
                      <StatRow label="Σουτ εκτός στόχου" value={getAvg(stats.shots_offtarget, stats.matches)} />
                      <StatRow label="Μπλοκαρισμένα Σουτ" value={getAvg(stats.shots_blocked, stats.matches)} />
                      <StatRow label="Επιτυχημένες ντρίπλες / αγώνα" value={getAvg(stats.dribbles_success, stats.matches)} />
                      <StatRow label="Κόρνερ ανά αγώνα" value={getAvg(stats.corners, stats.matches)} />
                      <StatRow label="Δοκάρι (Σύνολο)" value={stats.woodwork || 0} />
                      <StatRow label="Αντεπιθέσεις (Σύνολο)" value={stats.fastbreak_total || 0} />
                    </StatCategory>

                    {/* ΠΑΣΕΣ */}
                    <StatCategory title="Πάσες" icon={<Zap className="text-yellow-500" />}>
                      <StatRow label="Κατοχή μπάλας" value={`${getPct(stats.avg_ball_possession)}%`} />
                      <StatRow label="Ακριβείς πάσες" value={`${getAvg(stats.pass_acc, stats.matches)} (${getPct(stats.pass_acc_percentage)}%)`} />
                      <StatRow label="Πάσες στην άμυνα" value={`${getAvg(stats.pass_ownhalf_acc, stats.matches)} (${getPct(stats.pass_ownhalf_perc)}%)`} />
                      <StatRow label="Πάσες στην επίθεση" value={`${getAvg(stats.pass_opphalf_acc, stats.matches)} (${getPct(stats.pass_opphalf_perc)}%)`} />
                      <StatRow label="Μακρινές μπαλιές" value={`${getAvg(stats.longballs_acc, stats.matches)} (${getPct(stats.longballs_perc)}%)`} />
                      <StatRow label="Ακριβείς σέντρες" value={`${getAvg(stats.cross_acc, stats.matches)} (${getPct(stats.cross_perc)}%)`} />
                    </StatCategory>

                    {/* ΑΜΥΝΑ */}
                    <StatCategory title="Άμυνα" icon={<Shield className="text-blue-500" />}>
                      <StatRow label="Ανέπαφη εστία" value={stats.cleansheats || 0} />
                      <StatRow label="Γκολ που δέχθηκαν / αγώνα" value={getAvg(stats.goals_conceded, stats.matches)} />
                      <StatRow label="Τάκλινγκ ανά αγώνα" value={getAvg(stats.tackles, stats.matches)} />
                      <StatRow label="Κοψίματα ανά αγώνα" value={getAvg(stats.interceptions, stats.matches)} />
                      <StatRow label="Αποκρούσεις / αγώνα" value={getAvg(stats.saves, stats.matches)} />
                      <StatRow label="Λάθος που οδήγησε σε σουτ" value={stats.errors_to_shot || 0} />
                      <StatRow label="Λάθος που οδήγησε σε γκολ" value={stats.errors_to_goals || 0} />
                      <StatRow label="Πέναλτι που υπέπεσαν" value={stats.penalty_commited || 0} />
                      <StatRow label="Γκολ από πέναλτι (κατά)" value={stats.penalty_conceded || 0} />
                      <StatRow label="Απομακρύνσεις στη γραμμή" value={stats.clearences_offline || 0} />
                      <StatRow label="Τελευταία αντιμετώπιση" value={stats.lastman_tackles || 0} />
                    </StatCategory>

                    {/* ΑΛΛΟΙ */}
                    <StatCategory title="Άλλοι" icon={<Activity className="text-green-500" />}>
                      <StatRow label="Μονομαχίες κερδισμένες" value={`${getAvg(stats.duels_won, stats.matches)} (${getPct(stats.duels_perc)}%)`} />
                      <StatRow label="Μονομαχίες εδάφους" value={`${getAvg(stats.ground_duels_won, stats.matches)} (${getPct(stats.ground_duels_perc)}%)`} />
                      <StatRow label="Εναέριες μονομαχίες" value={`${getAvg(stats.aerial_duels_won, stats.matches)} (${getPct(stats.aerial_duels_perc)}%)`} />
                      <StatRow label="Χαμένη κατοχή / αγώνα" value={getAvg(stats.possession_lost, stats.matches)} />
                      <StatRow label="Οφσάιντ ανά αγώνα" value={getAvg(stats.offsides, stats.matches)} />
                      <StatRow label="Φάουλ ανά αγώνα" value={getAvg(stats.fouls, stats.matches)} />
                      <StatRow label="Κίτρινες κάρτες / αγώνα" value={getAvg(stats.yellowcards, stats.matches)} />
                      <StatRow label="Κόκκινες κάρτες" value={stats.redcards || 0} />
                    </StatCategory>

                  </div>
                ) : (
                  <div className="bg-slate-900/20 p-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] text-slate-500 font-bold uppercase italic">
                    Δεν βρέθηκαν στατιστικά για αυτή την ομάδα.
                  </div>
                )}

                {/* 🔵 ΚΟΥΜΠΙ: SEE MORE STATISTICS (ROSTER) */}
                <div className="mt-12 flex justify-center pb-12">
                  <button 
                    onClick={() => setViewMode('squad')}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.5)] flex items-center gap-3 group"
                  >
                    <Users size={20} /> 
                    See More Statistics (Roster)
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </>
            ) : (

              /* =========================================
                 ΟΘΟΝΗ 2: ROSTER (SQUAD LIST)
                 ========================================= */
              <div className="animate-in fade-in zoom-in-95 duration-500 pb-12">
                <div className="mb-8 flex justify-center">
                  <button 
                    onClick={() => setViewMode('stats')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-900 px-6 py-3 rounded-full border border-slate-800 hover:border-blue-500 transition-all font-bold uppercase text-xs tracking-widest"
                  >
                    <ArrowLeft size={16} /> Back to Team Stats
                  </button>
                </div>
                
                <SquadList players={teamSquad} />
              </div>

            )}
          </div>
        ) : (
          
          /* =========================================
             ΑΡΧΙΚΗ ΟΘΟΝΗ: ΛΙΣΤΑ ΜΕ ΟΛΕΣ ΤΙΣ ΟΜΑΔΕΣ
             ========================================= */
          <div className="animate-in fade-in duration-500">
            <h1 className="text-5xl font-black italic mb-12 uppercase bg-gradient-to-r from-white to-blue-500 bg-clip-text text-transparent">
              League Teams
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {teams.map((team) => (
                <button 
                  key={team.id} 
                  onClick={() => handleTeamClick(team)}
                  className="w-full text-left bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] hover:border-blue-500 transition-all group shadow-xl relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-blue-500/10 p-3 rounded-2xl">
                      <Users className="text-blue-500" size={24} />
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 font-bold">
                      ID: {team.id}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black uppercase italic mb-4 group-hover:text-blue-400 transition-colors leading-tight">
                    {team.name}
                  </h2>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <MapPin size={16} className="text-rose-500" />
                      <span className="font-medium truncate">{team.city || "Professional Club"}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Landmark size={16} className="text-emerald-500" />
                      <span className="font-medium truncate">{team.stadium || "Home Stadium"}</span>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center text-blue-500 text-xs font-black uppercase tracking-widest group-hover:gap-3 transition-all">
                    View Analytics <ChevronRight size={16} />
                  </div>

                  <div className="absolute -right-4 -bottom-4 text-white/5 group-hover:text-blue-500/10 transition-colors">
                    <Landmark size={80} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!selectedTeam && error && (
          <div className="mt-8 text-center text-sm font-bold uppercase tracking-widest text-rose-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================
   COMPONENT: SQUAD LIST (Το Ρόστερ με τις Βαθμολογίες)
   ==================================================== */
function SquadList({ players }: { players: any[] }) {
  if (!players || players.length === 0) {
    return (
      <div className="bg-slate-900/20 p-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] text-slate-500 font-bold uppercase italic max-w-4xl mx-auto">
        Το Roster για αυτή την ομάδα δεν είναι διαθέσιμο αυτή τη στιγμή.
      </div>
    );
  }

  // Ασφαλής έλεγχος θέσης
  const getPos = (pos: string) => (pos || '').toLowerCase();
  
  // Διαχωρισμός ανάλογα με τη θέση
  const gk = players.filter(p => getPos(p.position).includes('goal') || getPos(p.position) === 'g');
  const def = players.filter(p => getPos(p.position).includes('def') || getPos(p.position) === 'd');
  const mid = players.filter(p => getPos(p.position).includes('mid') || getPos(p.position) === 'm');
  const att = players.filter(p => getPos(p.position).includes('att') || getPos(p.position).includes('forw') || getPos(p.position) === 'f' || getPos(p.position) === 'a');
  
  const knownIds = new Set([...gk, ...def, ...mid, ...att].map(p => p.id));
  const unknown = players.filter(p => !knownIds.has(p.id));

  const renderGroup = (title: string, groupPlayers: any[]) => {
    if (groupPlayers.length === 0) return null;
    return (
      <div className="mb-8">
        <h3 className="text-slate-400 uppercase tracking-[0.2em] text-xs font-black mb-3 pl-4">{title}</h3>
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2rem] overflow-hidden shadow-2xl">
          {groupPlayers.map((p, i) => {
            // Mock βαθμολογία (αν δεν υπάρχει στο DB)
            const mockRating = (6.2 + ((p.name?.length || 5) % 23) / 10).toFixed(1);
            const finalRating = Number(p.rating || p.average_rating || mockRating);
            
            // Sofascore colors
            let ratingColor = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            if (finalRating >= 7.5) ratingColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            else if (finalRating >= 7.0) ratingColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            else if (finalRating >= 6.5) ratingColor = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';

            return (
              <div key={p.id || i} className="flex items-center justify-between p-4 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-6">
                  <span className="text-slate-500 font-bold w-6 text-center text-sm">{p.number || p.jersey_number || '-'}</span>
                  
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-800 rounded-full p-2 text-slate-400">
                      <User size={16} />
                    </div>
                    <span className="text-slate-200 font-bold text-sm md:text-base">{p.name}</span>
                  </div>
                </div>
                
                <div className={`border font-black text-sm px-3 py-1 rounded-xl ${ratingColor}`}>
                  {finalRating.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {renderGroup("Goalkeepers", gk)}
      {renderGroup("Defenders", def)}
      {renderGroup("Midfielders", mid)}
      {renderGroup("Attackers", att)}
      {renderGroup("Reserves / Other", unknown)}
    </div>
  );
}

// ΒΟΗΘΗΤΙΚΑ COMPONENTS ΓΙΑ ΤΑ ΣΤΑΤΙΣΤΙΚΑ
function StatCategory({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] overflow-hidden shadow-xl">
      <div className="flex items-center gap-3 bg-slate-900/80 px-6 py-4 border-b border-slate-800">
        {icon}
        <h3 className="font-black uppercase tracking-widest text-sm text-slate-200">{title}</h3>
      </div>
      <div className="p-4 space-y-1">
        {children}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 hover:bg-white/[0.02] rounded-xl transition-colors border-b border-slate-800/30 last:border-0">
      <span className="text-slate-400 font-medium text-xs tracking-wide">{label}</span>
      <span className="font-black text-sm text-white">{value !== undefined && value !== null ? value : "-"}</span>
    </div>
  );
}
