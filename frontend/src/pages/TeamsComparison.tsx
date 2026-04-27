import { useEffect, useState } from "react";
import { BrainCircuit, GitCompareArrows, Loader2 } from "lucide-react";
import { getTeamsComparisonDataset } from "../api/api";
import {
  TEAM_COMPARISON_STAT_KEYS,
  type TeamSeasonStatEntry,
} from "../utils/teamsComparison";
import CustomComparisonTab from "../components/teams-comparison/CustomComparisonTab";
import ClusterAnalysisTab from "../components/teams-comparison/ClusterAnalysisTab";

type ComparisonTabId = "custom" | "cluster";

export default function TeamsComparison() {
  const [entries, setEntries] = useState<TeamSeasonStatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ComparisonTabId>("custom");

  useEffect(() => {
    let cancelled = false;

    const loadDataset = async () => {
      try {
        setLoading(true);
        setError(null);

        const dataset = await getTeamsComparisonDataset();
        const nextEntries = dataset?.entries ?? [];

        if (!cancelled) {
          setEntries(nextEntries);
        }
      } catch (loadError) {
        console.error("Failed to load team-season comparison dataset:", loadError);

        if (!cancelled) {
          setEntries([]);
          setError("Failed to load the Team + Season comparison dataset.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDataset();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black gap-3 uppercase tracking-widest">
        <Loader2 className="animate-spin" />
        Loading Team + Season Dataset...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="rounded-[2rem] border border-rose-500/20 bg-rose-500/10 px-8 py-6 text-center text-sm font-black uppercase tracking-widest text-rose-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-white font-sans">
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-10">
          <div>
            <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-white">
              Teams Comparison
            </h1>
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mt-4">
              Team + Season analytics with relative score comparison and clustering
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <SummaryPill label={`${entries.length} team-season entries`} />
            <SummaryPill label={`${TEAM_COMPARISON_STAT_KEYS.length} stats`} />
          </div>
        </div>

        <div className="flex gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max overflow-x-auto">
          <TabButton
            label="Custom Comparison"
            icon={<GitCompareArrows size={16} />}
            isActive={activeTab === "custom"}
            onClick={() => setActiveTab("custom")}
          />
          <TabButton
            label="Cluster Analysis"
            icon={<BrainCircuit size={16} />}
            isActive={activeTab === "cluster"}
            onClick={() => setActiveTab("cluster")}
          />
        </div>

        {entries.length === 0 ? (
          <div className="rounded-[3rem] border-2 border-dashed border-slate-800 p-16 text-center text-sm font-black uppercase tracking-widest text-slate-500">
            No Team + Season statistics were available for comparison.
          </div>
        ) : activeTab === "custom" ? (
          <CustomComparisonTab
            entries={entries}
            statKeys={TEAM_COMPARISON_STAT_KEYS}
          />
        ) : (
          <ClusterAnalysisTab entries={entries} />
        )}
      </div>
    </div>
  );
}

function SummaryPill({ label }: { label: string }) {
  return (
    <span className="px-4 py-3 rounded-2xl bg-slate-900/70 border border-slate-800 text-[11px] font-black uppercase tracking-widest text-slate-300">
      {label}
    </span>
  );
}

function TabButton({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
        isActive
          ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border-b-2 border-blue-400"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-b-2 border-transparent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
