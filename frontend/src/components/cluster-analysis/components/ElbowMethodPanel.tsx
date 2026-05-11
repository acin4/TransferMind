import {
  memo,
  useCallback,
  useMemo,
} from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MessageBox } from "./MessageBox";
import { SelectField } from "./SelectField";
import { ContentPanel } from "../../ui/design";
import type {
  ElbowMethodPanelProps,
  ElbowTooltipProps,
} from "../types";
import type { TeamClusterElbowPayload } from "../../../api/api";

type ElbowMethodPanelComponentProps = ElbowMethodPanelProps & {
  // elbowResult is required here because this panel is only rendered after the
  // elbow calculation succeeds and returns chart data.
  elbowResult: TeamClusterElbowPayload;
};

// memo keeps the elbow panel from re-rendering unless its inputs change.
// The parent owns selectedK and loading state; this component displays the chart
// and sends user actions back upward.
export const ElbowMethodPanel = memo(function ElbowMethodPanel({
  // Result returned by the elbow endpoint: points for the chart, warnings, and
  // an optional suggested K value.
  elbowResult,
  // selectedK is the final cluster count chosen by the user before running k-means.
  selectedK,
  // kOptions are the valid K values that can be selected in the dropdown.
  kOptions,
  // loadingClusters is true while the final k-means request is running.
  loadingClusters,
  // Parent callback used when the user chooses a different K value.
  onSelectedKChange,
  // Parent callback used when the user clicks "Run K-Means".
  onRunClusters,
}: ElbowMethodPanelComponentProps) {
  // Build dropdown options from valid K values. If the backend suggested one K,
  // mark that option in the label so the user can spot it quickly.
  const kSelectOptions = useMemo(
    () =>
      kOptions.map((value) => ({
        value,
        label:
          value === elbowResult.suggestedK
            ? `${value} suggested`
            : String(value),
      })),
    [elbowResult.suggestedK, kOptions],
  );
  // SelectField returns a string value from the HTML select element, but the
  // clustering logic expects a number, so convert it before calling the parent.
  const handleSelectedKChange = useCallback(
    (value: string) => {
      onSelectedKChange(Number(value));
    },
    [onSelectedKChange],
  );

  return (
    // Main panel card for the elbow result and final K controls.
    <ContentPanel>
      {/* Header and action controls stack on smaller screens and sit side by side
          on large screens, keeping the chart setup readable. */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h4 className="text-lg font-black uppercase tracking-tight text-white">
            Elbow Method
          </h4>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3">
            One inertia/WCSS curve for the full selected team-stat matrix.
          </p>
        </div>
        {/* The user reviews the elbow chart, chooses the final K, then runs the
            actual k-means clustering from this control group. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SelectField
            label="Final K"
            value={selectedK ?? ""}
            onChange={handleSelectedKChange}
            options={kSelectOptions}
          />
          <button
            type="button"
            // Starts the final clustering request in the parent component.
            onClick={onRunClusters}
            // Disable until a K is selected, and while clustering is already
            // running, to prevent incomplete or duplicate requests.
            disabled={selectedK == null || loadingClusters}
            className="rounded-2xl bg-blue-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {/* Loading text confirms that the click was received and work is in progress. */}
            {loadingClusters ? "Clustering..." : "Run K-Means"}
          </button>
        </div>
      </div>

      {/* Warnings come from the backend analysis, for example if the selected
          data makes the elbow result less reliable. */}
      {elbowResult.warnings.length > 0 ? (
        <MessageBox tone="warning" messages={elbowResult.warnings} />
      ) : null}

      {/* Fixed height gives Recharts a stable area to measure. ResponsiveContainer
          then makes the chart fill the available width. */}
      <div className="mt-6 h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            // Each point has a k value and an inertia value. Recharts reads this
            // array and draws the elbow curve.
            data={elbowResult.elbow}
            margin={{ top: 20, right: 24, left: 0, bottom: 10 }}
          >
            {/* Grid lines make it easier to compare inertia values across K. */}
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            {/* X axis shows the number of clusters being tested. */}
            <XAxis
              dataKey="k"
              allowDecimals={false}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={{ stroke: "#334155" }}
              label={{
                value: "K",
                position: "insideBottom",
                fill: "#94a3b8",
                offset: -5,
              }}
            />
            {/* Y axis shows inertia/WCSS, where lower values usually mean tighter
                clusters. The "elbow" is the point where improvement slows down. */}
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={{ stroke: "#334155" }}
              label={{
                value: "Inertia / WCSS",
                angle: -90,
                position: "insideLeft",
                fill: "#94a3b8",
              }}
            />
            {/* Custom tooltip keeps hover details styled like the rest of the app. */}
            <Tooltip content={<ElbowTooltip />} />
            {/* If the backend suggests a K, draw a green vertical guide so the
                recommendation is visible on the chart. */}
            {elbowResult.suggestedK ? (
              <ReferenceLine
                x={elbowResult.suggestedK}
                stroke="#22c55e"
                strokeDasharray="4 4"
                label={{
                  value: `Suggested K=${elbowResult.suggestedK}`,
                  fill: "#86efac",
                  fontSize: 12,
                }}
              />
            ) : null}
            {/* The blue line is the elbow curve: K on the X axis and inertia on
                the Y axis. Dots mark the exact tested K values. */}
            <Line
              type="monotone"
              dataKey="inertia"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: "#60a5fa", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ContentPanel>
  );
});

// Tooltip shown when the user hovers over a point in the elbow chart.
// Recharts passes active/payload/label into this component automatically.
function ElbowTooltip({
  active,
  payload,
  label,
}: ElbowTooltipProps) {
  // When nothing is being hovered, render no tooltip at all.
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // The first payload item contains the original elbow data point for this hover.
  const point = payload[0].payload;

  return (
    // Tooltip styling matches the dark card style used across cluster analysis.
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
        k = {label}
      </div>
      <div className="mt-2 text-sm font-bold text-white">
        {/* Format inertia to four decimals so tooltip numbers stay compact. */}
        Inertia: {Number(point?.inertia ?? 0).toFixed(4)}
      </div>
    </div>
  );
}
