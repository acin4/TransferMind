import { memo } from "react";
import type { ClusterAverageDetailsPanelProps } from "../types";
import {
  formatInsightLabels,
  formatNormalizedStatValue,
} from "../utils/clusterFormatters";
import { standingsTheme } from "../../ui/design";

// memo prevents this presentational panel from re-rendering unless its props
// change. That is useful here because the parent cluster page may update other
// controls while this panel still shows the same profiles and stat list.
export const ClusterAverageDetailsPanel = memo(function ClusterAverageDetailsPanel({
  // profiles contains the cluster summaries selected/prepared by the parent UI.
  // Each profile includes the cluster id, its members, strongest/weakest stats,
  // and average normalized values for every statistic.
  profiles,
  // statItems controls the order and labels of rows in the average-stat table.
  // The component does not calculate stats itself; it only displays this data.
  statItems,
}: ClusterAverageDetailsPanelProps) {
  return (
    // Outer panel styling:
    // - min height keeps the layout stable when no cluster is selected.
    // - border/background make it read as a separate details area.
    // - padding gives the content room inside the panel.
    <div className={`min-h-[360px] ${standingsTheme.nestedPanel}`}>
      {/* Conditional rendering shows real details when profiles exist, or a
          beginner-friendly empty state when the user has not selected a cluster. */}
      {profiles.length > 0 ? (
        // Vertical spacing keeps each cluster card visually separated.
        <div className="space-y-4">
          {profiles.map((profile) => (
            // One card per cluster profile. The key combines clusterId with a
            // stable suffix so React can track each rendered card efficiently.
            <div
              key={`${profile.clusterId}-average-details`}
              className="rounded-xl border border-slate-800 bg-slate-950/45 p-3"
            >
              {/* Header row:
                  On mobile it stacks vertically, then switches to a horizontal
                  layout on small screens and up with sm:flex-row. */}
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black uppercase tracking-widest text-white">
                  Cluster {profile.clusterId}
                </p>
                {/* The member count tells the user how many team-season entries
                    contributed to this cluster average. */}
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {profile.members.length} entries
                </p>
              </div>

              {/* Insight cards summarize which stats stand out most for this
                  cluster before the user reads the full table below. */}
              <div className="mt-4 grid grid-cols-1 gap-3 text-xs font-bold uppercase tracking-widest">
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                  <p className="mb-2 text-[10px] font-black text-slate-500">
                    Strongest Statistics
                  </p>
                  <p className="text-slate-300">
                    {/* Formats a list of stat labels into readable text, keeping
                        display formatting out of the JSX. */}
                    {formatInsightLabels(profile.strongest)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                  <p className="mb-2 text-[10px] font-black text-slate-500">
                    Weakest Statistics
                  </p>
                  <p className="text-slate-300">
                    {/* Weakest stats are displayed the same way as strongest
                        stats so both summary cards stay consistent. */}
                    {formatInsightLabels(profile.weakest)}
                  </p>
                </div>
              </div>

              {/* Average table:
                  overflow-hidden clips rounded corners cleanly, while the inner
                  scroll area keeps long stat lists usable without growing the
                  entire page. */}
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
                {/* CSS grid gives the label column flexible space and keeps the
                    numeric average column fixed at 88px for easy scanning. */}
                <div className="grid grid-cols-[minmax(0,1fr)_88px] bg-slate-950/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>Statistic</span>
                  <span className="text-right">Average</span>
                </div>
                <div className="max-h-[220px] overflow-y-auto">
                  {statItems.map((statItem) => (
                    // One row per selected statistic. The key includes the
                    // cluster id and stat key so rows remain unique per card.
                    <div
                      key={`${profile.clusterId}-${statItem.statKey}`}
                      className="grid grid-cols-[minmax(0,1fr)_88px] gap-3 border-t border-slate-800/70 px-3 py-2 text-xs"
                    >
                      {/* truncate prevents long stat names from breaking the
                          two-column table layout. */}
                      <span className="truncate font-bold text-slate-300">
                        {statItem.label}
                      </span>
                      {/* tabular-nums makes each digit the same width, which
                          helps averages line up cleanly down the column. */}
                      <span className="text-right font-black tabular-nums text-blue-400">
                        {formatNormalizedStatValue(
                          profile.averages[statItem.statKey],
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty state shown before the user selects a cluster/profile to inspect.
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Select a cluster to inspect its average profile.
        </p>
      )}
    </div>
  );
});
