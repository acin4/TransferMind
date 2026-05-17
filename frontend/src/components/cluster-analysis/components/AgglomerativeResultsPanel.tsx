import { memo, useMemo } from "react";
import type { AgglomerativeResultsPanelProps } from "../types";
import {
  formatDisplayRawStatValue,
  formatNormalizedStatValue,
  getAssignmentSeasonLabel,
  getAssignmentTournamentLabel,
  safeCompareLabels,
} from "../utils/clusterFormatters";
import { ContentPanel, standingsTheme } from "../../ui/design";
import { ClusterAverageProfilesChart } from "./ClusterAverageProfilesChart";
import { ClusterMembershipSummary } from "./ClusterMembershipSummary";
import { MessageBox } from "./MessageBox";
import { ParallelCoordinatesPlot } from "./ParallelCoordinatesPlot";

function buildSvgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const AgglomerativeResultsPanel = memo(
  function AgglomerativeResultsPanel({
    result,
    clusters,
    profiles,
  }: AgglomerativeResultsPanelProps) {
    const dendrogramSource = useMemo(
      () =>
        result.dendrogramSvg
          ? buildSvgDataUrl(result.dendrogramSvg)
          : result.dendrogramImage,
      [result.dendrogramImage, result.dendrogramSvg],
    );
    const statKeys = useMemo(
      () => result.stats.map((stat) => stat.key),
      [result.stats],
    );
    const sortedAssignments = useMemo(
      () =>
        result.assignments.slice().sort(
          (left, right) =>
            left.clusterId - right.clusterId ||
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
      [result.assignments],
    );

    return (
      <ContentPanel>
        <div className="mb-6">
          <h4 className="text-lg font-black uppercase tracking-tight text-white">
            Agglomerative Clustering
          </h4>
          <p className="mt-3 max-w-4xl text-xs font-black uppercase tracking-widest text-slate-500">
            Agglomerative Clustering builds a hierarchy from the same normalized
            0-1 team-stat matrix used by K-means. The dendrogram shows which
            team-season entries merge first and the distance at each merge.
            Cluster labels come from cutting that hierarchy into the selected
            number of groups.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className={standingsTheme.compactPill}>
              K={result.k}
            </span>
            <span className={standingsTheme.compactPill}>
              Linkage: {result.linkage}
            </span>
            <span className={standingsTheme.compactPill}>
              {result.context.selectedEntryCount} entries
            </span>
          </div>
        </div>

        {result.warnings.length > 0 ? (
          <MessageBox tone="warning" messages={result.warnings} />
        ) : null}

        <div className={standingsTheme.nestedPanel}>
          <div className="mb-5">
            <h5 className="text-sm font-black uppercase tracking-widest text-white">
              Dendrogram
            </h5>
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Lower merge distances indicate more similar team-season entries.
              The selected cluster count cuts this tree into assignment groups.
            </p>
          </div>
          {dendrogramSource ? (
            <div className="overflow-x-auto rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(10,16,40,0.96))] p-3 shadow-2xl shadow-black/30">
              <img
                key={`${result.k}-${result.linkage}-${result.context.selectedEntryCount}`}
                src={dendrogramSource}
                alt="Agglomerative clustering dendrogram"
                className="mx-auto block h-auto max-h-[680px] min-w-[680px] max-w-none rounded-[1.5rem] sm:min-w-0 sm:w-full"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-xs font-black uppercase tracking-widest text-slate-500">
              Dendrogram output was not included in this response.
            </div>
          )}
        </div>

        <ClusterAverageProfilesChart
          profiles={profiles}
          resetAssignments={result.assignments}
          statKeys={statKeys}
        />

        <ParallelCoordinatesPlot result={result} />

        <div className={`mt-6 ${standingsTheme.nestedPanel}`}>
          <div className="mb-5">
            <h5 className="text-sm font-black uppercase tracking-widest text-white">
              Assignment Details
            </h5>
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Team-season rows with raw stat values and normalized model inputs.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
              <thead className="bg-slate-950/80 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-3">
                    Cluster
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Team
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Season
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Tournament
                  </th>
                  {result.stats.map((stat) => (
                    <th
                      key={stat.key}
                      scope="col"
                      className="min-w-[150px] px-3 py-3"
                    >
                      {stat.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-950/30">
                {sortedAssignments.map((assignment) => (
                  <tr key={`${assignment.entryId}-agglomerative-detail`}>
                    <td className="whitespace-nowrap px-3 py-3 font-black uppercase tracking-widest text-blue-300">
                      {assignment.clusterId}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3 font-bold text-slate-100">
                      {assignment.teamName}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-3 font-bold text-slate-400">
                      {getAssignmentSeasonLabel(assignment)}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3 font-bold text-slate-400">
                      {getAssignmentTournamentLabel(assignment)}
                    </td>
                    {result.stats.map((stat) => (
                      <td key={stat.key} className="px-3 py-3">
                        <div className="font-bold text-slate-200">
                          {formatDisplayRawStatValue(
                            assignment.rawStats[stat.key],
                            stat.key,
                          )}
                        </div>
                        <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Norm{" "}
                          {formatNormalizedStatValue(
                            assignment.normalizedStats[stat.key],
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ClusterMembershipSummary clusters={clusters} />
      </ContentPanel>
    );
  },
);
