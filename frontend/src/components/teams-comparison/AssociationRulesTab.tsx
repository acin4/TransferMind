import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  runTeamAssociationRules,
  type TeamAssociationRule,
  type TeamAssociationRulesPayload,
} from "../../api/api";
import {
  getTeamStatCategory,
  getTeamStatMeta,
  type TeamStatKey,
} from "../../teamStatsConfig";
import {
  ALL_COUNTRIES_TAB,
  COUNTRY_FILTER_TABS,
  filterItemsByCountry,
  type CountryFilterTab,
} from "../../utils/countryFilters";
import {
  ALL_STAT_CATEGORIES,
  filterTeamStatItemsByCategory,
  type StatCategoryFilterId,
} from "../../utils/statCategories";
import type { TeamSeasonStatEntry } from "../../utils/teamsComparison";
import SegmentedTabs from "../ui/SegmentedTabs";
import { ContentPanel, standingsTheme } from "../ui/design";
import SearchableCheckboxPanel from "./SearchableCheckboxPanel";
import StatCategoryFilterTabs from "./StatCategoryFilterTabs";

const MIN_TEAM_SEASON_ENTRIES = 5;
const MIN_STATS = 2;
const DEFAULT_MIN_SUPPORT = 0.2;
const DEFAULT_MIN_CONFIDENCE = 0.6;
const DEFAULT_MIN_LIFT = "1.01";
const ASSOCIATION_RULES_PAGE_SIZE = 50;
const MAX_DISPLAY_RULES = 100;
const TOP_RULES_CHART_LIMIT = 10;
const MAX_RULE_AXIS_LABEL_LENGTH = 46;
const ASSOCIATION_RULES_ERROR_MESSAGE =
  "Unable to complete Association Rules Mining. Check the selected entries and thresholds, then try again.";

type AssociationRulesTabProps = {
  entries: TeamSeasonStatEntry[];
  statKeys: TeamStatKey[];
};

type AssociationRuleTeamSeasonEntry = TeamSeasonStatEntry & {
  tournamentId: number;
};

type AssociationRuleChartRow = {
  id: string;
  label: string;
  lift: number;
  confidence: number;
  support: number;
};

