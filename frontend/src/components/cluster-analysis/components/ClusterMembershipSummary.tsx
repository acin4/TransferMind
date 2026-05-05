import { memo, useMemo } from "react";
import type { ClusterMembershipSummaryProps } from "../types";
import {
  getAssignmentSeasonLabel,
  getAssignmentTournamentLabel,
  safeCompareLabels,
} from "../utils/clusterFormatters";

export const ClusterMembershipSummary = memo(function ClusterMembershipSummary({
  clusters,
}: ClusterMembershipSummaryProps) {
  const groupedMembership = useMemo(
    () =>
      clusters.map((cluster) => ({
        ...cluster,
        members: cluster.members
          .slice()
          .sort((left, right) =>
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
    <div className="mt-6 rounded-[2rem] border border-slate-800 bg-slate-950/40 p-5">
      <div className="mb-5">
        <h5 className="text-sm font-black uppercase tracking-widest text-white">
          Cluster Membership Summary
        </h5>
        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
          Grouped team-season membership without per-stat values.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {groupedMembership.map((cluster) => (
          <div
            key={cluster.clusterId}
            className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h6 className="text-xs font-black uppercase tracking-widest text-white">
                Cluster {cluster.clusterId}
              </h6>
              <span className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                {cluster.members.length} entries
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-3 bg-slate-950/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span>Team</span>
                <span>Season</span>
                <span>Tournament</span>
              </div>
              <div className="max-h-[260px] overflow-y-auto">
                {cluster.members.map((assignment) => (
                  <div
                    key={`${cluster.clusterId}-${assignment.entryId}-membership`}
                    className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-3 border-t border-slate-800/70 px-3 py-2 text-xs"
                  >
                    <span className="truncate font-bold text-slate-200">
                      {assignment.teamName}
                    </span>
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
