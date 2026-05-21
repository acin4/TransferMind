import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  calculateTeamClusterElbow,
  runTeamAgglomerativeClusters,
  runTeamClusters,
} from "../../../api/api";
import type {
  TeamAgglomerativeClusterRunPayload,
  TeamAgglomerativeLinkage,
  TeamClusterElbowPayload,
  TeamClusterEntryRequest,
  TeamClusterRunPayload,
} from "../../../api/api";
import type { TeamStatKey } from "../../../teamStatsConfig";
import { getErrorMessage } from "../utils/clusterFormatters";

const AGGLOMERATIVE_LINKAGES: ReadonlySet<TeamAgglomerativeLinkage> = new Set([
  "ward",
  "complete",
  "average",
  "single",
]);

function getMatrixValidationMessage({
  entryCount,
  statCount,
}: {
  entryCount: number;
  statCount: number;
}) {
  if (entryCount === 0) {
    return "Select at least one team-season entry.";
  }

  if (statCount === 0) {
    return "Select at least one statistic.";
  }

  if (entryCount < 3) {
    return "Select at least three team-season entries.";
  }

  if (statCount < 2) {
    return "Select at least two statistics.";
  }

  return null;
}

export type UseClusterRequestsParams = {
  requestPayloadEntries: TeamClusterEntryRequest[];
  cleanedSelectedStatKeys: TeamStatKey[];
  maxK: number;
  selectedAlgorithm: "kmeans" | "agglomerative";
  agglomerativeK: number;
  agglomerativeLinkage: TeamAgglomerativeLinkage;
  selectedEntryIds: string[];
  validationMessage: string | null;
};

export type UseClusterRequestsResult = {
  selectedK: number | null;
  setSelectedK: Dispatch<SetStateAction<number | null>>;
  elbowResult: TeamClusterElbowPayload | null;
  clusterResult: TeamClusterRunPayload | null;
  agglomerativeResult: TeamAgglomerativeClusterRunPayload | null;
  loadingElbow: boolean;
  loadingClusters: boolean;
  loadingAgglomerative: boolean;
  requestError: string | null;
  handleCalculateElbow: () => Promise<void>;
  handleRunClusters: () => Promise<void>;
  handleRunAgglomerative: () => Promise<void>;
  kOptions: number[];
};

function getAgglomerativeValidationMessage({
  entryCount,
  k,
  linkage,
  statCount,
}: {
  entryCount: number;
  k: number;
  linkage: TeamAgglomerativeLinkage;
  statCount: number;
}) {
  if (!Number.isInteger(k) || k < 2) {
    return "Choose at least two Agglomerative clusters.";
  }

  if (entryCount === 0) {
    return "Select at least one team-season entry.";
  }

  if (entryCount < k) {
    return `Select at least ${k} team-season entries for ${k} Agglomerative clusters.`;
  }

  if (entryCount < 3) {
    return "Select at least three team-season entries.";
  }

  if (statCount === 0) {
    return "Select at least one statistic.";
  }

  if (k > entryCount) {
    return `Choose no more than ${entryCount} Agglomerative clusters.`;
  }

  if (!AGGLOMERATIVE_LINKAGES.has(linkage)) {
    return 'Choose a linkage method: "ward", "complete", "average", or "single".';
  }

  return null;
}

