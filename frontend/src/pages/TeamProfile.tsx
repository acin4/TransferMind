import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTeam, getTeamStats } from "../api/api";
import { 
  ArrowLeft, Target, Shield, LayoutDashboard, 
  BarChart3, Crosshair 
} from "lucide-react";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts';

// --- 1. SHOT MAP COMPONENT ---
function ShotMap({ stats }: { stats: any }) {
  const generatePoints = (count: number, xMin: number, xMax: number, yMin: number, yMax: number) => {
    return Array.from({ length: Math.min(Math.floor(count || 0), 35) }).map((_, i) => ({
      id: i,
      x: Math.random() * (xMax - xMin) + xMin,
      y: Math.random() * (yMax - yMin) + yMin,
    }));
  };

  const points = {

    goalsInside: generatePoints(stats?.goals_inside_box, 78, 94, 30, 70),
    goalsOutside: generatePoints(stats?.goals_outside_box, 58, 72, 25, 75),
    missedInside: generatePoints((stats?.shots_inside_box || 0) - (stats?.goals_inside_box || 0), 75, 96, 15, 85),
    missedOutside: generatePoints((stats?.shots_outside_box || 0) - (stats?.goals_outside_box || 0), 52, 72, 10, 90),
  };

  return (
    <div className="bg-slate-900/50 rounded-[3rem] border border-slate-800 p-8 relative overflow-hidden shadow-2xl backdrop-blur-md">

      <div className="flex justify-between items-center mb-8">
        <h4 className="text-sm font-black uppercase text-rose-500 flex items-center gap-2 italic">
          <Crosshair size={20} className="animate-pulse" /> Final Third Execution Map
        </h4>
        <div className="px-4 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
           <p className="text-[9px] font-black text-yellow-500 uppercase tracking-widest text-center">Goal Zone Analysis</p>
        </div>
      </div>
      
      <div className="relative w-full aspect-[16/9] bg-slate-950/90 rounded-[2rem] border-2 border-slate-800 overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-0 border border-white/5 opacity-20 pointer-events-none"></div>
        <div className="absolute right-0 top-[20%] bottom-[20%] w-[18%] border-2 border-white/10 rounded-l-[2rem] bg-white/[0.02]"></div>
        {/* Penalty Spot */}
        <div className="absolute right-[11.5%] top-1/2 -translate-y-1/2 flex flex-col items-center group z-50">
           <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-[0_0_20px_#eab308] border-2 border-white animate-bounce cursor-help" />
        </div>

        {points.goalsInside.map(p => <div key={`gi-${p.id}`} className="absolute w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_12px_#10b981] z-20 border border-white/20" style={{ left: `${p.x}%`, top: `${p.y}%` }} />)}
        {points.goalsOutside.map(p => <div key={`go-${p.id}`} className="absolute w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981] z-20 border border-white/10" style={{ left: `${p.x}%`, top: `${p.y}%` }} />)}
        {points.missedInside.map(p => <div key={`mi-${p.id}`} className="absolute w-1.5 h-1.5 bg-rose-600/30 rounded-full border border-rose-500/40" style={{ left: `${p.x}%`, top: `${p.y}%` }} />)}
        {points.missedOutside.map(p => <div key={`mo-${p.id}`} className="absolute w-1.5 h-1.5 bg-rose-600/30 rounded-full border border-rose-500/40" style={{ left: `${p.x}%`, top: `${p.y}%` }} />)}
      </div>
    </div>
  );
}

// --- 2. TACTICAL RADAR COMPONENT WITH TABS ---
function TacticalRadar({ stats }: { stats: any }) {
  const [activeTab, setActiveTab] = useState<'attack' | 'buildup' | 'defense'>('attack');

  const radarData = {
    attack: [
      { subject: 'Goals', A: Math.min(((stats?.goals_scored || 0) / 2.5) * 100, 100) },
      { subject: 'Shots', A: Math.min(((stats?.shots || 0) / 15) * 100, 100) },
      { subject: 'Efficiency', A: stats?.goalspershot_ratio || 0 },
      { subject: 'Assists', A: Math.min(((stats?.assists || 0) / 2) * 100, 100) },
      { subject: 'Risk', A: Math.min((stats?.offsides || 0) * 15, 100) },
    ],
    buildup: [
      { subject: 'Pass Acc.', A: stats?.pass_acc_percentage || 0 },
      { subject: 'Possession', A: stats?.avg_ball_possession || 0 },
      { subject: 'Dribbles', A: stats?.dribbles_success_ratio || 0 },
      { subject: 'Progression', A: stats?.pass_opphalf_perc || 0 },
      { subject: 'Control', A: stats?.pass_ownhalf_perc || 0 },
    ],
    defense: [
      { subject: 'Tackles', A: Math.min(((stats?.tackles || 0) / 25) * 100, 100) },
      { subject: 'Intercept', A: Math.min(((stats?.interceptions || 0) / 20) * 100, 100) },
      { subject: 'Clean Sheets', A: Math.min((stats?.cleansheats || 0) * 12, 100) },
      { subject: 'Clearances', A: Math.min(((stats?.clearances || 0) / 30) * 100, 100) },
      { subject: 'Stability', A: Math.max(100 - ((stats?.goals_conceded || 0) * 10), 0) },
    ]
  };

  return (
    <div className="bg-slate-900/50 rounded-[3rem] border border-slate-800 p-8 h-[600px] flex flex-col backdrop-blur-md">
      <div className="flex bg-slate-950/50 p-1 rounded-2xl border border-slate-800 mb-8 self-center">
        {(['attack', 'buildup', 'defense'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? `bg-slate-800 text-white shadow-lg` : 'text-slate-500 hover:text-slate-300'

            }`}
          >
            {tab}
          </button>
        ))}
      </div>


      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData[activeTab]}>
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Performance"
            dataKey="A"
            stroke={activeTab === 'attack' ? "#f43f5e" : activeTab === 'buildup' ? "#3b82f6" : "#10b981"}
            fill={activeTab === 'attack' ? "#f43f5e" : activeTab === 'buildup' ? "#3b82f6" : "#10b981"}
            fillOpacity={0.3}
          />
          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- 3. MAIN PAGE COMPONENT ---
export default function TeamProfile() {
  const { id } = useParams();
  const [team, setTeam] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const teamData = await getTeam(id);
          setTeam(teamData);

          if (teamData) {
            const statsData = await getTeamStats(teamData.id);
            setStats(statsData);
          }
        }
        setError(null);
      } catch (err) {
        console.error(err);
        setTeam(null);
        setStats(null);
        setError("DATA UNAVAILABLE");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-widest">Analyzing Tactical Data...</div>;
  if (!team || !stats) return <div className="min-h-screen bg-slate-950 text-white p-10 text-center font-bold">{error || "DATA UNAVAILABLE"}</div>;

  // Normalized Scores (0-100)
  const attackScore = Math.min(100, (((stats?.goals_scored || 0) * 2) + ((stats?.shots || 0) / 2) + (stats?.goalspershot_ratio || 0)) / 3).toFixed(1);
  const buildupScore = (((stats?.pass_acc_percentage || 0) + (stats?.dribbles_success_ratio || 0) + (stats?.avg_ball_possession || 0)) / 3).toFixed(1);
  const defenseScore = Math.min(100, (((stats?.tackles || 0) / 2) + (stats?.interceptions || 0) + (stats?.cleansheats || 0) * 5) / 3).toFixed(1);


  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-white font-sans selection:bg-blue-500/30">
      <Link to="/standings" className="inline-flex items-center gap-2 text-slate-500 mb-8 hover:text-white transition-all group font-bold uppercase text-xs">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Standings
      </Link>

      <div className="max-w-7xl mx-auto">
        <div className="mb-12 border-b border-slate-800 pb-8">
          <h1 className="text-7xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-white to-blue-500 bg-clip-text text-transparent leading-none">
            {team.name}
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4 flex items-center gap-2">
            <LayoutDashboard size={14} className="text-blue-500" /> Advanced Statistical Dossier
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <StatCategory title="Attack" icon={<Target size={18}/>} 
            data={[{ label: "Goals", val: stats.goals_scored }, { label: "Assists", val: stats.assists }, { label: "Efficiency", val: `${stats.goalspershot_ratio}%` }]} 
          />
          <StatCategory title="Build-up" icon={<BarChart3 size={18}/>} 
            data={[{ label: "Pass %", val: `${stats.pass_acc_percentage}%` }, { label: "Possession", val: `${stats.avg_ball_possession}%` }, { label: "Dribbles", val: `${stats.dribbles_success_ratio}%` }]} 
          />
          <StatCategory title="Defense" icon={<Shield size={18}/>} 
            data={[{ label: "Clean Sheets", val: stats.cleansheats }, { label: "Conceded", val: stats.goals_conceded }, { label: "Tackles", val: stats.tackles }]} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16 items-start">
          <TacticalRadar stats={stats} />
          <div className="grid grid-cols-1 gap-6">
            <ScoreCard title="Attack Score" value={attackScore} color="rose" description="Finishing & offensive volume" />
            <ScoreCard title="Build-up Score" value={buildupScore} color="blue" description="Flow & ball control" />
            <ScoreCard title="Defense Score" value={defenseScore} color="emerald" description="Stability & reactive capacity" />
          </div>
        </div>

        <div className="mb-16">
          <ShotMap stats={stats} />
        </div>
      </div>
    </div>
  );
}

// --- 4. HELPERS ---
function ScoreCard({ title, value, color, description }: any) {
  const colors: any = {
    rose: "text-rose-500 border-rose-500/20 bg-rose-500/5",
    blue: "text-blue-500 border-blue-500/20 bg-blue-500/5",
    emerald: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
  };
  return (
    <div className={`p-8 rounded-[2.5rem] border ${colors[color]} backdrop-blur-md transition-all hover:scale-[1.02]`}>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">{title}</p>
          <p className="text-5xl font-black italic tracking-tighter leading-none">{value}</p>
        </div>
        <p className="text-[9px] font-bold uppercase italic opacity-40 max-w-[120px] text-right">{description}</p>
      </div>
      <div className="w-full h-1 bg-slate-950 mt-4 rounded-full overflow-hidden opacity-30">
        <div className={`h-full ${color === 'rose' ? 'bg-rose-500' : color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500'}`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}

function StatCategory({ title, icon, data }: any) {
  return (
    <div className="bg-slate-900/50 border border-slate-800/60 rounded-[2rem] p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-xs mb-6 border-b border-slate-800 pb-3">
        {icon} {title}
      </div>
      <div className="space-y-4">
        {data.map((item: any, i: number) => (
          <div key={i} className="flex justify-between items-center group">
            <span className="text-slate-500 text-[13px] font-bold uppercase tracking-tight group-hover:text-slate-300 transition-colors leading-none">{item.label}</span>
            <span className="text-white font-black italic text-base leading-none">{item.val ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