export default function AssociationRulesTab({
  entries,
  statKeys,
}: AssociationRulesTabProps) {
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<TeamStatKey[]>([]);
  const [selectedCountryFilter, setSelectedCountryFilter] =
    useState<CountryFilterTab>(ALL_COUNTRIES_TAB);
  const [selectedStatCategory, setSelectedStatCategory] =
    useState<StatCategoryFilterId>(ALL_STAT_CATEGORIES);
  const [minSupport, setMinSupport] = useState(DEFAULT_MIN_SUPPORT);
  const [minConfidence, setMinConfidence] = useState(DEFAULT_MIN_CONFIDENCE);
  const [minLift, setMinLift] = useState(DEFAULT_MIN_LIFT);
  const [associationRulesPage, setAssociationRulesPage] = useState(1);
  const [result, setResult] = useState<TeamAssociationRulesPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    setAssociationRulesPage(1);
    setResult(null);
    setRequestError(null);
  }, [
    minConfidence,
    minLift,
    minSupport,
    selectedEntryIds,
    selectedStatKeys,
  ]);

  const analysisEntries = useMemo(
    () => entries.filter(hasAssociationRuleEntryIds),
    [entries],
  );

  const entryOptions = useMemo(
    () =>
      analysisEntries.map((entry) => ({
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
      })),
    [analysisEntries],
  );

  const countryFilteredEntryOptions = useMemo(() => {
    return filterItemsByCountry(entryOptions, selectedCountryFilter);
  }, [entryOptions, selectedCountryFilter]);

  const statOptions = useMemo(
    () =>
      statKeys.map((statKey) => ({
        value: statKey,
        label: getTeamStatMeta(statKey).label,
        helperText: statKey,
        kind: "stat" as const,
        statKey,
        searchFields: [getTeamStatMeta(statKey).label, statKey],
      })),
    [statKeys],
  );

  const categoryFilteredStatOptions = useMemo(() => {
    return filterTeamStatItemsByCategory(statOptions, selectedStatCategory);
  }, [selectedStatCategory, statOptions]);

  const selectedEntries = useMemo(
    () => analysisEntries.filter((entry) => selectedEntryIds.includes(entry.id)),
    [analysisEntries, selectedEntryIds],
  );

  const selectedStats = useMemo(
    () => statKeys.filter((statKey) => selectedStatKeys.includes(statKey)),
    [selectedStatKeys, statKeys],
  );

  const parsedMinLift = useMemo(() => {
    const trimmedMinLift = minLift.trim();

    return trimmedMinLift === "" ? null : Number(trimmedMinLift);
  }, [minLift]);

  const validationMessage = useMemo(() => {
    if (selectedEntries.length < MIN_TEAM_SEASON_ENTRIES) {
      return `Select at least ${MIN_TEAM_SEASON_ENTRIES} team-season entries.`;
    }

    if (selectedStats.length < MIN_STATS) {
      return `Select at least ${MIN_STATS} statistics.`;
    }

    if (!isProbabilityThreshold(minSupport)) {
      return "Minimum support must be greater than 0 and at most 1.";
    }

    if (!isProbabilityThreshold(minConfidence)) {
      return "Minimum confidence must be greater than 0 and at most 1.";
    }

    if (
      parsedMinLift !== null &&
      (!Number.isFinite(parsedMinLift) || parsedMinLift <= 1)
    ) {
      return "Minimum lift must be greater than 1.";
    }

    return null;
  }, [
    minConfidence,
    minSupport,
    parsedMinLift,
    selectedEntries.length,
    selectedStats.length,
  ]);

  const selectedStatKeySet = useMemo(
    () => new Set(selectedStats),
    [selectedStats],
  );

  const displayRules = useMemo(() => {
    if (!Array.isArray(result?.rules)) {
      return [];
    }

    return result.rules.slice(0, MAX_DISPLAY_RULES);
  }, [result?.rules]);
  const currentAssociationRulesPage = result?.context.page ?? associationRulesPage;

  const toggleEntry = (entryId: string) => {
    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((value) => value !== entryId)
        : [...current, entryId],
    );
  };

  const toggleStat = (statKey: string) => {
    const typedStatKey = statKey as TeamStatKey;

    if (!statKeys.includes(typedStatKey)) {
      return;
    }

    setSelectedStatKeys((current) =>
      current.includes(typedStatKey)
        ? current.filter((value) => value !== typedStatKey)
        : [...current, typedStatKey],
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

  const selectVisibleStats = (visibleStatKeys: string[]) => {
    const visibleTypedStatKeys = visibleStatKeys.filter((statKey) =>
      statKeys.includes(statKey as TeamStatKey),
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

  const handleRunAssociationRules = async (page = 1) => {
    if (validationMessage || loading) {
      return;
    }

    try {
      setLoading(true);
      setRequestError(null);
      setResult(null);

      const nextResult = await runTeamAssociationRules({
        teamSeasonEntries: selectedEntries.map((entry) => ({
          teamId: entry.teamId,
          tournamentId: entry.tournamentId,
          seasonId: entry.seasonId,
        })),
        statKeys: selectedStats,
        minSupport,
        minConfidence,
        ...(parsedMinLift !== null ? { minLift: parsedMinLift } : {}),
        page,
        pageSize: ASSOCIATION_RULES_PAGE_SIZE,
      });

      setAssociationRulesPage(nextResult.context.page);
      setResult(nextResult);
    } catch (error) {
      console.error("Failed to run Association Rules Mining:", error);
      setResult(null);
      setRequestError(getRequestErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
      <div className="space-y-6">
        <SearchableCheckboxPanel
          title="Team + Season Entries"
          subtitle="Select at least five entries"
          items={countryFilteredEntryOptions}
          selectionItems={entryOptions}
          selectedValues={selectedEntryIds}
          onToggle={toggleEntry}
          onSelectVisible={selectVisibleEntries}
          onClearVisible={clearVisibleEntries}
          controls={
            <SegmentedTabs
              items={COUNTRY_FILTER_TABS.map((country) => ({
                value: country,
                label: country,
              }))}
              value={selectedCountryFilter}
              onChange={setSelectedCountryFilter}
              className={standingsTheme.compactSegmentedTabs}
              buttonClassName={standingsTheme.compactSegmentedTabButton}
              activeClassName="bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.25)]"
              inactiveClassName="text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
            />
          }
          searchPlaceholder="Search team or season..."
          maxHeightClassName="max-h-[360px]"
        />

        <SearchableCheckboxPanel
          title="Statistics"
          subtitle="Pick at least two stats"
          items={categoryFilteredStatOptions}
          selectionItems={statOptions}
          selectedValues={selectedStatKeys}
          onToggle={toggleStat}
          onSelectVisible={selectVisibleStats}
          onClearVisible={clearVisibleStats}
          controls={
            <StatCategoryFilterTabs
              value={selectedStatCategory}
              onChange={setSelectedStatCategory}
            />
          }
          searchPlaceholder="Search statistic..."
          maxHeightClassName="max-h-[320px]"
        />
      </div>

      <ContentPanel>
        <div className="flex flex-col gap-5 mb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                Association Rules Mining
              </h3>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3">
                Apriori pattern discovery for repeated low, medium, and high
                stat bins across selected team-seasons.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill label={`${selectedEntries.length} entries`} />
              <StatusPill label={`${selectedStats.length} stats`} />
              <StatusPill label={`${result?.context.ruleCount ?? 0} rules`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ThresholdInput
              label="Min Support"
              value={minSupport}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => setMinSupport(Number(value))}
            />
            <ThresholdInput
              label="Min Confidence"
              value={minConfidence}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => setMinConfidence(Number(value))}
            />
            <ThresholdInput
              label="Min Lift (Optional)"
              value={minLift}
              min={1.01}
              step={0.01}
              onChange={setMinLift}
            />
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Fixed low, medium, and high bins are used in this first version.
            Negative-direction stats are direction-adjusted before binning, so
            high means better performance. Only positive associations are shown:
            lift must be greater than 1.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {validationMessage ?? "Ready to run Apriori association rules."}
            </div>
            <button
              type="button"
              onClick={() => handleRunAssociationRules(1)}
              disabled={Boolean(validationMessage) || loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "Mining Rules..." : "Run Apriori"}
            </button>
          </div>
        </div>

        {requestError ? <MessageBox tone="error" message={requestError} /> : null}

        {result?.warnings && result.warnings.length > 0 ? (
          <div className="mb-6">
            <MessageBox tone="warning" message={result.warnings.join(" ")} />
          </div>
        ) : null}

        {result && displayRules.length > 0 ? (
          <div className="mb-6">
            <MessageBox
              tone="info"
              message={`Showing page ${currentAssociationRulesPage} of ${result.context.totalPages} sorted by lift, confidence, and support.`}
            />
          </div>
        ) : null}

        {loading ? (
          <LoadingState />
        ) : validationMessage ? (
          <EmptyState message={validationMessage} />
        ) : requestError ? (
          <EmptyState message="The Apriori request could not be completed. Try again after checking the selected entries and thresholds." />
        ) : !result ? (
          <EmptyState message="Choose team-season entries and statistics, then run Apriori to discover repeated stat-bin patterns." />
        ) : result && displayRules.length === 0 ? (
          <EmptyState message="No association rules matched these thresholds. Lower support, confidence, or lift and run Apriori again." />
        ) : result ? (
          <div className="space-y-6">
            <AssociationRulesSuccessSummary result={result} />
            <TopAssociationRulesChart
              rules={displayRules}
              selectedStatKeySet={selectedStatKeySet}
            />
            <AssociationRulesTable
              rules={displayRules}
              selectedStatKeySet={selectedStatKeySet}
            />
            <AssociationRulesPaginationControls
              context={result.context}
              loading={loading}
              onPageChange={handleRunAssociationRules}
            />
          </div>
        ) : null}
      </ContentPanel>
    </div>
  );
}

function hasAssociationRuleEntryIds(
  entry: TeamSeasonStatEntry,
): entry is AssociationRuleTeamSeasonEntry {
  return typeof entry.tournamentId === "number";
}

function isProbabilityThreshold(value: number) {
  return Number.isFinite(value) && value > 0 && value <= 1;
}

function getRequestErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : ASSOCIATION_RULES_ERROR_MESSAGE;
}

function TopAssociationRulesChart({
  rules,
  selectedStatKeySet,
}: {
  rules: TeamAssociationRule[];
  selectedStatKeySet: Set<TeamStatKey>;
}) {
  const chartData = useMemo(
    () =>
      rules
        .slice()
        .sort((left, right) => right.lift - left.lift)
        .slice(0, TOP_RULES_CHART_LIMIT)
        .map((rule, index) => ({
          id: `${rule.antecedents.join("|")}->${
            rule.consequents.join("|")
          }-${index}`,
          label: formatAssociationRuleLabel(rule, selectedStatKeySet),
          lift: Number(rule.lift.toFixed(2)),
          confidence: rule.confidence,
          support: rule.support,
        })),
    [rules, selectedStatKeySet],
  );

  return (
    <div className="rounded-[2rem] border border-slate-800 bg-slate-950/30 p-5">
      <div className="mb-5">
        <h4 className="text-sm font-black uppercase tracking-widest text-white">
          Top Rules by Lift
        </h4>
        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
          Highest-lift association rules from the current Apriori result.
        </p>
      </div>

      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={{ stroke: "#334155" }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={260}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={{ stroke: "#334155" }}
              tickFormatter={truncateRuleAxisLabel}
            />
            <Tooltip content={<AssociationRuleChartTooltip />} />
            <Bar dataKey="lift" name="Lift" radius={[0, 10, 10, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AssociationRuleChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: AssociationRuleChartRow;
  }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const rule = payload[0].payload;

  if (!rule) {
    return null;
  }

  return (
    <div className="max-w-md rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        Rule Details
      </p>
      <p className="mt-3 text-sm font-bold leading-6 text-white">
        {rule.label}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs font-black uppercase tracking-widest">
        <div>
          <div className="text-slate-500">Lift</div>
          <div className="mt-1 text-white">{rule.lift.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-slate-500">Confidence</div>
          <div className="mt-1 text-white">{formatPercent(rule.confidence)}</div>
        </div>
        <div>
          <div className="text-slate-500">Support</div>
          <div className="mt-1 text-white">{formatPercent(rule.support)}</div>
        </div>
      </div>
    </div>
  );
}

function ThresholdInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number | string;
  min?: number;
  max?: number;
  step: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="mt-2 w-full bg-transparent text-sm font-black text-white outline-none"
      />
    </label>
  );
}

function AssociationRulesTable({
  rules,
  selectedStatKeySet,
}: {
  rules: TeamAssociationRule[];
  selectedStatKeySet: Set<TeamStatKey>;
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className={standingsTheme.tableHead}>
            <tr>
              <th className="px-5 py-4">Antecedents</th>
              <th className="px-5 py-4">Consequents</th>
              <th className="px-5 py-4">Support</th>
              <th className="px-5 py-4">Confidence</th>
              <th className="px-5 py-4">Lift</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, index) => (
              <tr
                key={`${rule.antecedents.join("|")}->${
                  rule.consequents.join("|")
                }-${index}`}
                className="border-t border-slate-800/70 hover:bg-blue-500/[0.03]"
              >
                <td className="px-5 py-4 align-top">
                  <RuleItems
                    items={rule.antecedents}
                    selectedStatKeySet={selectedStatKeySet}
                  />
                </td>
                <td className="px-5 py-4 align-top">
                  <RuleItems
                    items={rule.consequents}
                    selectedStatKeySet={selectedStatKeySet}
                  />
                </td>
                <MetricCell value={formatPercent(rule.support)} />
                <MetricCell value={formatPercent(rule.confidence)} />
                <MetricCell value={rule.lift.toFixed(2)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssociationRulesPaginationControls({
  context,
  loading,
  onPageChange,
}: {
  context: TeamAssociationRulesPayload["context"];
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const previousPage = Math.max(context.page - 1, 1);
  const nextPage = context.page + 1;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
        Page {context.page} of {context.totalPages} • {context.returnedRuleCount} of{" "}
        {context.totalRuleCount} rules
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(previousPage)}
          disabled={!context.hasPreviousPage || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-200 transition-colors hover:border-blue-400 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(nextPage)}
          disabled={!context.hasNextPage || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-200 transition-colors hover:border-blue-400 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function formatAssociationRuleLabel(
  rule: TeamAssociationRule,
  selectedStatKeySet: Set<TeamStatKey>,
) {
  const antecedents = rule.antecedents
    .map((item) => formatRuleItemLabel(item, selectedStatKeySet))
    .join(" + ");
  const consequents = rule.consequents
    .map((item) => formatRuleItemLabel(item, selectedStatKeySet))
    .join(" + ");

  return `${antecedents} -> ${consequents}`;
}

function RuleItems({
  items,
  selectedStatKeySet,
}: {
  items: string[];
  selectedStatKeySet: Set<TeamStatKey>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-200"
        >
          <RuleItemLabel item={item} selectedStatKeySet={selectedStatKeySet} />
        </span>
      ))}
    </div>
  );
}

function RuleItemLabel({
  item,
  selectedStatKeySet,
}: {
  item: string;
  selectedStatKeySet: Set<TeamStatKey>;
}) {
  const parsedItem = parseRuleItem(item, selectedStatKeySet);

  if (!parsedItem) {
    return <>{formatUnknownRuleItem(item)}</>;
  }

  const category = getTeamStatCategory(parsedItem.statKey);

  return (
    <span className="flex flex-col gap-1">
      <span>{`${parsedItem.bin} ${getTeamStatMeta(parsedItem.statKey).label}`}</span>
      {category ? (
        <span className="text-[10px] text-slate-500">{category}</span>
      ) : null}
    </span>
  );
}

function formatRuleItemLabel(item: string, selectedStatKeySet: Set<TeamStatKey>) {
  const parsedItem = parseRuleItem(item, selectedStatKeySet);

  if (!parsedItem) {
    return formatUnknownRuleItem(item);
  }

  return `${parsedItem.bin} ${getTeamStatMeta(parsedItem.statKey).label}`;
}

function MetricCell({ value }: { value: string }) {
  return (
    <td className="px-5 py-4 align-top text-sm font-black text-white">
      {value}
    </td>
  );
}

function parseRuleItem(item: string, selectedStatKeySet: Set<TeamStatKey>) {
  const suffixes = ["_low", "_medium", "_high"] as const;
  const suffix = suffixes.find((candidate) => item.endsWith(candidate));

  if (!suffix) {
    return null;
  }

  const statKey = item.slice(0, -suffix.length) as TeamStatKey;

  if (!selectedStatKeySet.has(statKey)) {
    return null;
  }

  return {
    statKey,
    bin: suffix.slice(1),
  };
}

function formatUnknownRuleItem(item: string) {
  const readableItem = item.trim().replace(/_/g, " ");
  return readableItem || "Unknown item";
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function truncateRuleAxisLabel(label: string) {
  return label.length > MAX_RULE_AXIS_LABEL_LENGTH
    ? `${label.slice(0, MAX_RULE_AXIS_LABEL_LENGTH - 1)}...`
    : label;
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className={standingsTheme.compactPill}>
      {label}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[420px] rounded-[3rem] border-2 border-dashed border-blue-500/30 bg-blue-500/5 flex flex-col items-center justify-center gap-4 text-center px-8">
      <Loader2 size={28} className="animate-spin text-blue-300" />
      <p className="max-w-xl text-sm font-black uppercase tracking-widest text-blue-200">
        Mining association rules from the selected team-seasons and statistics.
      </p>
    </div>
  );
}

function AssociationRulesSuccessSummary({
  result,
}: {
  result: TeamAssociationRulesPayload;
}) {
  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
      <div className="grid grid-cols-1 gap-3 text-xs font-black uppercase tracking-widest text-emerald-100 sm:grid-cols-4">
        <SummaryMetric label="Rules" value={result.context.ruleCount} />
        <SummaryMetric label="Entries" value={result.context.selectedEntryCount} />
        <SummaryMetric label="Stats" value={result.context.selectedStatCount} />
        <SummaryMetric label="Items" value={result.context.itemCount} />
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="text-emerald-300/70">{label}</div>
      <div className="mt-1 text-base text-white">{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="min-h-[420px] rounded-[3rem] border-2 border-dashed border-slate-800 bg-slate-900/20 flex items-center justify-center text-center px-8">
      <p className="max-w-xl text-sm font-black uppercase tracking-widest text-slate-500">
        {message}
      </p>
    </div>
  );
}

function MessageBox({
  tone,
  message,
}: {
  tone: "error" | "warning" | "info";
  message: string;
}) {
  const toneClassName =
    tone === "error"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : "border-blue-500/30 bg-blue-500/10 text-blue-200";

  return (
    <div
      className={`mb-6 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-widest ${toneClassName}`}
    >
      {message}
    </div>
  );
}
