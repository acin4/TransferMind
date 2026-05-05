import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  calculateTeamClusterElbow,
  runTeamClusters,
  type TeamClusterEntryRequest,
  type TeamClusterElbowPayload,
  type TeamClusterRunPayload,
} from "../../api/api";
import type { TeamStatKey } from "../../teamStatsConfig";
import {
  ALL_STAT_CATEGORIES,
  filterTeamStatItemsByCategory,
  type StatCategoryFilterId,
} from "../../utils/statCategories";
import {
  ALL_COUNTRIES_TAB,
  filterItemsByCountry,
  type CountryFilterTab,
} from "../../utils/countryFilters";
import {
  ClusterAverageProfilesChart,
  ClusterMembershipSummary,
  ClusterSetupPanel,
  ElbowMethodPanel,
  MessageBox,
  ParallelCoordinatesPlot,
} from "../cluster-analysis/components";
import {
  areStatKeyArraysEqual,
  hasClusterEntryIds,
  sanitizeSelectedStatKeys,
} from "../cluster-analysis/utils/clusterAnalysisUtils";
import { useClusterProfiles } from "../cluster-analysis/hooks/useClusterProfiles";
import {
  getErrorMessage,
  getSafeStatLabel,
  safeCompareLabels,
} from "../cluster-analysis/utils/clusterFormatters";
import type {
  ClusterAnalysisTabProps,
  ClusterSetupOption,
  ClusterTeamSeasonEntry,
} from "../cluster-analysis/types";

