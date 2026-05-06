import { memo, useMemo } from "react";
import type { ClusterMembershipSummaryProps } from "../types";
import {
  getAssignmentSeasonLabel,
  getAssignmentTournamentLabel,
  safeCompareLabels,
} from "../utils/clusterFormatters";

// memo prevents this summary from re-rendering unless the cluster data changes.
// That is helpful because this component renders lists of members, which can grow
// as more team-season entries are included in the analysis.
export const ClusterMembershipSummary = memo(function ClusterMembershipSummary({
  // clusters contains the final cluster groups from the parent analysis UI.
  // Each cluster has a clusterId and a list of assigned team-season members.
  clusters,
}: ClusterMembershipSummaryProps) {
  // Sort members inside each cluster so the table is predictable and easy to scan.
  // useMemo keeps the sorted copy from being rebuilt unless clusters changes.
  const groupedMembership = useMemo(
    () =>
      clusters.map((cluster) => ({
        // Copy the cluster fields, then replace members with a sorted copy below.
        ...cluster,
        members: cluster.members
          // slice() creates a copy so the original prop array is not mutated.
          // Props should be treated as read-only in React.
          .slice()
          .sort((left, right) =>
            // Sort by team name first, then season, then tournament. The "||"
            // chain means the next comparison is only used when the previous
            // labels are equal.
            safeCompareLabels(left.teamName, right.teamName) ||
            safeCompareLabels(
              getAssignmentSeasonLabel(left),
              getAssignmentSeasonLabel(right),
            ) ||
            safeCompareLabels(
              getAssignmentTournamentLabel(left),
              getAssignmentTournamentLabel(right),
            ),
          ),
      })),
    [clusters],
  );

  return (
    // Outer card groups the membership summary as one section of the cluster
    // analysis page.
    <div className="mt-6 rounded-[2rem] border border-slate-800 bg-slate-950/40 p-5">
      {/* Section heading explains that this view focuses on membership only,
          not the individual statistic values used to create the clusters. */}
      <div className="mb-5">
        <h5 className="text-sm font-black uppercase tracking-widest text-white">
          Cluster Membership Summary
        </h5>
        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
          Grouped team-season membership without per-stat values.
        </p>
      </div>

      {/* The cluster cards stack on smaller screens and become two columns on
          extra-large screens, keeping tables readable at different widths. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {groupedMembership.map((cluster) => (
          // One card per cluster. clusterId is unique in the clustering result,
          // so it works as a stable React key.
          <div
            key={cluster.clusterId}
            className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
          >
            {/* Card header shows the cluster label and how many team-season
                entries belong to it. */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <h6 className="text-xs font-black uppercase tracking-widest text-white">
                Cluster {cluster.clusterId}
              </h6>
              <span className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                {cluster.members.length} entries
              </span>
            </div>

            {/* Table wrapper clips the rounded corners cleanly and separates the
                header row from the scrollable list of members. */}
            <div className="overflow-hidden rounded-xl border border-slate-800">
              {/* Grid columns give Team the most room, while Season and Tournament
                  still get flexible space for their labels. */}
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-3 bg-slate-950/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span>Team</span>
                <span>Season</span>
                <span>Tournament</span>
              </div>
              {/* Long cluster member lists scroll inside the card instead of
                  making the entire page section very tall. */}
              <div className="max-h-[260px] overflow-y-auto">
                {cluster.members.map((assignment) => (
                  // The key combines cluster id and entry id so each rendered
                  // membership row is unique.
                  <div
                    key={`${cluster.clusterId}-${assignment.entryId}-membership`}
                    className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-3 border-t border-slate-800/70 px-3 py-2 text-xs"
                  >
                    {/* truncate keeps long names from breaking the three-column
                        layout. Users still see consistent rows even with long text. */}
                    <span className="truncate font-bold text-slate-200">
                      {assignment.teamName}
                    </span>
                    {/* Helper functions centralize fallback label formatting, so
                        this JSX stays focused on layout. */}
                    <span className="truncate font-bold text-slate-400">
                      {getAssignmentSeasonLabel(assignment)}
                    </span>
                    <span className="truncate font-bold text-slate-400">
                      {getAssignmentTournamentLabel(assignment)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
