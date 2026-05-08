import type { PlayerListStat } from "../api/api";

export type PlayerStatCategoryId =
  | "overview"
  | "attack"
  | "passing"
  | "defense"
  | "discipline"
  | "goalkeeping";

export type PlayerStatSectionId = "common" | "outfield" | "goalkeeping";

export type PlayerStatFormat = "number" | "rating" | "percent" | "boolean";

export type PlayerStatDefinition = {
  key: string;
  label: string;
  format?: PlayerStatFormat;
  categoryId: PlayerStatCategoryId;
};

export type PlayerStatCategory = {
  id: PlayerStatCategoryId;
  label: string;
  stats: PlayerStatDefinition[];
};

const CATEGORY_LABELS: Record<PlayerStatCategoryId, string> = {
  overview: "Overview",
  attack: "Attack",
  passing: "Passing",
  defense: "Defense",
  discipline: "Discipline",
  goalkeeping: "Goalkeeping",
};

const CATEGORY_ORDER: PlayerStatCategoryId[] = [
  "overview",
  "attack",
  "passing",
  "defense",
  "discipline",
  "goalkeeping",
];

const NON_GOALKEEPER_CATEGORY_ORDER: PlayerStatCategoryId[] = [
  "overview",
  "attack",
  "passing",
  "defense",
  "discipline",
];

const GOALKEEPER_CATEGORY_ORDER: PlayerStatCategoryId[] = [
  "overview",
  "goalkeeping",
];

