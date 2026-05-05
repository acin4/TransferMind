import { useMemo } from "react";
import type { TeamClusterRunPayload } from "../../../api/api";
import type { TeamStatKey } from "../../../teamStatsConfig";
import type { ClusterGroup, ClusterProfile } from "../types";
import {
  buildClusterGroups,
  buildClusterProfiles,
} from "../utils/clusterAnalysisUtils";

export type UseClusterProfilesResult = {
  clusters: ClusterGroup[];
  clusterProfiles: ClusterProfile[];
};

export function useClusterProfiles(
  clusterResult: TeamClusterRunPayload | null,
  selectedStatKeys: TeamStatKey[],
): UseClusterProfilesResult {
  const clusterAssignments = clusterResult?.assignments;
  const clusterK = clusterResult?.k ?? 0;

  const clusters = useMemo<ClusterGroup[]>(() => {
    if (!clusterAssignments) {
      return [];
    }

    return buildClusterGroups(clusterAssignments, clusterK);
  }, [clusterAssignments, clusterK]);

  const clusterProfiles = useMemo<ClusterProfile[]>(() => {
    if (!clusterAssignments) {
      return [];
    }

    return buildClusterProfiles(
      clusterAssignments,
      selectedStatKeys,
      clusterK,
    );
  }, [selectedStatKeys, clusterAssignments, clusterK]);

  return {
    clusters,
    clusterProfiles,
  };
}
