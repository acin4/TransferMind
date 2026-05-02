import { HttpError } from "../lib/http.js";
import { getTeamStatMetadata } from "../lib/teamStatsMetadata.js";
import { listTeamComparisonRowsByContext } from "../repositories/teamRepository.js";

const DEFAULT_MAX_K = 8;
const MAX_ITERATIONS = 100;
const KMEANS_SEED = 42;

function parsePositiveIntegerField(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer.`);
  }

  return parsed;
}

function parsePositiveIntegerArray(value, fieldName) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, `${fieldName} must be a non-empty array.`);
  }

  const parsedValues = value.map((item, index) =>
    parsePositiveIntegerField(item, `${fieldName}[${index}]`),
  );

  return [...new Set(parsedValues)];
}

function parseStatKeys(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, "statKeys must be a non-empty array.");
  }

  const statKeys = [
    ...new Set(
      value.map((item) => String(item ?? "").trim()).filter(Boolean),
    ),
  ].filter((statKey) => getTeamStatMetadata(statKey));

  if (statKeys.length < 2) {
    throw new HttpError(400, "Select at least two statistics.");
  }

  return statKeys;
}

function parseClusterBasePayload(payload) {
  const tournamentId = parsePositiveIntegerField(
    payload?.tournamentId,
    "tournamentId",
  );
  const seasonId = parsePositiveIntegerField(payload?.seasonId, "seasonId");
  const teamIds = parsePositiveIntegerArray(payload?.teamIds, "teamIds");
  const statKeys = parseStatKeys(payload?.statKeys);

  if (teamIds.length < 3) {
    throw new HttpError(400, "Select at least three teams.");
  }

  return {
    tournamentId,
    seasonId,
    teamIds,
    statKeys,
  };
}

function parseMaxK(value, validRowCount) {
  const requested = value == null ? DEFAULT_MAX_K : Number(value);

  if (!Number.isInteger(requested) || requested < 2) {
    throw new HttpError(400, "maxK must be an integer of at least 2.");
  }

  return Math.min(requested, DEFAULT_MAX_K, validRowCount - 1);
}

function parseSelectedK(value, validRowCount) {
  const k = parsePositiveIntegerField(value, "k");

  if (k < 2) {
    throw new HttpError(400, "k must be at least 2.");
  }

  if (k >= validRowCount) {
    throw new HttpError(
      400,
      "k must be less than the number of valid selected teams.",
    );
  }

  return k;
}

function toNumericStatValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function squaredDistance(a, b) {
  return a.reduce((total, value, index) => {
    const delta = value - (b[index] ?? 0);
    return total + delta * delta;
  }, 0);
}

function distance(a, b) {
  return Math.sqrt(squaredDistance(a, b));
}

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function weightedChoice(weights, random) {
  const total = weights.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return 0;
  }

  let threshold = random() * total;

  for (let index = 0; index < weights.length; index += 1) {
    threshold -= weights[index];

    if (threshold <= 0) {
      return index;
    }
  }

  return weights.length - 1;
}

function createInitialCentroids(points, k) {
  const random = createSeededRandom(KMEANS_SEED);
  const firstIndex = Math.floor(random() * points.length);
  const selectedIndexes = new Set([firstIndex]);
  const centroids = [[...points[firstIndex]]];

  while (centroids.length < k) {
    const weights = points.map((point, index) => {
      if (selectedIndexes.has(index)) {
        return 0;
      }

      return Math.min(
        ...centroids.map((centroid) => squaredDistance(point, centroid)),
      );
    });
    let nextIndex = weightedChoice(weights, random);

    if (selectedIndexes.has(nextIndex)) {
      nextIndex = points.findIndex((_, index) => !selectedIndexes.has(index));
    }

    if (nextIndex === -1) {
      break;
    }

    selectedIndexes.add(nextIndex);
    centroids.push([...points[nextIndex]]);
  }

  while (centroids.length < k) {
    centroids.push([...points[centroids.length % points.length]]);
  }

  return centroids;
}

function assignPoints(points, centroids) {
  return points.map((point) => {
    let nearestCentroidIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    centroids.forEach((centroid, index) => {
      const currentDistance = squaredDistance(point, centroid);

      if (currentDistance < nearestDistance) {
        nearestDistance = currentDistance;
        nearestCentroidIndex = index;
      }
    });

    return nearestCentroidIndex;
  });
}

function recomputeCentroids(points, assignments, centroids, k) {
  const dimensions = points[0]?.length ?? 0;

  return Array.from({ length: k }, (_, clusterIndex) => {
    const clusterPoints = points.filter(
      (_, pointIndex) => assignments[pointIndex] === clusterIndex,
    );

    if (clusterPoints.length === 0) {
      const farthestPoint = points.reduce(
        (best, point) => {
          const nearestDistance = Math.min(
            ...centroids.map((centroid) => squaredDistance(point, centroid)),
          );

          return nearestDistance > best.distance
            ? { point, distance: nearestDistance }
            : best;
        },
        { point: centroids[clusterIndex] ?? Array(dimensions).fill(0), distance: -1 },
      );

      return [...farthestPoint.point];
    }

    return Array.from({ length: dimensions }, (_, dimensionIndex) => {
      const total = clusterPoints.reduce(
        (sum, point) => sum + (point[dimensionIndex] ?? 0),
        0,
      );

      return total / clusterPoints.length;
    });
  });
}

function haveAssignmentsChanged(previous, next) {
  return previous.length !== next.length
    ? true
    : previous.some((value, index) => value !== next[index]);
}

function runKMeans(points, k) {
  let centroids = createInitialCentroids(points, k);
  let assignments = Array(points.length).fill(-1);
  let iterations = 0;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    iterations = iteration + 1;
    const nextAssignments = assignPoints(points, centroids);

    if (!haveAssignmentsChanged(assignments, nextAssignments) && iteration > 0) {
      assignments = nextAssignments;
      break;
    }

    assignments = nextAssignments;
    centroids = recomputeCentroids(points, assignments, centroids, k);
  }

  const inertia = points.reduce((total, point, pointIndex) => {
    const centroid = centroids[assignments[pointIndex]] ?? centroids[0];
    return total + squaredDistance(point, centroid);
  }, 0);

  return {
    assignments,
    centroids,
    inertia,
    iterations,
  };
}

function calculateSuggestedK(elbowPoints) {
  if (elbowPoints.length === 0) {
    return null;
  }

  if (elbowPoints.length <= 2) {
    return elbowPoints[elbowPoints.length - 1].k;
  }

  const first = elbowPoints[0];
  const last = elbowPoints[elbowPoints.length - 1];
  const dx = last.k - first.k;
  const dy = last.inertia - first.inertia;
  const denominator = Math.sqrt(dx * dx + dy * dy);

  if (denominator === 0) {
    return elbowPoints[1].k;
  }

  let bestPoint = elbowPoints[1];
  let bestDistance = -1;

  for (let index = 1; index < elbowPoints.length - 1; index += 1) {
    const point = elbowPoints[index];
    const numerator = Math.abs(
      dy * point.k - dx * point.inertia + last.k * first.inertia - last.inertia * first.k,
    );
    const pointDistance = numerator / denominator;

    if (pointDistance > bestDistance) {
      bestDistance = pointDistance;
      bestPoint = point;
    }
  }

  return bestPoint.k;
}

function toClusterRow(row, statKeys) {
  const rawStats = Object.fromEntries(
    statKeys.map((statKey) => [statKey, toNumericStatValue(row.stats?.[statKey])]),
  );

  return {
    teamId: row.team_id,
    teamName: row.team_name,
    rawStats,
  };
}

function buildNormalizedMatrix(rows, statKeys) {
  const warnings = [];
  const sourceRows = rows.map((row) => toClusterRow(row, statKeys));
  const validRows = [];

  for (const row of sourceRows) {
    const missingStats = statKeys.filter((statKey) => row.rawStats[statKey] == null);

    if (missingStats.length > 0) {
      warnings.push(
        `${row.teamName} was excluded because it has missing/non-numeric values for: ${missingStats.join(", ")}.`,
      );
      continue;
    }

    validRows.push(row);
  }

  if (validRows.length < 3) {
    throw new HttpError(
      400,
      "At least three selected teams must have numeric values for every selected statistic.",
    );
  }

  const columnStats = Object.fromEntries(
    statKeys.map((statKey) => {
      const values = validRows.map((row) => row.rawStats[statKey]);
      const min = Math.min(...values);
      const max = Math.max(...values);

      if (min === max) {
        warnings.push(
          `${getTeamStatMetadata(statKey).label} is constant across the valid selected teams; its normalized column was set to 0.`,
        );
      }

      return [
        statKey,
        {
          min,
          max,
          isConstant: min === max,
        },
      ];
    }),
  );

  const matrixRows = validRows.map((row) => {
    const normalizedStats = Object.fromEntries(
      statKeys.map((statKey) => {
        const column = columnStats[statKey];
        const rawValue = row.rawStats[statKey];
        const normalizedValue = column.isConstant
          ? 0
          : (rawValue - column.min) / (column.max - column.min);

        return [
          statKey,
          Number(Math.max(0, Math.min(1, normalizedValue)).toFixed(6)),
        ];
      }),
    );

    return {
      teamId: row.teamId,
      teamName: row.teamName,
      rawStats: row.rawStats,
      normalizedStats,
      vector: statKeys.map((statKey) => normalizedStats[statKey]),
    };
  });

  return {
    matrixRows,
    columnStats,
    warnings,
  };
}

async function buildClusterDataset(payload) {
  const { tournamentId, seasonId, teamIds, statKeys } =
    parseClusterBasePayload(payload);
  const rows = await listTeamComparisonRowsByContext({
    tournamentId,
    seasonId,
    teamIds,
  });

  if (rows.length !== teamIds.length) {
    throw new HttpError(
      400,
      "All selected teams must belong to the selected competition and season.",
    );
  }

  const rowsByTeamId = new Map(rows.map((row) => [row.team_id, row]));
  const orderedRows = teamIds.map((teamId) => rowsByTeamId.get(teamId));
  const { matrixRows, columnStats, warnings } = buildNormalizedMatrix(
    orderedRows,
    statKeys,
  );

  return {
    tournamentId,
    seasonId,
    teamIds,
    statKeys,
    rows: matrixRows,
    columnStats,
    warnings,
  };
}

function buildStatsMetadata(statKeys, columnStats) {
  return statKeys.map((statKey) => {
    const metadata = getTeamStatMetadata(statKey);
    const column = columnStats[statKey];

    return {
      key: statKey,
      label: metadata.label,
      category: metadata.category,
      direction: metadata.direction,
      min: column.min,
      max: column.max,
      isConstant: column.isConstant,
    };
  });
}

export async function calculateTeamClusterElbow(payload) {
  const dataset = await buildClusterDataset(payload);
  const maxK = parseMaxK(payload?.maxK, dataset.rows.length);

  if (maxK < 2) {
    throw new HttpError(
      400,
      "Select at least three teams with complete numeric data to calculate elbow values.",
    );
  }

  const points = dataset.rows.map((row) => row.vector);
  const elbow = Array.from({ length: maxK }, (_, index) => {
    const k = index + 1;
    const result = runKMeans(points, k);

    return {
      k,
      inertia: Number(result.inertia.toFixed(6)),
      iterations: result.iterations,
    };
  });

  return {
    context: {
      tournamentId: dataset.tournamentId,
      seasonId: dataset.seasonId,
    },
    rows: dataset.rows.map(({ vector, ...row }) => row),
    stats: buildStatsMetadata(dataset.statKeys, dataset.columnStats),
    elbow,
    suggestedK: calculateSuggestedK(elbow),
    maxK,
    warnings: dataset.warnings,
  };
}

export async function runTeamClusters(payload) {
  const dataset = await buildClusterDataset(payload);
  const k = parseSelectedK(payload?.k, dataset.rows.length);
  const points = dataset.rows.map((row) => row.vector);
  const result = runKMeans(points, k);
  const assignments = dataset.rows.map((row, index) => {
    const clusterIndex = result.assignments[index] ?? 0;
    const centroid = result.centroids[clusterIndex] ?? [];

    return {
      teamId: row.teamId,
      teamName: row.teamName,
      clusterId: clusterIndex + 1,
      distanceToCentroid: Number(distance(row.vector, centroid).toFixed(6)),
      rawStats: row.rawStats,
      normalizedStats: row.normalizedStats,
    };
  });
  const centroids = result.centroids.map((centroid, index) => ({
    clusterId: index + 1,
    values: Object.fromEntries(
      dataset.statKeys.map((statKey, statIndex) => [
        statKey,
        Number((centroid[statIndex] ?? 0).toFixed(6)),
      ]),
    ),
  }));

  return {
    context: {
      tournamentId: dataset.tournamentId,
      seasonId: dataset.seasonId,
    },
    k,
    iterations: result.iterations,
    inertia: Number(result.inertia.toFixed(6)),
    stats: buildStatsMetadata(dataset.statKeys, dataset.columnStats),
    assignments,
    centroids,
    warnings: dataset.warnings,
  };
}