const PLAYER_STAT_DEFINITIONS: PlayerStatDefinition[] = [
  defineStat("rating", "Rating", "overview", "rating"),
  defineStat("appearances", "Appearances", "overview"),
  defineStat("minutes_played", "Minutes Played", "overview"),
  defineStat("matches_started", "Matches Started", "overview"),
  defineStat("count_rating", "Rating Count", "overview"),
  defineStat("total_rating", "Total Rating", "overview", "rating"),
  defineStat("totw_appearances", "Team of the Week", "overview"),
  defineStat("goals", "Goals", "attack"),
  defineStat("assists", "Assists", "attack"),
  defineStat("goals_assists_sum", "Goals + Assists", "attack"),
  defineStat("total_shots", "Total Shots", "attack"),
  defineStat("shots_on_target", "Shots On Target", "attack"),
  defineStat("shots_off_target", "Shots Off Target", "attack"),
  defineStat("blocked_shots", "Blocked Shots", "attack"),
  defineStat("goal_conversion_percentage", "Goal Conversion", "attack", "percent"),
  defineStat("scoring_frequency", "Scoring Frequency", "attack"),
  defineStat("big_chances_created", "Big Chances Created", "attack"),
  defineStat("big_chances_missed", "Big Chances Missed", "attack"),
  defineStat("successful_dribbles", "Successful Dribbles", "attack"),
  defineStat("successful_dribbles_percentage", "Dribble Success", "attack", "percent"),
  defineStat("goals_from_inside_the_box", "Goals Inside Box", "attack"),
  defineStat("goals_from_outside_the_box", "Goals Outside Box", "attack"),
  defineStat("shots_from_inside_the_box", "Shots Inside Box", "attack"),
  defineStat("shots_from_outside_the_box", "Shots Outside Box", "attack"),
  defineStat("headed_goals", "Headed Goals", "attack"),
  defineStat("left_foot_goals", "Left Foot Goals", "attack"),
  defineStat("right_foot_goals", "Right Foot Goals", "attack"),
  defineStat("hit_woodwork", "Hit Woodwork", "attack"),
  defineStat("offsides", "Offsides", "attack"),
  defineStat("total_passes", "Total Passes", "passing"),
  defineStat("accurate_passes", "Accurate Passes", "passing"),
  defineStat("inaccurate_passes", "Inaccurate Passes", "passing"),
  defineStat("accurate_passes_percentage", "Pass Accuracy", "passing", "percent"),
  defineStat("accurate_own_half_passes", "Accurate Own Half Passes", "passing"),
  defineStat("total_own_half_passes", "Own Half Passes", "passing"),
  defineStat("accurate_opposition_half_passes", "Accurate Opposition Half Passes", "passing"),
  defineStat("total_opposition_half_passes", "Opposition Half Passes", "passing"),
  defineStat("accurate_final_third_passes", "Accurate Final Third Passes", "passing"),
  defineStat("total_chipped_passes", "Chipped Passes", "passing"),
  defineStat("accurate_chipped_passes", "Accurate Chipped Passes", "passing"),
  defineStat("total_long_balls", "Long Balls", "passing"),
  defineStat("accurate_long_balls", "Accurate Long Balls", "passing"),
  defineStat("accurate_long_balls_percentage", "Long Ball Accuracy", "passing", "percent"),
  defineStat("pass_to_assist", "Passes to Assist", "passing"),
  defineStat("total_cross", "Crosses", "passing"),
  defineStat("accurate_crosses", "Accurate Crosses", "passing"),
  defineStat("accurate_crosses_percentage", "Cross Accuracy", "passing", "percent"),
  defineStat("touches", "Touches", "passing"),
  defineStat("total_attempt_assist", "Attempted Assists", "passing"),
  defineStat("tackles", "Tackles", "defense"),
  defineStat("tackles_won", "Tackles Won", "defense"),
  defineStat("tackles_won_percentage", "Tackle Win Rate", "defense", "percent"),
  defineStat("interceptions", "Interceptions", "defense"),
  defineStat("clearances", "Clearances", "defense"),
  defineStat("dribbled_past", "Dribbled Past", "defense"),
  defineStat("possession_won_att_third", "Possession Won Attacking Third", "defense"),
  defineStat("ball_recovery", "Ball Recoveries", "defense"),
  defineStat("total_contest", "Total Contests", "defense"),
  defineStat("total_duels_won", "Duels Won", "defense"),
  defineStat("total_duels_won_percentage", "Duel Win Rate", "defense", "percent"),
  defineStat("ground_duels_won", "Ground Duels Won", "defense"),
  defineStat("ground_duels_won_percentage", "Ground Duel Win Rate", "defense", "percent"),
  defineStat("aerial_duels_won", "Aerial Duels Won", "defense"),
  defineStat("aerial_duels_won_percentage", "Aerial Duel Win Rate", "defense", "percent"),
  defineStat("duel_lost", "Duels Lost", "defense"),
  defineStat("aerial_lost", "Aerials Lost", "defense"),
  defineStat("error_lead_to_goal", "Errors Leading to Goal", "defense"),
  defineStat("error_lead_to_shot", "Errors Leading to Shot", "defense"),
  defineStat("dispossessed", "Dispossessed", "defense"),
  defineStat("possession_lost", "Possession Lost", "defense"),
  defineStat("fouls", "Fouls", "discipline"),
  defineStat("was_fouled", "Was Fouled", "discipline"),
  defineStat("yellow_cards", "Yellow Cards", "discipline"),
  defineStat("red_cards", "Red Cards", "discipline"),
  defineStat("direct_red_cards", "Direct Red Cards", "discipline"),
  defineStat("yellow_red_cards", "Second Yellow Reds", "discipline"),
  defineStat("own_goals", "Own Goals", "discipline"),
  defineStat("penalties_taken", "Penalties Taken", "discipline"),
  defineStat("penalty_goals", "Penalty Goals", "discipline"),
  defineStat("penalty_won", "Penalties Won", "discipline"),
  defineStat("penalty_conceded", "Penalties Conceded", "discipline"),
  defineStat("penalty_conversion", "Penalty Conversion", "discipline", "percent"),
  defineStat("set_piece_conversion", "Set Piece Conversion", "discipline", "percent"),
  defineStat("shot_from_set_piece", "Set Piece Shots", "discipline"),
  defineStat("free_kick_goal", "Free Kick Goals", "discipline"),
  defineStat("attempt_penalty_miss", "Penalty Misses", "discipline"),
  defineStat("attempt_penalty_post", "Penalty Posts", "discipline"),
  defineStat("attempt_penalty_target", "Penalty Shots on Target", "discipline"),
  defineStat("saves", "Saves", "goalkeeping"),
  defineStat("clean_sheet", "Clean Sheets", "goalkeeping"),
  defineStat("goal_kicks", "Goal Kicks", "goalkeeping"),
  defineStat("punches", "Punches", "goalkeeping"),
  defineStat("runs_out", "Runs Out", "goalkeeping"),
  defineStat("successful_runs_out", "Successful Runs Out", "goalkeeping"),
  defineStat("high_claims", "High Claims", "goalkeeping"),
  defineStat("saves_caught", "Saves Caught", "goalkeeping"),
  defineStat("saves_parried", "Saves Parried", "goalkeeping"),
  defineStat("saved_shots_from_inside_the_box", "Saved Shots Inside Box", "goalkeeping"),
  defineStat("saved_shots_from_outside_the_box", "Saved Shots Outside Box", "goalkeeping"),
  defineStat("goals_conceded", "Goals Conceded", "goalkeeping"),
  defineStat("goals_conceded_inside_the_box", "Goals Conceded Inside Box", "goalkeeping"),
  defineStat("goals_conceded_outside_the_box", "Goals Conceded Outside Box", "goalkeeping"),
  defineStat("penalty_faced", "Penalties Faced", "goalkeeping"),
  defineStat("penalty_save", "Penalty Saves", "goalkeeping"),
];

