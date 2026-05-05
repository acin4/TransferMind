import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  calculateTeamClusterElbow,
  runTeamClusters,
} from "../../../api/api";
import type {
  TeamClusterElbowPayload,
  TeamClusterEntryRequest,
  TeamClusterRunPayload,
} from "../../../api/api";
import type { TeamStatKey } from "../../../teamStatsConfig";
import { getErrorMessage } from "../utils/clusterFormatters";

export type UseClusterRequestsParams = {
  requestPayloadEntries: TeamClusterEntryRequest[];
  cleanedSelectedStatKeys: TeamStatKey[];
  maxK: number;
  selectedEntryIds: string[];
  validationMessage: string | null;
};

export type UseClusterRequestsResult = {
  selectedK: number | null;
  setSelectedK: Dispatch<SetStateAction<number | null>>;
  elbowResult: TeamClusterElbowPayload | null;
  clusterResult: TeamClusterRunPayload | null;
  loadingElbow: boolean;
  loadingClusters: boolean;
  requestError: string | null;
  handleCalculateElbow: () => Promise<void>;
  handleRunClusters: () => Promise<void>;
  kOptions: number[];
};

export function useClusterRequests({
  requestPayloadEntries,
  cleanedSelectedStatKeys,
  maxK,
  selectedEntryIds,
  validationMessage,
}: UseClusterRequestsParams): UseClusterRequestsResult {
  const [selectedK, setSelectedK] = useState<number | null>(null);
  const [elbowResult, setElbowResult] =
    useState<TeamClusterElbowPayload | null>(null);
  const [clusterResult, setClusterResult] =
    useState<TeamClusterRunPayload | null>(null);
  const [loadingElbow, setLoadingElbow] = useState(false);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    setElbowResult(null);
    setClusterResult(null);
    setSelectedK(null);
    setRequestError(null);
  }, [cleanedSelectedStatKeys, maxK, selectedEntryIds]);

  useEffect(() => {
    setClusterResult(null);
  }, [selectedK]);

  const buildRequestPayload = () => {
    return {
      teamSeasonEntries: requestPayloadEntries,
      statKeys: cleanedSelectedStatKeys,
    };
  };

  const handleCalculateElbow = async () => {
    const payload = buildRequestPayload();

    if (validationMessage) {
      setRequestError(validationMessage ?? "Complete the clustering inputs.");
      return;
    }

    try {
      setLoadingElbow(true);
      setRequestError(null);
      setClusterResult(null);

      const result = await calculateTeamClusterElbow({
        ...payload,
        maxK,
      });

      setElbowResult(result);
      setSelectedK(result.suggestedK ?? Math.min(2, result.maxK));
    } catch (error) {
      setElbowResult(null);
      setRequestError(getErrorMessage(error));
    } finally {
      setLoadingElbow(false);
    }
  };

  const handleRunClusters = async () => {
    const payload = buildRequestPayload();

    if (selectedK == null) {
      setRequestError("Calculate elbow data and choose K first.");
      return;
    }

    try {
      setLoadingClusters(true);
      setRequestError(null);

      const result = await runTeamClusters({
        ...payload,
        k: selectedK,
      });

      setClusterResult(result);
    } catch (error) {
      setClusterResult(null);
      setRequestError(getErrorMessage(error));
    } finally {
      setLoadingClusters(false);
    }
  };

  const kOptions = useMemo(
    () =>
      elbowResult
        ? Array.from({ length: elbowResult.maxK - 1 }, (_, index) => index + 2)
        : [],
    [elbowResult],
  );

  return {
    selectedK,
    setSelectedK,
    elbowResult,
    clusterResult,
    loadingElbow,
    loadingClusters,
    requestError,
    handleCalculateElbow,
    handleRunClusters,
    kOptions,
  };
}
