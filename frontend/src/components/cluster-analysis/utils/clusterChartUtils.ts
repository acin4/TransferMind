import {
  CHART_MARGIN,
  CLUSTER_COLORS,
  MIN_CHART_WIDTH,
  STAT_AXIS_WIDTH,
} from "../constants";

export function getClusterColor(clusterId: number) {
  return CLUSTER_COLORS[(clusterId - 1) % CLUSTER_COLORS.length];
}

export function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

export function getNormalizedDisplayValue(value: number | null | undefined) {
  return clamp01(Number(value ?? 0));
}

export function getChartWidth(statCount: number) {
  return Math.max(MIN_CHART_WIDTH, statCount * STAT_AXIS_WIDTH);
}

export function buildXCoordinates(statCount: number, plotWidth: number) {
  return Array.from(
    { length: statCount },
    (_, index) =>
      CHART_MARGIN.left + (plotWidth * index) / Math.max(1, statCount - 1),
  );
}