export function useClusterRequests({
  requestPayloadEntries,
  cleanedSelectedStatKeys,
  maxK,
  selectedAlgorithm,
  agglomerativeK,
  agglomerativeLinkage,
  selectedEntryIds,
  validationMessage,
}: UseClusterRequestsParams): UseClusterRequestsResult {
  const [selectedK, setSelectedK] = useState<number | null>(null);
  const [elbowResult, setElbowResult] =
    useState<TeamClusterElbowPayload | null>(null);
  const [clusterResult, setClusterResult] =
    useState<TeamClusterRunPayload | null>(null);
  const [agglomerativeResult, setAgglomerativeResult] =
    useState<TeamAgglomerativeClusterRunPayload | null>(null);
  const [loadingElbow, setLoadingElbow] = useState(false);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [loadingAgglomerative, setLoadingAgglomerative] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const latestAgglomerativeRequestIdRef = useRef(0);

  useEffect(() => {
    setElbowResult(null);
    setClusterResult(null);
    setAgglomerativeResult(null);
    setSelectedK(null);
    setRequestError(null);
  }, [
    cleanedSelectedStatKeys,
    maxK,
    selectedAlgorithm,
    selectedEntryIds,
  ]);

  useEffect(() => {
    setClusterResult(null);
  }, [selectedK]);

  useEffect(() => {
    setAgglomerativeResult(null);
  }, [agglomerativeK, agglomerativeLinkage]);

  const buildRequestPayload = useCallback(() => {
    return {
      teamSeasonEntries: requestPayloadEntries,
      statKeys: cleanedSelectedStatKeys,
    };
  }, [cleanedSelectedStatKeys, requestPayloadEntries]);

  const handleCalculateElbow = useCallback(async () => {
    const payload = buildRequestPayload();
    const matrixValidationMessage = getMatrixValidationMessage({
      entryCount: payload.teamSeasonEntries.length,
      statCount: payload.statKeys.length,
    });

    if (matrixValidationMessage || validationMessage) {
      setRequestError(
        matrixValidationMessage ??
          validationMessage ??
          "Complete the clustering inputs.",
      );
      return;
    }

    try {
      setLoadingElbow(true);
      setRequestError(null);
      setClusterResult(null);
      setAgglomerativeResult(null);

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
  }, [buildRequestPayload, maxK, validationMessage]);

  const handleRunClusters = useCallback(async () => {
    const payload = buildRequestPayload();
    const matrixValidationMessage = getMatrixValidationMessage({
      entryCount: payload.teamSeasonEntries.length,
      statCount: payload.statKeys.length,
    });

    if (matrixValidationMessage) {
      setRequestError(matrixValidationMessage);
      return;
    }

    if (selectedK == null) {
      setRequestError("Calculate elbow data and choose K first.");
      return;
    }

    try {
      setLoadingClusters(true);
      setRequestError(null);
      setAgglomerativeResult(null);

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
  }, [buildRequestPayload, selectedK]);

  const handleRunAgglomerative = useCallback(async () => {
    if (selectedAlgorithm !== "agglomerative") {
      setRequestError("Switch to Agglomerative clustering before running it.");
      return;
    }

    const payload = buildRequestPayload();

    const agglomerativeValidationMessage = getAgglomerativeValidationMessage({
      entryCount: payload.teamSeasonEntries.length,
      k: agglomerativeK,
      linkage: agglomerativeLinkage,
      statCount: payload.statKeys.length,
    });

    if (agglomerativeValidationMessage) {
      setRequestError(agglomerativeValidationMessage);
      return;
    }

    const requestId = latestAgglomerativeRequestIdRef.current + 1;
    latestAgglomerativeRequestIdRef.current = requestId;

    try {
      setLoadingAgglomerative(true);
      setRequestError(null);
      setElbowResult(null);
      setClusterResult(null);
      setAgglomerativeResult(null);

      const agglomerativePayload = {
        ...payload,
        algorithm: "agglomerative",
        k: agglomerativeK,
        linkage: agglomerativeLinkage,
      } as const;

      const result = await runTeamAgglomerativeClusters(agglomerativePayload);

      if (latestAgglomerativeRequestIdRef.current === requestId) {
        setAgglomerativeResult(result);
      }
    } catch (error) {
      if (latestAgglomerativeRequestIdRef.current === requestId) {
        setAgglomerativeResult(null);
        setRequestError(getErrorMessage(error));
      }
    } finally {
      if (latestAgglomerativeRequestIdRef.current === requestId) {
        setLoadingAgglomerative(false);
      }
    }
  }, [
    agglomerativeK,
    agglomerativeLinkage,
    buildRequestPayload,
    selectedAlgorithm,
  ]);

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
    agglomerativeResult,
    loadingElbow,
    loadingClusters,
    loadingAgglomerative,
    requestError,
    handleCalculateElbow,
    handleRunClusters,
    handleRunAgglomerative,
    kOptions,
  };
}
