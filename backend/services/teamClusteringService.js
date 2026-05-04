import { HttpError } from "../lib/http.js";
import { runPythonKMeans } from "../lib/pythonKMeansClient.js";
import { getTeamStatMetadata } from "../lib/teamStatsMetadata.js";
import { listTeamComparisonRowsByEntries } from "../repositories/teamRepository.js";

const MAX_CLUSTER_K = 20;
const MAX_ITERATIONS = 100;
const KMEANS_SEED = 42;

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

function sanitizeClusterStatValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue === "") {
      return 0;
    }

    const parsed = Number(trimmedValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
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
  };
}

function buildNormalizedMatrix(rows, statKeys) {
  const warnings = [];
  const matrixSourceRows = rows.map((row) => toClusterRow(row, statKeys));

  const columnStats = Object.fromEntries(
    statKeys.map((statKey) => {
      const values = matrixSourceRows.map((row) => row.rawStats[statKey]);
      const min = Math.min(...values);
      const max = Math.max(...values);

      if (min === max) {
        warnings.push(
          `${getTeamStatMetadata(statKey).label} is constant across the selected entries; its normalized column was set to 0.`,
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

  const matrixRows = matrixSourceRows.map((row) => {
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
  const { matrixRows, columnStats, warnings } = buildNormalizedMatrix(
    orderedRows,
    statKeys,
  );

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
