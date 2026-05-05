import { memo } from "react";
import { COUNTRY_FILTER_TABS } from "../../../utils/countryFilters";
import SearchableCheckboxPanel from "../../teams-comparison/SearchableCheckboxPanel";
import StatCategoryFilterTabs from "../../teams-comparison/StatCategoryFilterTabs";
import SegmentedTabs from "../../ui/SegmentedTabs";
import type { ClusterSetupPanelProps } from "../types";
import { MessageBox } from "./MessageBox";
import { SelectField } from "./SelectField";

export const ClusterSetupPanel = memo(function ClusterSetupPanel({
  maxK,
  maxKOptions,
  matrixRowCount,
  matrixColumnCount,
  entryOptions,
  countryFilteredEntryOptions,
  selectedEntryIds,
  selectedCountryFilter,
  statOptions,
  categoryFilteredStatOptions,
  selectedStatKeys,
  selectedStatCategory,
  validationMessage,
  loadingElbow,
  requestError,
  onMaxKChange,
  onEntryToggle,
  onSelectVisibleEntries,
  onClearVisibleEntries,
  onCountryFilterChange,
  onStatToggle,
  onSelectVisibleStats,
  onClearVisibleStats,
  onStatCategoryChange,
  onCalculateElbow,
}: ClusterSetupPanelProps) {
  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
      <div className="mb-8">
        <h3 className="text-xl font-black uppercase tracking-tight text-white">
          Cluster Analysis
        </h3>
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3 max-w-4xl">
          Rows are selected team-seasons. Columns are selected statistics. Each
          statistic column is Min-Max normalized to 0-1 before K-Means.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-4 mb-6">
        <SelectField
          label="Max K"
          value={maxK}
          onChange={onMaxKChange}
          options={maxKOptions}
        />
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Matrix
          </p>
          <p className="mt-2 text-sm font-black text-white">
            {matrixRowCount} rows x {matrixColumnCount} columns
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SearchableCheckboxPanel
          title="Teams"
          subtitle="Dataset rows"
          items={countryFilteredEntryOptions}
          selectionItems={entryOptions}
          selectedValues={selectedEntryIds}
          onToggle={onEntryToggle}
          onSelectVisible={onSelectVisibleEntries}
          onClearVisible={onClearVisibleEntries}
          controls={
            <SegmentedTabs
              items={COUNTRY_FILTER_TABS.map((country) => ({
                value: country,
                label: country,
              }))}
              value={selectedCountryFilter}
              onChange={onCountryFilterChange}
              className="flex flex-wrap gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40 p-1.5"
              buttonClassName="shrink-0 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
              activeClassName="bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.25)]"
              inactiveClassName="text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
            />
          }
          searchPlaceholder="Search team or season..."
        />
        <SearchableCheckboxPanel
          title="Statistics"
          subtitle="Dataset columns"
          items={categoryFilteredStatOptions}
          selectionItems={statOptions}
          selectedValues={selectedStatKeys}
          onToggle={onStatToggle}
          onSelectVisible={onSelectVisibleStats}
          onClearVisible={onClearVisibleStats}
          controls={
            <StatCategoryFilterTabs
              value={selectedStatCategory}
              onChange={onStatCategoryChange}
            />
          }
          searchPlaceholder="Search statistics..."
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {validationMessage ?? "Ready to calculate one global elbow curve."}
        </div>
        <button
          type="button"
          onClick={onCalculateElbow}
          disabled={Boolean(validationMessage) || loadingElbow}
          className="rounded-2xl bg-blue-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {loadingElbow ? "Calculating..." : "Calculate Elbow"}
        </button>
      </div>

      {requestError ? (
        <MessageBox tone="error" messages={[requestError]} />
      ) : null}
    </section>
  );
});
