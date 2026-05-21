import { HttpError, parseInteger } from "../lib/http.js";
import { runTeamAssociationRules } from "../services/teamAssociationRulesService.js";
import {
  calculateTeamClusterElbow,
  runTeamAgglomerativeClusters,
  runTeamClusters,
} from "../services/teamClusteringService.js";
import {
  getTeam,
  getTeamComparisonMatrix,
  getPaginatedTeams,
  getTeamProfile,
  getTeamSeasons,
  getTeamStats,
  getTeamsComparisonDataset,
  getTeams,
} from "../services/teamService.js";
import { getPlayers } from "../services/playerService.js";

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const DEFAULT_ASSOCIATION_RULES_PAGE = 1;
const DEFAULT_ASSOCIATION_RULES_PAGE_SIZE = 50;
const MAX_ASSOCIATION_RULES_PAGE_SIZE = 100;

function parseOptionalInteger(value, fieldName) {
  return value !== undefined ? parseInteger(value, fieldName) : undefined;
}

function parseOptionalClampedPositiveInteger(value, fieldName, defaultValue) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new HttpError(400, `${fieldName} must be an integer.`);
  }

  return Math.max(parsed, 1);
}

function parsePaginatedQuery(query) {
  const page = parseOptionalInteger(query.page, "page") ?? 1;
  const requestedLimit =
    parseOptionalInteger(query.limit, "limit") ?? DEFAULT_PAGE_LIMIT;
  const search =
    typeof query.search === "string" ? query.search.trim() : "";
  const country =
    typeof query.country === "string" ? query.country.trim() : "";

  return {
    page,
    limit: Math.min(requestedLimit, MAX_PAGE_LIMIT),
    search,
    country,
  };
}

function hasPaginatedTeamQuery(query) {
  return ["page", "limit", "search", "country"].some(
    (key) => query[key] !== undefined,
  );
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

function parseOptionalPositiveLiftThreshold(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 1) {
    throw new HttpError(400, `${fieldName} must be greater than 1.`);
  }

  return parsed;
}

function parseTeamSeasonEntries(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, "teamSeasonEntries must be a non-empty array.");
  }

  const entries = [];
  const seenEntryKeys = new Set();

  value.forEach((item, index) => {
    const entry = {
      teamId: parseInteger(item?.teamId, `teamSeasonEntries[${index}].teamId`),
      tournamentId: parseInteger(
        item?.tournamentId,
        `teamSeasonEntries[${index}].tournamentId`,
      ),
      seasonId: parseInteger(
        item?.seasonId,
        `teamSeasonEntries[${index}].seasonId`,
      ),
    };
    const entryKey = `${entry.teamId}:${entry.tournamentId}:${entry.seasonId}`;

    if (!seenEntryKeys.has(entryKey)) {
      seenEntryKeys.add(entryKey);
      entries.push(entry);
    }
  });

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

  if (statKeys.length === 0) {
    throw new HttpError(400, "statKeys must include at least one value.");
  }

  return statKeys;
}

function parseAssociationRulesPayload(payload) {
  const requestedPageSize = parseOptionalClampedPositiveInteger(
    payload?.pageSize,
    "pageSize",
    DEFAULT_ASSOCIATION_RULES_PAGE_SIZE,
  );

  return {
    teamSeasonEntries: parseTeamSeasonEntries(payload?.teamSeasonEntries),
    statKeys: parseStatKeys(payload?.statKeys),
    minSupport: parseProbabilityThreshold(payload?.minSupport, "minSupport"),
    minConfidence: parseProbabilityThreshold(
      payload?.minConfidence,
      "minConfidence",
    ),
    minLift: parseOptionalPositiveLiftThreshold(payload?.minLift, "minLift"),
    page: parseOptionalClampedPositiveInteger(
      payload?.page,
      "page",
      DEFAULT_ASSOCIATION_RULES_PAGE,
    ),
    pageSize: Math.min(
      requestedPageSize,
      MAX_ASSOCIATION_RULES_PAGE_SIZE,
    ),
  };
}

export async function listTeamsController(req, res) {
  if (hasPaginatedTeamQuery(req.query)) {
    const teams = await getPaginatedTeams(parsePaginatedQuery(req.query));
    res.status(200).json(teams);
    return;
  }

  const teams = await getTeams();
  res.status(200).json({ data: teams });
}

export async function listTeamPlayersController(req, res) {
  const teamId = parseInteger(req.params.id, "id");
  const query = parsePaginatedQuery(req.query);
  const players = await getPlayers({
    teamId,
    page: query.page,
    limit: query.limit,
    search: query.search,
  });

  res.status(200).json(players);
}

export async function getTeamsComparisonDatasetController(req, res) {
  const dataset = await getTeamsComparisonDataset();
  res.status(200).json({ data: dataset });
}

export async function createTeamsComparisonDatasetController(req, res) {
  const dataset = await getTeamComparisonMatrix(req.body);
  res.status(200).json({ data: dataset });
}

export async function calculateTeamClusterElbowController(req, res) {
  const dataset = await calculateTeamClusterElbow(req.body);
  res.status(200).json({ data: dataset });
}

export async function runTeamClustersController(req, res) {
  const dataset = await runTeamClusters(req.body);
  res.status(200).json({ data: dataset });
}

export async function runTeamAgglomerativeClustersController(req, res) {
  const dataset = await runTeamAgglomerativeClusters(req.body);
  res.status(200).json({ data: dataset });
}

export async function runTeamAssociationRulesController(req, res) {
  const dataset = await runTeamAssociationRules(
    parseAssociationRulesPayload(req.body),
  );
  res.status(200).json({ data: dataset });
}

export async function getTeamController(req, res) {
  const id = parseInteger(req.params.id, "id");
  const team = await getTeam(id);

  if (!team) {
    res.status(404).json({ error: "Team not found." });
    return;
  }

  res.status(200).json({ data: team });
}

export async function getTeamProfileController(req, res) {
  const id = parseInteger(req.params.id, "id");
  const seasonId =
    req.query.seasonId !== undefined
      ? parseInteger(req.query.seasonId, "seasonId")
      : undefined;
  const profile = await getTeamProfile(id, seasonId);

  res.status(200).json({ data: profile });
}

export async function getTeamStatsController(req, res) {
  const id = parseInteger(req.params.id, "id");
  const seasonId =
    req.query.seasonId !== undefined
      ? parseInteger(req.query.seasonId, "seasonId")
      : undefined;
  const stats = await getTeamStats(id, seasonId);
  res.status(200).json({ data: stats });
}

export async function listTeamSeasonsController(req, res) {
  const id = parseInteger(req.params.id, "id");
  const seasons = await getTeamSeasons(id);
  res.status(200).json({ data: seasons });
}
