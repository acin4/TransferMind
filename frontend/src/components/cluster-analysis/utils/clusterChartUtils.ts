import {
  CHART_MARGIN,
  CLUSTER_COLORS,
  MIN_CHART_WIDTH,
  STAT_AXIS_WIDTH,
} from "../constants";

// Returns the display color for a cluster id.
// The modulo operator cycles through the color list when there are more clusters
// than predefined colors, so every cluster still gets a usable color.
export function getClusterColor(clusterId: number) {
  return CLUSTER_COLORS[(clusterId - 1) % CLUSTER_COLORS.length];
}

// Keeps a number inside the normalized 0-1 range used by the cluster charts.
// If the value is not a real finite number, return 0 so SVG coordinates stay safe.
export function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

// Converts nullable stat values into a safe normalized value for display.
// Missing values become 0, then clamp01 makes sure the final value is between 0
// and 1 before the chart uses it.
export function getNormalizedDisplayValue(value: number | null | undefined) {
  return clamp01(Number(value ?? 0));
}

// Calculates how wide a chart should be for the number of selected statistics.
// The chart never becomes narrower than MIN_CHART_WIDTH, but it grows when many
// stat axes are needed so labels and lines have enough room.
export function getChartWidth(statCount: number) {
  return Math.max(MIN_CHART_WIDTH, statCount * STAT_AXIS_WIDTH);
}

// Builds the X positions for each statistic axis in a custom SVG chart.
// The first statistic starts at the left chart margin, the last one lands at the
// far end of the plot area, and the rest are evenly spaced between them.
export function buildXCoordinates(statCount: number, plotWidth: number) {
  return Array.from(
    { length: statCount },
    (_, index) =>
      CHART_MARGIN.left + (plotWidth * index) / Math.max(1, statCount - 1),
  );
}
