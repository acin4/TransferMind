import { HttpError } from "../lib/http.js";
import { runPythonApriori } from "../lib/pythonAprioriClient.js";
import { getTeamStatMetadata } from "../lib/teamStatsMetadata.js";
import { listTeamComparisonRowsByEntries } from "../repositories/teamRepository.js";
import { buildTeamAssociationRuleTransactions } from "./teamAssociationRulesDiscretization.js";

const MIN_TEAM_SEASON_ENTRIES = 5;
const MIN_STATS = 2;
const DISCRETIZATION_SETTINGS = {
  method: "equal-width",
  bins: ["low", "medium", "high"],
};

function parsePositiveIntegerField(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer.`);
  }

  return parsed;
}

function parseProbabilityThreshold(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    throw new HttpError(
      400,
      `${fieldName} must be greater than 0 and at most 1.`,
    );
  }

  return parsed;
}

function parseOptionalPositiveThreshold(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new HttpError(400, `${fieldName} must be greater than 0.`);
  }

  return parsed;
}

function parseAssociationRuleThresholds(payload) {
  return {
    minSupport: parseProbabilityThreshold(payload?.minSupport, "minSupport"),
    minConfidence: parseProbabilityThreshold(
      payload?.minConfidence,
      "minConfidence",
    ),
    minLift: parseOptionalPositiveThreshold(payload?.minLift, "minLift"),
  };
}

function buildEntryId(entry) {
  return `${entry.teamId}:${entry.tournamentId}:${entry.seasonId}`;
}

function buildRowEntryId(row) {
  return `${row.team_id}:${row.tournament_id}:${row.season_id}`;
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
    const entry = { teamId, tournamentId, seasonId };
    const entryKey = buildEntryId(entry);

    if (!seenEntryKeys.has(entryKey)) {
      seenEntryKeys.add(entryKey);
      entries.push(entry);
    }
  });

  if (entries.length < MIN_TEAM_SEASON_ENTRIES) {
    throw new HttpError(
      400,
      `Select at least ${MIN_TEAM_SEASON_ENTRIES} team-season entries.`,
    );
  }

  return entries;
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

  if (statKeys.length < MIN_STATS) {
    throw new HttpError(400, `Select at least ${MIN_STATS} statistics.`);
  }

  return statKeys;
}

function orderRowsBySelectedEntries(rows, teamSeasonEntries) {
  const rowsByEntryId = new Map(
    rows.map((row) => [buildRowEntryId(row), row]),
  );

  return teamSeasonEntries.map((entry) =>
    rowsByEntryId.get(buildEntryId(entry)),
  );
}

function countUniqueItems(transactions) {
  const items = new Set();

  transactions.forEach((transaction) => {
    transaction.items.forEach((item) => items.add(item));
  });

  return items.size;
}

function toPublicAssociationRulesResult(result) {
  return {
    context: {
      selectedEntryCount: result.selectedEntryCount,
      selectedStatCount: result.selectedStatCount,
      rowCount: result.rowCount,
      itemCount: result.itemCount,
      ruleCount: result.rules.length,
    },
    settings: result.settings,
    statKeys: result.statKeys,
    warnings: result.warnings,
    rules: result.rules,
  };
}

export async function prepareTeamAssociationRulesInput(payload) {
  const teamSeasonEntries = parseTeamSeasonEntries(payload?.teamSeasonEntries);
  const statKeys = parseStatKeys(payload?.statKeys);
  const rows = await listTeamComparisonRowsByEntries(teamSeasonEntries);

  if (rows.length !== teamSeasonEntries.length) {
    throw new HttpError(
      400,
      "One or more selected team-season entries do not exist.",
    );
  }

  const orderedRows = orderRowsBySelectedEntries(rows, teamSeasonEntries);

  if (orderedRows.some((row) => !row)) {
    throw new HttpError(
      400,
      "One or more selected team-season entries do not exist.",
    );
  }

  const { transactions, warnings } = buildTeamAssociationRuleTransactions(
    orderedRows,
    statKeys,
  );

  return {
    transactions,
    settings: {
      discretization: {
        method: DISCRETIZATION_SETTINGS.method,
        bins: [...DISCRETIZATION_SETTINGS.bins],
      },
      minimumTeamSeasonEntries: MIN_TEAM_SEASON_ENTRIES,
      minimumStats: MIN_STATS,
    },
    rowCount: orderedRows.length,
    itemCount: countUniqueItems(transactions),
    selectedEntryCount: teamSeasonEntries.length,
    selectedStatCount: statKeys.length,
    statKeys,
    warnings,
  };
}

export async function runTeamAssociationRules(payload) {
  const thresholds = parseAssociationRuleThresholds(payload);
  const preparedInput = await prepareTeamAssociationRulesInput(payload);
  const result = await runPythonApriori({
    transactions: preparedInput.transactions.map(
      (transaction) => transaction.items,
    ),
    minSupport: thresholds.minSupport,
    minConfidence: thresholds.minConfidence,
    minLift: thresholds.minLift,
  });

  return toPublicAssociationRulesResult({
    ...preparedInput,
    settings: {
      ...preparedInput.settings,
      minSupport: thresholds.minSupport,
      minConfidence: thresholds.minConfidence,
      minLift: thresholds.minLift,
    },
    rules: result.rules,
    warnings: [...preparedInput.warnings, ...result.warnings],
  });
}
