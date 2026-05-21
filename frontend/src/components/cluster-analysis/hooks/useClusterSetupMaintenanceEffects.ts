import {
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { TeamStatKey } from "../../../teamStatsConfig";
import type { ClusterTeamSeasonEntry } from "../types";
import { areStatKeyArraysEqual } from "../utils/clusterAnalysisUtils";

export type UseClusterSetupMaintenanceEffectsParams = {
  clusterEntries: ClusterTeamSeasonEntry[];
  cleanedSelectedStatKeys: TeamStatKey[];
  maxAllowedK: number;
  setSelectedEntryIds: Dispatch<SetStateAction<string[]>>;
  selectedStatKeys: TeamStatKey[];
  setSelectedStatKeys: Dispatch<SetStateAction<TeamStatKey[]>>;
  setMaxK: Dispatch<SetStateAction<number>>;
  setAgglomerativeK: Dispatch<SetStateAction<number>>;
};

export function useClusterSetupMaintenanceEffects({
  clusterEntries,
  cleanedSelectedStatKeys,
  maxAllowedK,
  setSelectedEntryIds,
  selectedStatKeys,
  setSelectedStatKeys,
  setMaxK,
  setAgglomerativeK,
}: UseClusterSetupMaintenanceEffectsParams) {
  useEffect(() => {
    const availableEntryIds = new Set(clusterEntries.map((entry) => entry.id));
    setSelectedEntryIds((current) =>
      current.filter((entryId) => availableEntryIds.has(entryId)),
    );
  }, [clusterEntries, setSelectedEntryIds]);

  useEffect(() => {
    if (!areStatKeyArraysEqual(selectedStatKeys, cleanedSelectedStatKeys)) {
      setSelectedStatKeys(cleanedSelectedStatKeys);
    }
  }, [cleanedSelectedStatKeys, selectedStatKeys, setSelectedStatKeys]);

  useEffect(() => {
    setMaxK(maxAllowedK);
  }, [maxAllowedK, setMaxK]);

  useEffect(() => {
    setAgglomerativeK((current) => Math.min(Math.max(2, current), maxAllowedK));
  }, [maxAllowedK, setAgglomerativeK]);
}
