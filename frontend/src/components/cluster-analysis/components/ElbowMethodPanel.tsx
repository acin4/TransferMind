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
import type {
  ElbowMethodPanelProps,
  ElbowTooltipProps,
} from "../types";
import type { TeamClusterElbowPayload } from "../../../api/api";

type ElbowMethodPanelComponentProps = ElbowMethodPanelProps & {
  elbowResult: TeamClusterElbowPayload;
};

export const ElbowMethodPanel = memo(function ElbowMethodPanel({
  elbowResult,
  selectedK,
  kOptions,
  loadingClusters,
  onSelectedKChange,
  onRunClusters,
}: ElbowMethodPanelComponentProps) {
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
  const handleSelectedKChange = useCallback(
    (value: string) => {
      onSelectedKChange(Number(value));
    },
    [onSelectedKChange],
  );

  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h4 className="text-lg font-black uppercase tracking-tight text-white">
            Elbow Method
          </h4>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3">
            One inertia/WCSS curve for the full selected team-stat matrix.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SelectField
            label="Final K"
            value={selectedK ?? ""}
            onChange={handleSelectedKChange}
            options={kSelectOptions}
          />
          <button
            type="button"
            onClick={onRunClusters}
            disabled={selectedK == null || loadingClusters}
            className="rounded-2xl bg-emerald-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {loadingClusters ? "Clustering..." : "Run K-Means"}
          </button>
        </div>
      </div>

      {elbowResult.warnings.length > 0 ? (
        <MessageBox tone="warning" messages={elbowResult.warnings} />
      ) : null}

      <div className="mt-6 h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={elbowResult.elbow}
            margin={{ top: 20, right: 24, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
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
            <Tooltip content={<ElbowTooltip />} />
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
    </section>
  );
});

function ElbowTooltip({
  active,
  payload,
  label,
}: ElbowTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
        k = {label}
      </div>
      <div className="mt-2 text-sm font-bold text-white">
        Inertia: {Number(point?.inertia ?? 0).toFixed(4)}
      </div>
    </div>
  );
}
