import { getTeamStatMetadata } from "../lib/teamStatsMetadata.js";

const LOW_BIN_MAX_EXCLUSIVE = 1 / 3;
const MEDIUM_BIN_MAX_EXCLUSIVE = 2 / 3;

function sanitizeStatValue(value) {
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

function roundScore(value) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(6));
}

function getAdjustedScore(rawValue, column) {
  const normalizedValue = column.isConstant
    ? 0
    : (rawValue - column.min) / (column.max - column.min);
  const adjustedValue =
    column.direction === "negative" ? 1 - normalizedValue : normalizedValue;

  return roundScore(adjustedValue);
}

function getBin(value) {
  if (value < LOW_BIN_MAX_EXCLUSIVE) {
    return "low";
  }

  if (value < MEDIUM_BIN_MAX_EXCLUSIVE) {
    return "medium";
  }

  return "high";
}

function buildEntryId(row) {
  return `${row.team_id}:${row.tournament_id}:${row.season_id}`;
}

function toTransactionRow(row, statKeys) {
  const rawStats = Object.fromEntries(
    statKeys.map((statKey) => [
      statKey,
      sanitizeStatValue(row.stats?.[statKey]),
    ]),
  );

  return {
    entryId: buildEntryId(row),
    metadata: {
      teamId: row.team_id,
      teamName: row.team_name,
      teamLogo: row.team_logo ?? null,
      tournamentId: row.tournament_id,
      tournamentName: row.tournament_name ?? null,
      seasonId: row.season_id,
      seasonName: row.season_name ?? null,
    },
    rawStats,
  };
}

function validateStatKeys(statKeys) {
  const uniqueStatKeys = [
    ...new Set(
      (statKeys ?? []).map((item) => String(item ?? "").trim()).filter(Boolean),
    ),
  ];
  const invalidStatKey = uniqueStatKeys.find(
    (statKey) => !getTeamStatMetadata(statKey),
  );

  if (invalidStatKey) {
    throw new Error(`Unknown statistic key: ${invalidStatKey}.`);
  }

  return uniqueStatKeys;
}

export function buildTeamAssociationRuleTransactions(rows, statKeys) {
  const selectedStatKeys = validateStatKeys(statKeys);
  const sourceRows = (rows ?? []).map((row) =>
    toTransactionRow(row, selectedStatKeys),
  );
  const warnings = [];

  const columns = Object.fromEntries(
    selectedStatKeys.map((statKey) => {
      const metadata = getTeamStatMetadata(statKey);
      const values = sourceRows.map((row) => row.rawStats[statKey]);
      const min = values.length > 0 ? Math.min(...values) : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;
      const isConstant = min === max;
      const adjustedConstantValue =
        metadata.direction === "negative" ? 1 : 0;

      if (isConstant) {
        warnings.push(
          `${metadata.label} is constant across the selected entries; its adjusted column was set to ${adjustedConstantValue}.`,
        );
      }

      return [
        statKey,
        {
          key: statKey,
          label: metadata.label,
          category: metadata.category,
          direction: metadata.direction,
          min,
          max,
          isConstant,
        },
      ];
    }),
  );

  const transactions = sourceRows.map((row) => {
    const adjustedStats = {};
    const bins = {};
    const items = selectedStatKeys.map((statKey) => {
      const adjustedValue = getAdjustedScore(
        row.rawStats[statKey],
        columns[statKey],
      );
      const bin = getBin(adjustedValue);

      adjustedStats[statKey] = adjustedValue;
      bins[statKey] = bin;

      return `${statKey}_${bin}`;
    });

    return {
      entryId: row.entryId,
      metadata: row.metadata,
      items,
      rawStats: row.rawStats,
      adjustedStats,
      bins,
    };
  });

  return {
    transactions,
    stats: selectedStatKeys.map((statKey) => columns[statKey]),
    warnings,
  };
}