const PLAYER_STAT_DEFINITION_BY_KEY = new Map(
  PLAYER_STAT_DEFINITIONS.map((stat) => [stat.key, stat]),
);

const HIDDEN_STAT_KEYS = new Set(["has_stats"]);

const COMMON_CATEGORY_ORDER: PlayerStatCategoryId[] = [
  "overview",
  "discipline",
];

const OUTFIELD_CATEGORY_ORDER: PlayerStatCategoryId[] = [
  "attack",
  "passing",
  "defense",
];

const GOALKEEPER_ONLY_CATEGORY_ORDER: PlayerStatCategoryId[] = [
  "goalkeeping",
];

export function isGoalkeeperPosition(position: unknown) {
  const normalizedPositions = String(position ?? "")
    .split(/[,\s/]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  return (
    normalizedPositions.includes("goalkeeper") ||
    normalizedPositions.includes("gk")
  );
}

export function groupStatsByCategory(
  stats: PlayerListStat | null,
  position?: unknown,
): PlayerStatCategory[] {
  const allowedCategoryOrder = isGoalkeeperPosition(position)
    ? GOALKEEPER_CATEGORY_ORDER
    : NON_GOALKEEPER_CATEGORY_ORDER;
  const allowedCategories = new Set<PlayerStatCategoryId>(
    allowedCategoryOrder,
  );
  const keys = getDisplayStatKeys(stats);
  const groups = new Map<PlayerStatCategoryId, PlayerStatDefinition[]>(
    allowedCategoryOrder.map((categoryId) => [categoryId, []]),
  );

  keys.forEach((key) => {
    const definition =
      PLAYER_STAT_DEFINITION_BY_KEY.get(key) ?? createDynamicStat(key);
    const categoryId = allowedCategories.has(definition.categoryId)
      ? definition.categoryId
      : getFallbackCategoryId(definition.categoryId, allowedCategories);

    if (categoryId) {
      groups.get(categoryId)?.push({
        ...definition,
        categoryId,
      });
    }
  });

  return allowedCategoryOrder.map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
    stats: groups.get(id) ?? [],
  })).filter((category) => category.stats.length > 0);
}

export function groupStatsBySection(
  stats: PlayerListStat | null,
  sectionId: PlayerStatSectionId,
): PlayerStatCategory[] {
  const categoryOrder = getSectionCategoryOrder(sectionId);
  const allowedCategories = new Set<PlayerStatCategoryId>(categoryOrder);
  const groups = new Map<PlayerStatCategoryId, PlayerStatDefinition[]>(
    categoryOrder.map((categoryId) => [categoryId, []]),
  );

  getDisplayStatKeys(stats).forEach((key) => {
    const definition =
      PLAYER_STAT_DEFINITION_BY_KEY.get(key) ?? createDynamicStat(key);
    const categoryId = allowedCategories.has(definition.categoryId)
      ? definition.categoryId
      : null;

    if (categoryId) {
      groups.get(categoryId)?.push({
        ...definition,
        categoryId,
      });
    }
  });

  return categoryOrder
    .map((id) => ({
      id,
      label: CATEGORY_LABELS[id],
      stats: groups.get(id) ?? [],
    }))
    .filter((category) => category.stats.length > 0);
}

