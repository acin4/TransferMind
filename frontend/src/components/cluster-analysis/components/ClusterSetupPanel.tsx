import { memo } from "react";
import { COUNTRY_FILTER_TABS } from "../../../utils/countryFilters";
import SearchableCheckboxPanel from "../../teams-comparison/SearchableCheckboxPanel";
import StatCategoryFilterTabs from "../../teams-comparison/StatCategoryFilterTabs";
import SegmentedTabs from "../../ui/SegmentedTabs";
import { ContentPanel, standingsTheme } from "../../ui/design";
import type { ClusterSetupPanelProps } from "../types";
import { MessageBox } from "./MessageBox";
import { SelectField } from "./SelectField";

// memo prevents this setup form from re-rendering unless its props change.
// The parent owns the selected teams, selected stats, loading state, and API
// errors; this component only renders controls and sends user actions upward.
export const ClusterSetupPanel = memo(function ClusterSetupPanel({
  // maxK is the largest number of clusters the elbow calculation should test.
  maxK,
  // maxKOptions are the dropdown choices shown to the user.
  maxKOptions,
  // These counts preview the size of the data matrix that will be sent for
  // clustering: selected team-seasons as rows and selected stats as columns.
  matrixRowCount,
  matrixColumnCount,
  // entryOptions is the full selectable team-season list.
  entryOptions,
  // countryFilteredEntryOptions is the visible subset after the country tab
  // filter is applied.
  countryFilteredEntryOptions,
  // selectedEntryIds stores which team-season rows the user has selected.
  selectedEntryIds,
  // selectedCountryFilter stores the active country tab for the Teams panel.
  selectedCountryFilter,
  // statOptions is the full selectable statistic list.
  statOptions,
  // categoryFilteredStatOptions is the visible subset after category filtering.
  categoryFilteredStatOptions,
  // selectedStatKeys stores which statistic columns the user has selected.
  selectedStatKeys,
  // selectedStatCategory stores the active statistic category tab.
  selectedStatCategory,
  // validationMessage explains what still needs to be fixed before calculation.
  // When it is null, the setup is valid.
  validationMessage,
  // loadingElbow is true while the elbow API request is running.
  loadingElbow,
  // requestError contains an API or request-level error message to show below.
  requestError,
  // The remaining props are event handlers from the parent. This keeps state
  // changes centralized in the parent while this panel stays focused on layout.
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
    // Main panel styling: the rounded border and shadow make the setup form read
    // as one major section of the Cluster Analysis page.
    <ContentPanel>
      {/* Header explains the clustering setup in practical UI terms:
          rows are selected entries and columns are selected statistics. */}
      <div className="mb-8">
        <h3 className="text-xl font-black uppercase tracking-tight text-white">
          Cluster Analysis
        </h3>
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3 max-w-4xl">
          Rows are selected team-seasons. Columns are selected statistics. Each
          statistic column is Min-Max normalized to 0-1 before K-Means, with
          higher-is-worse stats direction-adjusted so higher values mean better
          performance.
        </p>
      </div>

      {/* The top grid contains small setup metadata. On medium screens and wider,
          Max K gets a fixed-width column and the matrix preview fills the rest. */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-4 mb-6">
        {/* SelectField is a reusable dropdown. Changing it tells the parent to
            update maxK, which controls how many k values the elbow test tries. */}
        <SelectField
          label="Max K"
          value={maxK}
          onChange={onMaxKChange}
          options={maxKOptions}
        />
        {/* Matrix preview gives immediate feedback about the dataset size before
            the user runs clustering. */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Matrix
          </p>
          <p className="mt-2 text-sm font-black text-white">
            {matrixRowCount} rows x {matrixColumnCount} columns
          </p>
        </div>
      </div>

      {/* The two checkbox panels sit side by side on large screens:
          Teams choose dataset rows, Statistics choose dataset columns. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Team-season selector. It uses the country-filtered list for visible
            items, but receives the full entry list as selectionItems so selected
            values can still be understood even when filtered out of view. */}
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
            // Country tabs filter the Teams panel. The tabs are passed as a
            // custom control so SearchableCheckboxPanel can stay reusable.
            <SegmentedTabs
              items={COUNTRY_FILTER_TABS.map((country) => ({
                value: country,
                label: country,
              }))}
              value={selectedCountryFilter}
              onChange={onCountryFilterChange}
              className={standingsTheme.compactSegmentedTabs}
              buttonClassName={standingsTheme.compactSegmentedTabButton}
              activeClassName="bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.25)]"
              inactiveClassName="text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
            />
          }
          // Placeholder tells the user this search can match team or season text.
          searchPlaceholder="Search team or season..."
        />
        {/* Statistic selector. These checked stats become the columns used by the
            clustering matrix and later charts. */}
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
            // Category tabs filter the stat list so users can focus on related
            // metrics instead of scanning every statistic at once.
            <StatCategoryFilterTabs
              value={selectedStatCategory}
              onChange={onStatCategoryChange}
            />
          }
          // Placeholder tells the user this search is limited to statistic names.
          searchPlaceholder="Search statistics..."
        />
      </div>

      {/* Footer row shows validation feedback on the left and the main action on
          the right. It stacks on mobile so both pieces remain readable. */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {validationMessage ?? "Ready to calculate one global elbow curve."}
        </div>
        <button
          type="button"
          // Clicking starts the elbow calculation in the parent component, which
          // usually calls the backend and then renders the elbow chart/results.
          onClick={onCalculateElbow}
          // Disable the button when the form is invalid or a request is already
          // running. This prevents duplicate requests and incomplete submissions.
          disabled={Boolean(validationMessage) || loadingElbow}
          className="rounded-2xl bg-blue-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {/* The label changes during loading so the user knows the click worked. */}
          {loadingElbow ? "Calculating..." : "Calculate Elbow"}
        </button>
      </div>

      {/* Show request errors only when one exists. MessageBox centralizes the
          visual style for error messages across the cluster analysis UI. */}
      {requestError ? (
        <MessageBox tone="error" messages={[requestError]} />
      ) : null}
    </ContentPanel>
  );
});
