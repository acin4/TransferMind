import { useEffect, useState } from "react";
import { BrainCircuit, GitCompareArrows, Loader2 } from "lucide-react";
import {
  getTeamSeasons,
  getTeamStats,
  getTeams,
} from "../api/api";
import {
  TEAM_COMPARISON_STAT_KEYS,
  sanitizeTeamStats,
  sortEntriesByLabel,
  toSeasonLabel,
  toTeamSeasonEntryId,
  type TeamSeason,
  type TeamSeasonStatEntry,
  type TeamSummary,
} from "../utils/teamsComparison";
import CustomComparisonTab from "../components/teams-comparison/CustomComparisonTab";
import ClusterAnalysisTab from "../components/teams-comparison/ClusterAnalysisTab";

type ComparisonTabId = "custom" | "cluster";

let cachedEntries: TeamSeasonStatEntry[] | null = null;
let datasetPromise: Promise<TeamSeasonStatEntry[]> | null = null;
const teamsCache = { current: null as TeamSummary[] | null };
const seasonsCache = new Map<number, TeamSeason[]>();
const statsCache = new Map<string, TeamSeasonStatEntry["stats"]>();

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<R>,
) {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map(worker));
    results.push(...batchResults);
  }

  return results;
}

export default function TeamsComparison() {
  const [entries, setEntries] = useState<TeamSeasonStatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ComparisonTabId>("custom");

  useEffect(() => {
    let cancelled = false;

    const buildDataset = async () => {
      const teams =
        teamsCache.current ??
        ((await getTeams()) as TeamSummary[] | null | undefined) ??
        [];

      teamsCache.current = teams;

      const teamSeasonGroups = await mapInBatches(teams, 8, async (team) => {
        if (!seasonsCache.has(team.id)) {
          const seasons =
            ((await getTeamSeasons(team.id)) as TeamSeason[] | null | undefined) ??
            [];
          seasonsCache.set(team.id, seasons);
        }

        const seasons = seasonsCache.get(team.id) ?? [];

        return seasons.map((season) => ({
          id: toTeamSeasonEntryId(team.id, season.season_id),
          teamId: team.id,
          teamName: team.name,
          seasonId: season.season_id,
          seasonName: toSeasonLabel(season),
          tournamentId: season.tournament_id ?? null,
          tournamentName: season.tournament_name?.trim() || null,
          label: `${team.name} - ${toSeasonLabel(season)}`,
        }));
      });

      const flattenedEntries = teamSeasonGroups.flat();

      await mapInBatches(flattenedEntries, 10, async (entry) => {
        if (!statsCache.has(entry.id)) {
          const stats = await getTeamStats(entry.teamId, entry.seasonId);
          statsCache.set(entry.id, sanitizeTeamStats(stats ?? null));
        }

        return null;
      });

      return sortEntriesByLabel(
        flattenedEntries.map((entry) => ({
          ...entry,
          stats: statsCache.get(entry.id) ?? {},
        })),
      );
    };

    const loadDataset = async () => {
      try {
        setLoading(true);
        setError(null);

        if (cachedEntries) {
          if (!cancelled) {
            setEntries(cachedEntries);
            setLoading(false);
          }
          return;
        }

        datasetPromise ??= buildDataset();
        const nextEntries = await datasetPromise;
        cachedEntries = nextEntries;

        if (!cancelled) {
          setEntries(nextEntries);
        }
      } catch (loadError) {
        datasetPromise = null;
        console.error("Failed to build team-season comparison dataset:", loadError);

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