export function getStatValue(stats: PlayerListStat | null, key: string) {
  if (!stats) {
    return null;
  }

  const value = stats[key];

  if (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return null;
}

export function formatStatValue(
  value: string | number | boolean | null,
  format: PlayerStatFormat = "number",
) {
  if (value === null || value === "") {
    return "\u2014";
  }

  if (typeof value === "boolean" || format === "boolean") {
    return value ? "Yes" : "No";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  if (format === "rating") {
    return numericValue.toFixed(2);
  }

  if (format === "percent") {
    const percentValue =
      Math.abs(numericValue) <= 1 ? numericValue * 100 : numericValue;
    return `${percentValue.toFixed(1)}%`;
  }

  return Number.isInteger(numericValue)
    ? numericValue.toLocaleString()
    : numericValue.toFixed(2);
}

function defineStat(
  key: string,
  label: string,
  categoryId: PlayerStatCategoryId,
  format?: PlayerStatFormat,
): PlayerStatDefinition {
  return { key, label, categoryId, format };
}

function getDisplayStatKeys(stats: PlayerListStat | null) {
  if (!stats) {
    return [];
  }

  return Object.keys(stats).filter((key) => {
    const value = stats[key];
    return (
      !HIDDEN_STAT_KEYS.has(key) &&
      value !== null &&
      value !== undefined &&
      value !== ""
    );
  });
}

function getSectionCategoryOrder(sectionId: PlayerStatSectionId) {
  if (sectionId === "common") {
    return COMMON_CATEGORY_ORDER;
  }

  if (sectionId === "goalkeeping") {
    return GOALKEEPER_ONLY_CATEGORY_ORDER;
  }

  return OUTFIELD_CATEGORY_ORDER;
}

function createDynamicStat(key: string): PlayerStatDefinition {
  return defineStat(key, labelFromKey(key), inferCategoryId(key), inferFormat(key));
}

function getFallbackCategoryId(
  categoryId: PlayerStatCategoryId,
  allowedCategories: Set<PlayerStatCategoryId>,
) {
  if (categoryId === "goalkeeping") {
    return null;
  }

  if (allowedCategories.has("goalkeeping")) {
    return null;
  }

  return allowedCategories.has(categoryId) ? categoryId : null;
}

function inferCategoryId(key: string): PlayerStatCategoryId {
  const normalized = key.toLowerCase();

  if (
    normalized.includes("save") ||
    normalized.includes("keeper") ||
    normalized.includes("clean_sheet") ||
    normalized.includes("goal_kick") ||
    normalized.includes("punch") ||
    normalized.includes("claim") ||
    normalized.includes("conceded")
  ) {
    return "goalkeeping";
  }

  if (
    normalized.includes("card") ||
    normalized.includes("penalt") ||
    normalized.includes("foul") ||
    normalized.includes("free_kick") ||
    normalized.includes("set_piece") ||
    normalized.includes("own_goal")
  ) {
    return "discipline";
  }

  if (
    normalized.includes("pass") ||
    normalized.includes("cross") ||
    normalized.includes("ball") ||
    normalized.includes("touch") ||
    normalized.includes("assist")
  ) {
    return "passing";
  }

  if (
    normalized.includes("tackle") ||
    normalized.includes("interception") ||
    normalized.includes("clearance") ||
    normalized.includes("duel") ||
    normalized.includes("recovery") ||
    normalized.includes("error") ||
    normalized.includes("dribbled_past") ||
    normalized.includes("dispossessed") ||
    normalized.includes("possession_lost")
  ) {
    return "defense";
  }

  if (
    normalized.includes("goal") ||
    normalized.includes("shot") ||
    normalized.includes("chance") ||
    normalized.includes("dribble") ||
    normalized.includes("woodwork") ||
    normalized.includes("offside")
  ) {
    return "attack";
  }

  if (
    normalized.includes("rating") ||
    normalized.includes("appearance") ||
    normalized.includes("minute") ||
    normalized.includes("match")
  ) {
    return "overview";
  }

  return "overview";
}

function inferFormat(key: string): PlayerStatFormat | undefined {
  const normalized = key.toLowerCase();

  if (normalized.includes("percentage") || normalized.includes("conversion")) {
    return "percent";
  }

  if (normalized.includes("rating")) {
    return "rating";
  }

  return undefined;
}

function labelFromKey(key: string) {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
