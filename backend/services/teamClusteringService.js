import { HttpError } from "../lib/http.js";
import { runPythonAgglomerative } from "../lib/pythonAgglomerativeClient.js";
import { runPythonKMeans } from "../lib/pythonKMeansClient.js";
import {
  getTeamStatMetadata,
  isNegativeTeamStatKey,
} from "../lib/teamStatsMetadata.js";
import { listTeamComparisonRowsByEntries } from "../repositories/teamRepository.js";

const MAX_CLUSTER_K = 20;
const MAX_ITERATIONS = 100;
const KMEANS_SEED = 42;
const AGGLOMERATIVE_LINKAGES = new Set([
  "ward",
  "complete",
  "average",
  "single",
]);

function parsePositiveIntegerField(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer.`);
  }

  return parsed;
}

function parseStatKeys(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, "statKeys must be a non-empty array.");
  }

  const statKeys = [
    ...new Set(
      value.map((item) => String(item ?? "").trim()).filter(Boolean),
    ),
  ];

  if (statKeys.length === 0) {
    throw new HttpError(400, "Select at least one statistic.");
  }

  const invalidStatKeys = statKeys.filter(
    (statKey) => !getTeamStatMetadata(statKey),
  );

  if (invalidStatKeys.length > 0) {
    throw new HttpError(400, "One or more selected statistics are not allowed.");
  }

  if (statKeys.length < 2) {
    throw new HttpError(400, "Select at least two statistics.");
  }

  return statKeys;
}

function parseTeamSeasonEntries(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, "teamSeasonEntries must be a non-empty array.");
  }

  const entries = [];
  const seenEntryKeys = new Set();

  value.forEach((item, index) => {
    const teamId = parsePositiveIntegerField(
      item?.teamId,
      `teamSeasonEntries[${index}].teamId`,
    );
    const tournamentId = parsePositiveIntegerField(
      item?.tournamentId,
      `teamSeasonEntries[${index}].tournamentId`,
    );
    const seasonId = parsePositiveIntegerField(
      item?.seasonId,
      `teamSeasonEntries[${index}].seasonId`,
    );
    const entryKey = buildEntryId({ teamId, tournamentId, seasonId });

    if (!seenEntryKeys.has(entryKey)) {
      seenEntryKeys.add(entryKey);
      entries.push({ teamId, tournamentId, seasonId });
    }
  });

  return entries;
}

function parseClusterBasePayload(payload) {
  const teamSeasonEntries = parseTeamSeasonEntries(payload?.teamSeasonEntries);
  const statKeys = parseStatKeys(payload?.statKeys);

  if (teamSeasonEntries.length < 3) {
    throw new HttpError(400, "Select at least three team-season entries.");
  }

  return {
    teamSeasonEntries,
    statKeys,
  };
}

function parseMaxK(value, validRowCount) {
  const maxAllowedK = Math.min(validRowCount, MAX_CLUSTER_K);

  if (value == null) {
    return maxAllowedK;
  }

  const requested = Number(value);

  if (!Number.isInteger(requested) || requested < 2) {
    throw new HttpError(400, "maxK must be an integer of at least 2.");
  }

  return Math.min(requested, maxAllowedK);
}

function parseSelectedK(value, validRowCount) {
  const k = parsePositiveIntegerField(value, "k");
  const maxAllowedK = Math.min(validRowCount, MAX_CLUSTER_K);

  if (k < 2) {
    throw new HttpError(400, "k must be at least 2.");
  }

  if (k > maxAllowedK) {
    throw new HttpError(
      400,
      `k must be at most ${maxAllowedK} for the selected entries.`,
    );
  }

  return k;
}

function parseAgglomerativeK(value, validRowCount) {
  const k = parsePositiveIntegerField(value, "k");

  if (k < 2) {
    throw new HttpError(400, "k must be at least 2.");
  }

  if (k > validRowCount) {
    throw new HttpError(
      400,
      `k must be at most ${validRowCount} for the selected entries.`,
    );
  }

  return k;
}

function parseAgglomerativeLinkage(value) {
  if (value == null) {
    return "ward";
  }

  const linkage = String(value).trim().toLowerCase();

  if (!AGGLOMERATIVE_LINKAGES.has(linkage)) {
    throw new HttpError(
      400,
      'linkage must be one of "ward", "complete", "average", or "single".',
    );
  }

  return linkage;
}

function sanitizeClusterStatValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue === "") {
      return null;
    }

    const parsed = Number(trimmedValue);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value == null) {
    return null;
  }

  return Number.NaN;
}

function getClusterRowLabel(row) {
  return [
    row.team_name ?? `Team ${row.team_id}`,
    row.season_name ?? `Season ${row.season_id}`,
    row.tournament_name,
  ]
    .filter(Boolean)
    .join(" - ");
}

function assertFiniteVector(vector, rowLabel) {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new HttpError(400, `Clustering matrix row is empty for ${rowLabel}.`);
  }

  const hasInvalidValue = vector.some((value) => !Number.isFinite(value));

  if (hasInvalidValue) {
    throw new HttpError(
      400,
      `Clustering matrix contains a non-numeric value for ${rowLabel}.`,
    );
  }
}

function validateNormalizedPointMatrix(points, statKeys) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new HttpError(400, "Clustering matrix must contain at least one row.");
  }

  if (!Array.isArray(statKeys) || statKeys.length === 0) {
    throw new HttpError(
      400,
      "Clustering matrix must contain at least one column.",
    );
  }

  const columnCount = statKeys.length;

  if (columnCount === 0) {
    throw new HttpError(
      400,
      "Clustering matrix must contain at least one column.",
    );
  }

  const hasInvalidRow = points.some(
    (row) => !Array.isArray(row) || row.length !== columnCount,
  );

  if (hasInvalidRow) {
    throw new HttpError(
      400,
      "Clustering matrix rows must all contain one value per selected statistic.",
    );
  }

  const allValues = points.flat();

  if (allValues.length === 0) {
    throw new HttpError(400, "Clustering matrix must not be empty.");
  }

  if (allValues.every((value) => value == null || Number.isNaN(value))) {
    throw new HttpError(
      400,
      "Clustering matrix must not contain only null values.",
    );
  }

  const nonNumericColumns = statKeys.filter((_, columnIndex) =>
    points.some((row) => typeof row[columnIndex] !== "number"),
  );

  if (nonNumericColumns.length > 0) {
    throw new HttpError(
      400,
      `Clustering matrix contains non-numeric columns: ${nonNumericColumns.join(", ")}.`,
    );
  }

  const hasInvalidValue = allValues.some((value) => !Number.isFinite(value));

  if (hasInvalidValue) {
    throw new HttpError(
      400,
      "Clustering matrix must contain only finite numeric values.",
    );
  }

  const hasOutOfRangeValue = allValues.some((value) => value < 0 || value > 1);

  if (hasOutOfRangeValue) {
    throw new HttpError(
      400,
      "Clustering matrix must contain normalized values between 0 and 1.",
    );
  }
}

function validateMatrixSourceRows(matrixSourceRows, statKeys) {
  if (!Array.isArray(statKeys) || statKeys.length === 0) {
    throw new HttpError(400, "Select at least one statistic.");
  }

  if (!Array.isArray(matrixSourceRows) || matrixSourceRows.length === 0) {
    throw new HttpError(400, "Clustering matrix must contain at least one row.");
  }

  const invalidStat = matrixSourceRows.flatMap((row) =>
    statKeys
      .filter((statKey) => Number.isNaN(row.rawStats[statKey]))
      .map((statKey) => ({
        statKey,
        rowLabel: row.label,
      })),
  )[0];

  if (invalidStat) {
    const metadata = getTeamStatMetadata(invalidStat.statKey);

    throw new HttpError(
      400,
      `${metadata.label} contains a non-numeric value for ${invalidStat.rowLabel}.`,
    );
  }

  statKeys.forEach((statKey) => {
    const metadata = getTeamStatMetadata(statKey);
    const numericValues = matrixSourceRows
      .map((row) => row.rawStats[statKey])
      .filter((value) => Number.isFinite(value));

    if (numericValues.length === 0) {
      throw new HttpError(
        400,
        `${metadata.label} has no numeric values in the selected team-season entries.`,
      );
    }
  });
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

function buildEntryId(row) {
  return `${row.teamId}:${row.tournamentId}:${row.seasonId}`;
}

function toClusterRow(row, statKeys) {
  const rawStats = Object.fromEntries(
    statKeys.map((statKey) => [
      statKey,
      sanitizeClusterStatValue(row.stats?.[statKey]),
    ]),
  );

  return {
    entryId: buildEntryId({
      teamId: row.team_id,
      tournamentId: row.tournament_id,
      seasonId: row.season_id,
    }),
    teamId: row.team_id,
    teamName: row.team_name,
    teamLogo: row.team_logo ?? null,
    tournamentId: row.tournament_id,
    tournamentName: row.tournament_name ?? null,
    seasonId: row.season_id,
    seasonName: row.season_name ?? null,
    rawStats,
    label: getClusterRowLabel(row),
  };
}

function buildNormalizedMatrix(rows, statKeys) {
  const warnings = [];
  const matrixSourceRows = rows.map((row) => toClusterRow(row, statKeys));
  validateMatrixSourceRows(matrixSourceRows, statKeys);

  const columnStats = Object.fromEntries(
    statKeys.map((statKey) => {
      const values = matrixSourceRows
        .map((row) => row.rawStats[statKey])
        .filter((value) => Number.isFinite(value));
      const min = Math.min(...values);
      const max = Math.max(...values);
      const isNegativeDirection = isNegativeTeamStatKey(statKey);
      const missingCount = matrixSourceRows.length - values.length;

      if (min === max) {
        const constantNormalizedValue = isNegativeDirection ? 1 : 0;

        warnings.push(
          `${getTeamStatMetadata(statKey).label} is constant across the selected entries; its normalized column was set to ${constantNormalizedValue}.`,
        );
      }

      if (missingCount > 0) {
        warnings.push(
          `${getTeamStatMetadata(statKey).label} had ${missingCount} missing value${missingCount === 1 ? "" : "s"}; missing normalized values were filled with the column minimum.`,
        );
      }

      return [
        statKey,
        {
          min,
          max,
          isConstant: min === max,
          isNegativeDirection,
        },
      ];
    }),
  );

  const matrixRows = matrixSourceRows.map((row) => {
    const normalizedStats = Object.fromEntries(
      statKeys.map((statKey) => {
        const column = columnStats[statKey];
        const rawValue = row.rawStats[statKey];
        const numericRawValue = Number.isFinite(rawValue)
          ? rawValue
          : column.min;
        const normalizedValue = column.isConstant
          ? 0
          : (numericRawValue - column.min) / (column.max - column.min);
        const adjustedValue = column.isNegativeDirection
          ? 1 - normalizedValue
          : normalizedValue;

        return [
          statKey,
          Number(Math.max(0, Math.min(1, adjustedValue)).toFixed(6)),
        ];
      }),
    );

    return {
      entryId: row.entryId,
      teamId: row.teamId,
      teamName: row.teamName,
      teamLogo: row.teamLogo,
      tournamentId: row.tournamentId,
      tournamentName: row.tournamentName,
      seasonId: row.seasonId,
      seasonName: row.seasonName,
      rawStats: row.rawStats,
      normalizedStats,
      vector: statKeys.map((statKey) => normalizedStats[statKey]),
    };
  });

  matrixRows.forEach((row) => {
    assertFiniteVector(row.vector, row.teamName);
  });

  return {
    matrixRows,
    columnStats,
    warnings,
  };
}

async function buildClusterDataset(payload) {
  const { teamSeasonEntries, statKeys } =
    parseClusterBasePayload(payload);
  const rows = await listTeamComparisonRowsByEntries(teamSeasonEntries);

  if (rows.length !== teamSeasonEntries.length) {
    throw new HttpError(
      400,
      "One or more selected team-season entries do not exist.",
    );
  }

  const rowsByEntryId = new Map(
    rows.map((row) => [
      buildEntryId({
        teamId: row.team_id,
        tournamentId: row.tournament_id,
        seasonId: row.season_id,
      }),
      row,
    ]),
  );
  const orderedRows = teamSeasonEntries.map((entry) =>
    rowsByEntryId.get(buildEntryId(entry)),
  );

  if (orderedRows.some((row) => !row)) {
    throw new HttpError(
      400,
      "One or more selected team-season entries do not exist.",
    );
  }

  const { matrixRows, columnStats, warnings } = buildNormalizedMatrix(
    orderedRows,
    statKeys,
  );

  if (matrixRows.length === 0 || statKeys.length === 0) {
    throw new HttpError(400, "Clustering matrix must not be empty.");
  }

  return {
    teamSeasonEntries,
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

function buildAgglomerativeLabel(row) {
  return [
    row.teamName,
    row.seasonName ?? `Season ${row.seasonId}`,
    row.tournamentName,
  ]
    .filter(Boolean)
    .join(" - ");
}

export async function calculateTeamClusterElbow(payload) {
  const dataset = await buildClusterDataset(payload);
  const maxK = parseMaxK(payload?.maxK, dataset.rows.length);

  if (maxK < 2) {
    throw new HttpError(
      400,
      "Select at least three team-season entries to calculate elbow values.",
    );
  }

  const points = dataset.rows.map((row) => row.vector);
  const result = await runPythonKMeans({
    mode: "elbow",
    points,
    maxK,
    randomState: KMEANS_SEED,
    maxIter: MAX_ITERATIONS,
  });
  const elbow = result.elbow.map((point) => ({
    k: point.k,
    inertia: Number(point.inertia.toFixed(6)),
    iterations: point.iterations,
  }));

  return {
    context: {
      selectedEntryCount: dataset.rows.length,
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
  const result = await runPythonKMeans({
    mode: "cluster",
    points,
    k,
    randomState: KMEANS_SEED,
    maxIter: MAX_ITERATIONS,
  });
  const assignments = dataset.rows.map((row, index) => {
    const clusterIndex = result.assignments[index] ?? 0;
    const centroid = result.centroids[clusterIndex] ?? [];

    return {
      entryId: row.entryId,
      teamId: row.teamId,
      teamName: row.teamName,
      teamLogo: row.teamLogo,
      tournamentId: row.tournamentId,
      tournamentName: row.tournamentName,
      seasonId: row.seasonId,
      seasonName: row.seasonName,
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
      selectedEntryCount: dataset.rows.length,
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

export async function runTeamAgglomerativeClusters(payload) {
  const linkage = parseAgglomerativeLinkage(payload?.linkage);
  const dataset = await buildClusterDataset(payload);
  const k = parseAgglomerativeK(payload?.k, dataset.rows.length);
  const points = dataset.rows.map((row) => row.vector);

  validateNormalizedPointMatrix(points, dataset.statKeys);

  const result = await runPythonAgglomerative({
    points,
    k,
    linkage,
    labels: dataset.rows.map(buildAgglomerativeLabel),
  });

  if (result.assignments.length !== dataset.rows.length) {
    throw new HttpError(500, "Unable to complete Agglomerative clustering.");
  }

  const assignments = dataset.rows.map((row, index) => {
    const clusterIndex = result.assignments[index] ?? 0;

    return {
      entryId: row.entryId,
      teamId: row.teamId,
      teamName: row.teamName,
      teamLogo: row.teamLogo,
      tournamentId: row.tournamentId,
      tournamentName: row.tournamentName,
      seasonId: row.seasonId,
      seasonName: row.seasonName,
      clusterId: clusterIndex + 1,
      rawStats: row.rawStats,
      normalizedStats: row.normalizedStats,
    };
  });

  const response = {
    context: {
      selectedEntryCount: dataset.rows.length,
    },
    algorithm: "agglomerative",
    k,
    linkage,
    stats: buildStatsMetadata(dataset.statKeys, dataset.columnStats),
    assignments,
    warnings: [...dataset.warnings, ...result.warnings],
  };

  if (result.dendrogramSvg) {
    response.dendrogramSvg = result.dendrogramSvg;
  }

  if (result.dendrogramImage) {
    response.dendrogramImage = result.dendrogramImage;
  }

  if (result.linkageMatrix) {
    response.linkageMatrix = result.linkageMatrix;
  }

  return response;
}
