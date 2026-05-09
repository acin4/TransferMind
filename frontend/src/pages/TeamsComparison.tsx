import { useEffect, useState } from "react";
import { BrainCircuit, GitCompareArrows, Loader2 } from "lucide-react";
import { getTeamsComparisonDataset } from "../api/api";
import {
  TEAM_COMPARISON_STAT_KEYS,
  type TeamSeasonStatEntry,
} from "../utils/teamsComparison";
import type { TeamStatKey } from "../teamStatsConfig";
import SegmentedTabs from "../components/ui/SegmentedTabs";
import CustomComparisonTab from "../components/teams-comparison/CustomComparisonTab";
import ClusterAnalysisTab from "../components/teams-comparison/ClusterAnalysisTab";
import {
  PageHeader,
  PageShell,
  SummaryPill,
  standingsTheme,
} from "../components/ui/design";

type ComparisonTabId = "custom" | "cluster";

const CLUSTER_FALLBACK_STAT_KEYS = TEAM_COMPARISON_STAT_KEYS.filter(
  (statKey) => statKey !== "matches",
);

export default function TeamsComparison() {
  const [entries, setEntries] = useState<TeamSeasonStatEntry[]>([]);
  const [clusterStatKeys, setClusterStatKeys] = useState<TeamStatKey[]>(
    CLUSTER_FALLBACK_STAT_KEYS,
  );
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
        const nextClusterStatKeys =
          dataset?.stats && dataset.stats.length > 0
            ? dataset.stats.map((stat) => stat.key)
            : CLUSTER_FALLBACK_STAT_KEYS;

        if (!cancelled) {
          setEntries(nextEntries);
          setClusterStatKeys(nextClusterStatKeys);
        }
      } catch (loadError) {
        console.error("Failed to load team-season comparison dataset:", loadError);

        if (!cancelled) {
          setEntries([]);
          setClusterStatKeys(CLUSTER_FALLBACK_STAT_KEYS);
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
        <div className={standingsTheme.errorPanel}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Teams Comparison"
        subtitle="Team + Season analytics with relative score comparison and clustering"
        icon={GitCompareArrows}
        actions={
          <div className="flex flex-wrap gap-3">
            <SummaryPill>{entries.length} team-season entries</SummaryPill>
            <SummaryPill>{TEAM_COMPARISON_STAT_KEYS.length} stats</SummaryPill>
          </div>
        }
        className="lg:items-end"
      />

      <SegmentedTabs
        items={[
          {
            value: "custom",
            label: (
              <>
                <GitCompareArrows size={16} />
                Custom Comparison
              </>
            ),
          },
          {
            value: "cluster",
            label: (
              <>
                <BrainCircuit size={16} />
                Cluster Analysis
              </>
            ),
          },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        className={`${standingsTheme.segmentedTabs} mb-8`}
        buttonClassName={`inline-flex items-center gap-2 ${standingsTheme.segmentedTabButton}`}
      />

      {entries.length === 0 ? (
        <div className={standingsTheme.emptyPanel}>
          No Team + Season statistics were available for comparison.
        </div>
      ) : activeTab === "custom" ? (
        <CustomComparisonTab
          entries={entries}
          statKeys={TEAM_COMPARISON_STAT_KEYS}
        />
      ) : (
        <ClusterAnalysisTab entries={entries} statKeys={clusterStatKeys} />
      )}
    </PageShell>
  );
}