export default function ClusterAnalysisTab({
  entries,
  statKeys: supportedStatKeys,
}: ClusterAnalysisTabProps) {
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<TeamStatKey[]>([]);
  const [selectedCountryFilter, setSelectedCountryFilter] =
    useState<CountryFilterTab>(ALL_COUNTRIES_TAB);
  const [selectedStatCategory, setSelectedStatCategory] =
    useState<StatCategoryFilterId>(ALL_STAT_CATEGORIES);
  const [maxK, setMaxK] = useState(8);
  const [selectedK, setSelectedK] = useState<number | null>(null);
  const [elbowResult, setElbowResult] =
    useState<TeamClusterElbowPayload | null>(null);
  const [clusterResult, setClusterResult] =
    useState<TeamClusterRunPayload | null>(null);
  const [loadingElbow, setLoadingElbow] = useState(false);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const clusterEntries = useMemo(
    () => entries.filter(hasClusterEntryIds),
    [entries],
  );

  const entryOptions = useMemo<ClusterSetupOption[]>(
    () =>
      clusterEntries
        .map((entry) => ({
          value: entry.id,
          label: entry.teamName || entry.label,
          helperText: [
            entry.seasonName || `Season ${entry.seasonId}`,
            entry.tournamentName ?? "Unknown league",
          ].join(" • "),
          kind: "team-season" as const,
          logoUrl: entry.teamLogo,
          country: entry.country ?? null,
          seasonLabel: entry.seasonName,
          tagLabel: entry.teamName || entry.label,
          tagHelperText: entry.seasonName,
          searchFields: [
            entry.teamName,
            entry.label,
            entry.seasonName,
            entry.seasonId,
            entry.tournamentName,
            entry.tournamentId,
            entry.stageLabel,
            entry.stageName,
            entry.groupName,
            entry.standingGroupId,
            entry.stageTournamentId,
            entry.country,
          ],
        }))
        .sort((a, b) => safeCompareLabels(a.label, b.label)),
    [clusterEntries],
  );

  const countryFilteredEntryOptions = useMemo(() => {
    return filterItemsByCountry(entryOptions, selectedCountryFilter);
  }, [entryOptions, selectedCountryFilter]);

  const entriesById = useMemo(
    () => new Map(clusterEntries.map((entry) => [entry.id, entry])),
    [clusterEntries],
  );

  const selectedEntries = useMemo(
    () =>
      selectedEntryIds
        .map((entryId) => entriesById.get(entryId))
        .filter((entry): entry is ClusterTeamSeasonEntry => Boolean(entry)),
    [entriesById, selectedEntryIds],
  );

  const selectedTeamSeasonEntries = useMemo<TeamClusterEntryRequest[]>(
    () =>
      selectedEntries.map((entry) => ({
        teamId: entry.teamId,
        tournamentId: entry.tournamentId,
        seasonId: entry.seasonId,
      })),
    [selectedEntries],
  );

  const maxAllowedK = Math.max(2, Math.min(20, selectedEntries.length));

  const availableStatKeys = useMemo(() => {
    return supportedStatKeys
      .filter((statKey) => Boolean(statKey))
      .sort((a, b) =>
        safeCompareLabels(getSafeStatLabel(a), getSafeStatLabel(b)),
      );
  }, [supportedStatKeys]);

  const availableStatKeySet = useMemo(
    () => new Set(availableStatKeys),
    [availableStatKeys],
  );

  const cleanedSelectedStatKeys = useMemo(
    () => sanitizeSelectedStatKeys(selectedStatKeys, availableStatKeySet),
    [availableStatKeySet, selectedStatKeys],
  );

  const statOptions = useMemo<ClusterSetupOption<TeamStatKey>[]>(
    () =>
      availableStatKeys
        .map((statKey) => ({
          value: statKey,
          label: getSafeStatLabel(statKey),
          helperText: statKey,
          kind: "stat" as const,
          statKey,
          searchFields: [getSafeStatLabel(statKey), statKey],
        }))
        .filter(
          (option) =>
            option &&
            option.value &&
            typeof option.label === "string" &&
            option.label.trim().length > 0,
        ),
    [availableStatKeys],
  );

  const categoryFilteredStatOptions = useMemo(() => {
    return filterTeamStatItemsByCategory(statOptions, selectedStatCategory);
  }, [selectedStatCategory, statOptions]);

  const validationMessage = useMemo(() => {
    if (selectedEntries.length < 3) {
      return "Select at least three team-season entries.";
    }

    if (cleanedSelectedStatKeys.length < 2) {
      return "Select at least two statistics.";
    }

    return null;
  }, [
    cleanedSelectedStatKeys.length,
    selectedEntries.length,
  ]);

  useEffect(() => {
    const availableEntryIds = new Set(clusterEntries.map((entry) => entry.id));
    setSelectedEntryIds((current) =>
      current.filter((entryId) => availableEntryIds.has(entryId)),
    );
  }, [clusterEntries]);

  useEffect(() => {
    if (!areStatKeyArraysEqual(selectedStatKeys, cleanedSelectedStatKeys)) {
      setSelectedStatKeys(cleanedSelectedStatKeys);
    }
  }, [cleanedSelectedStatKeys, selectedStatKeys]);

  useEffect(() => {
    setMaxK(maxAllowedK);
  }, [maxAllowedK]);

  useEffect(() => {
    setElbowResult(null);
    setClusterResult(null);
    setSelectedK(null);
    setRequestError(null);
  }, [cleanedSelectedStatKeys, maxK, selectedEntryIds]);

  useEffect(() => {
    setClusterResult(null);
  }, [selectedK]);

  const toggleEntry = (entryId: string) => {
    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((value) => value !== entryId)
        : [...current, entryId],
    );
  };

  const toggleStat = (statKey: string) => {
    const typedStatKey = statKey as TeamStatKey;

    if (!availableStatKeySet.has(typedStatKey)) {
      return;
    }

    setSelectedStatKeys((current) =>
      current.includes(typedStatKey)
        ? current.filter((value) => value !== typedStatKey)
        : [...current, typedStatKey],
    );
  };

  const selectVisibleStats = (visibleStatKeys: string[]) => {
    const visibleTypedStatKeys = visibleStatKeys.filter((statKey) =>
      availableStatKeySet.has(statKey as TeamStatKey),
    ) as TeamStatKey[];

    setSelectedStatKeys((current) => [
      ...current,
      ...visibleTypedStatKeys.filter((statKey) => !current.includes(statKey)),
    ]);
  };

  const clearVisibleStats = (visibleStatKeys: string[]) => {
    const visibleStatKeySet = new Set(visibleStatKeys);
    setSelectedStatKeys((current) =>
      current.filter((statKey) => !visibleStatKeySet.has(statKey)),
    );
  };

  const selectVisibleEntries = (visibleEntryIds: string[]) => {
    setSelectedEntryIds((current) => [
      ...current,
      ...visibleEntryIds.filter((entryId) => !current.includes(entryId)),
    ]);
  };

  const clearVisibleEntries = (visibleEntryIds: string[]) => {
    const visibleEntryIdSet = new Set(visibleEntryIds);
    setSelectedEntryIds((current) =>
      current.filter((entryId) => !visibleEntryIdSet.has(entryId)),
    );
  };

  const buildRequestPayload = () => {
    return {
      teamSeasonEntries: selectedTeamSeasonEntries,
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
  const maxKOptions = useMemo(
    () =>
      Array.from({ length: maxAllowedK - 1 }, (_, index) => {
        const value = index + 2;

        return {
          value,
          label: String(value),
        };
      }),
    [maxAllowedK],
  );
  const { clusters, clusterProfiles } = useClusterProfiles(
    clusterResult,
    cleanedSelectedStatKeys,
  );

  return (
    <div className="space-y-6">
      <ClusterSetupPanel
        maxK={maxK}
        maxKOptions={maxKOptions}
        matrixRowCount={selectedEntries.length}
        matrixColumnCount={cleanedSelectedStatKeys.length}
        entryOptions={entryOptions}
        countryFilteredEntryOptions={countryFilteredEntryOptions}
        selectedEntryIds={selectedEntryIds}
        selectedCountryFilter={selectedCountryFilter}
        statOptions={statOptions}
        categoryFilteredStatOptions={categoryFilteredStatOptions}
        selectedStatKeys={cleanedSelectedStatKeys}
        selectedStatCategory={selectedStatCategory}
        validationMessage={validationMessage}
        loadingElbow={loadingElbow}
        requestError={requestError}
        onMaxKChange={(value) => setMaxK(Number(value))}
        onEntryToggle={toggleEntry}
        onSelectVisibleEntries={selectVisibleEntries}
        onClearVisibleEntries={clearVisibleEntries}
        onCountryFilterChange={setSelectedCountryFilter}
        onStatToggle={toggleStat}
        onSelectVisibleStats={selectVisibleStats}
        onClearVisibleStats={clearVisibleStats}
        onStatCategoryChange={setSelectedStatCategory}
        onCalculateElbow={handleCalculateElbow}
      />

      {elbowResult ? (
        <ElbowMethodPanel
          elbowResult={elbowResult}
          selectedK={selectedK}
          kOptions={kOptions}
          loadingClusters={loadingClusters}
          onSelectedKChange={setSelectedK}
          onRunClusters={handleRunClusters}
        />
      ) : null}

      {clusterResult ? (
        <section className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
          <div className="mb-6">
            <h4 className="text-lg font-black uppercase tracking-tight text-white">
              Clustered Entries
            </h4>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3">
              Final K-Means used normalized 0-1 values only. Raw values are
              displayed for interpretation.
            </p>
          </div>

          {clusterResult.warnings.length > 0 ? (
            <MessageBox tone="warning" messages={clusterResult.warnings} />
          ) : null}

          <ClusterAverageProfilesChart
            profiles={clusterProfiles}
            statKeys={cleanedSelectedStatKeys}
          />

          <ParallelCoordinatesPlot
            result={clusterResult}
            statKeys={cleanedSelectedStatKeys}
          />

          <ClusterMembershipSummary clusters={clusters} />
        </section>
      ) : null}
    </div>
  );
}
