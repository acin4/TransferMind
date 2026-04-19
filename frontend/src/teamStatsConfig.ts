export type TeamStatDisplayFormat = "number" | "percent" | "ratio";

export type TeamStatMeta = {
  label: string;
  format?: TeamStatDisplayFormat;
};

function defineTeamStatMeta<T extends Record<string, TeamStatMeta>>(meta: T) {
  return meta;
}

const TEAM_STAT_META = defineTeamStatMeta({
  goals_scored: { label: "Goals Scored" },
  assists: { label: "Assists" },
  shots: { label: "Shots" },
  shots_ontarget: { label: "Shots On Target" },
  shots_offtarget: { label: "Shots Off Target" },
  shots_blocked: { label: "Shots Blocked" },
  shots_ontarget_ratio: { label: "Shots On Target Ratio", format: "percent" },
  goalspershot_ratio: { label: "Goals per Shot Ratio", format: "ratio" },
  dribbles_success: { label: "Successful Dribbles" },
  dribbles_attempts: { label: "Dribble Attempts" },
  dribbles_success_ratio: { label: "Dribble Success Ratio", format: "percent" },
  big_chances_created: { label: "Big Chances Created" },
  big_chances: { label: "Big Chances" },
  big_chances_missed: { label: "Big Chances Missed" },
  big_chances_goal_ratio: {
    label: "Big Chance Conversion Ratio",
    format: "percent",
  },
  goals_inside_box: { label: "Goals Inside Box" },
  shots_inside_box: { label: "Shots Inside Box" },
  goals_inside_ratio: { label: "Goals Inside Box Ratio", format: "percent" },
  shots_inside_ratio: { label: "Shots Inside Box Ratio", format: "percent" },
  goals_outside_box: { label: "Goals Outside Box" },
  shots_outside_box: { label: "Shots Outside Box" },
  goals_outside_ratio: { label: "Goals Outside Box Ratio", format: "percent" },
  shots_outside_ratio: { label: "Shots Outside Box Ratio", format: "percent" },
  goals_header: { label: "Headed Goals" },
  goals_header_ratio: { label: "Headed Goals Ratio", format: "percent" },
  woodwork: { label: "Hit Woodwork" },
  fastbreak_total: { label: "Fast Breaks" },
  fastbreak_goals: { label: "Fast Break Goals" },
  fastbreak_shots: { label: "Fast Break Shots" },
  fastbreak_ratio: { label: "Fast Break Ratio", format: "percent" },
  avg_ball_possession: { label: "Average Ball Possession", format: "percent" },
  pass_total: { label: "Total Passes" },
  pass_acc: { label: "Accurate Passes" },
  pass_acc_percentage: { label: "Pass Accuracy %", format: "percent" },
  pass_ownhalf_total: { label: "Own Half Passes" },
  pass_ownhalf_acc: { label: "Accurate Own Half Passes" },
  pass_ownhalf_perc: { label: "Own Half Pass Accuracy %", format: "percent" },
  pass_opphalf_total: { label: "Opposition Half Passes" },
  pass_opphalf_acc: { label: "Accurate Opposition Half Passes" },
  pass_opphalf_perc: {
    label: "Opposition Half Pass Accuracy %",
    format: "percent",
  },
  longballs_total: { label: "Total Long Balls" },
  longballs_acc: { label: "Accurate Long Balls" },
  longballs_perc: { label: "Long Ball Accuracy %", format: "percent" },
  cross_total: { label: "Total Crosses" },
  cross_acc: { label: "Accurate Crosses" },
  cross_perc: { label: "Cross Accuracy %", format: "percent" },
  goals_conceded: { label: "Goals Conceded" },
  own_goals: { label: "Own Goals" },
  cleansheats: { label: "Clean Sheets" },
  tackles: { label: "Tackles" },
  interceptions: { label: "Interceptions" },
  clearences: { label: "Clearances" },
  duels_total: { label: "Total Duels" },
  duels_won: { label: "Duels Won" },
  duels_perc: { label: "Duel Win %", format: "percent" },
  ground_duels_total: { label: "Ground Duels" },
  ground_duels_won: { label: "Ground Duels Won" },
  ground_duels_perc: { label: "Ground Duel Win %", format: "percent" },
  aerial_duels_total: { label: "Aerial Duels" },
  aerial_duels_won: { label: "Aerial Duels Won" },
  aerial_duels_perc: { label: "Aerial Duel Win %", format: "percent" },
  clearences_offline: { label: "Goal-Line Clearances" },
  saves: { label: "Saves" },
  lastman_tackles: { label: "Last-Man Tackles" },
  errors_to_goals: { label: "Errors Leading to Goals" },
  errors_to_shot: { label: "Errors Leading to Shots" },
  penalty_scored: { label: "Penalties Scored" },
  penalty_taken: { label: "Penalties Taken" },
  penalty_ratio: { label: "Penalty Conversion %", format: "percent" },
  freekick_goals: { label: "Free-Kick Goals" },
  freekick_taken: { label: "Free-Kicks Taken" },
  freekick_ratio: { label: "Free-Kick Conversion %", format: "percent" },
  fouls: { label: "Fouls" },
  yellowcards: { label: "Yellow Cards" },
  yellowcards_second: { label: "Second Yellow Red Cards" },
  redcards: { label: "Red Cards" },
  offsides: { label: "Offsides" },
  possession_lost: { label: "Possession Lost" },
  shots_against: { label: "Shots Against" },
  shots_ontarget_against: { label: "Shots On Target Against" },
  shots_offtarget_against: { label: "Shots Off Target Against" },
  shots_blocked_against: { label: "Shots Blocked Against" },
  shots_ontarget_against_ratio: {
    label: "Shots On Target Against Ratio",
    format: "percent",
  },
  goalspershot_against_ratio: {
    label: "Goals per Shot Against Ratio",
    format: "ratio",
  },
  big_chances_against: { label: "Big Chances Against" },
  big_chances_against_created: { label: "Big Chances Created Against" },
  big_chances_against_missed: { label: "Big Chances Missed Against" },
  big_chances_goal_against_ratio: {
    label: "Goals per Big Chance Against Ratio",
    format: "ratio",
  },
  woodwork_against: { label: "Woodwork Against" },
  penalty_commited: { label: "Penalties Committed" },
  penalty_conceded: { label: "Penalties Conceded" },
  pass_against_total: { label: "Passes Against" },
  pass_against_acc: { label: "Accurate Passes Against" },
  pass_against_ratio: { label: "Pass Accuracy Against %", format: "percent" },
  finalthirdpass_against_total: { label: "Final Third Passes Against" },
  finalthirdpass_against_acc: {
    label: "Accurate Final Third Passes Against",
  },
  finalthirdpass_against_ratio: {
    label: "Final Third Pass Accuracy Against %",
    format: "percent",
  },
  opphalfpass_against_total: { label: "Opposition Half Passes Against" },
  opphalfpass_against_acc: {
    label: "Accurate Opposition Half Passes Against",
  },
  opphalfpass_against_ratio: {
    label: "Opposition Half Pass Accuracy Against %",
    format: "percent",
  },
  ownhalfpass_against_total: { label: "Own Half Passes Against" },
  ownhalfpass_against_acc: { label: "Accurate Own Half Passes Against" },
  ownhalfpass_against_ratio: {
    label: "Own Half Pass Accuracy Against %",
    format: "percent",
  },
  keypass_against: { label: "Key Passes Against" },
  longballs_against_total: { label: "Long Balls Against" },
  longballs_against_acc: { label: "Accurate Long Balls Against" },
  longballs_against_ratio: {
    label: "Long Ball Accuracy Against %",
    format: "percent",
  },
  cross_against_total: { label: "Crosses Against" },
  cross_against_acc: { label: "Accurate Crosses Against" },
  cross_against_ratio: { label: "Cross Accuracy Against %", format: "percent" },
  dribbles_against_total: { label: "Dribble Attempts Against" },
  dribbles_against_acc: { label: "Successful Dribbles Against" },
  dribbles_against_ratio: {
    label: "Dribble Success Against %",
    format: "percent",
  },
  tackles_against: { label: "Tackles Against" },
  clearences_against: { label: "Clearances Against" },
  interceptions_against: { label: "Interceptions Against" },
  corners_against: { label: "Corners Against" },
  offsides_against: { label: "Offsides Against" },
  errors_to_goals_against: { label: "Errors Leading to Goals Against" },
  errors_to_shot_against: { label: "Errors Leading to Shots Against" },
  yellowcards_against: { label: "Yellow Cards Against" },
  redcards_against: { label: "Red Cards Against" },
} as const);

export type TeamStatKey = keyof typeof TEAM_STAT_META;

type TeamStatsCategoryDefinition = {
  id: string;
  label: string;
  statKeys: readonly TeamStatKey[];
};

export const TEAM_STATS_CATEGORIES = [
  {
    id: "attack",
    label: "Attack",
    statKeys: [
      "goals_scored",
      "assists",
      "shots",
      "shots_ontarget",
      "shots_offtarget",
      "shots_blocked",
      "shots_ontarget_ratio",
      "goalspershot_ratio",
      "dribbles_success",
      "dribbles_attempts",
      "dribbles_success_ratio",
      "big_chances_created",
      "big_chances",
      "big_chances_missed",
      "big_chances_goal_ratio",
      "goals_inside_box",
      "shots_inside_box",
      "goals_inside_ratio",
      "shots_inside_ratio",
      "goals_outside_box",
      "shots_outside_box",
      "goals_outside_ratio",
      "shots_outside_ratio",
      "goals_header",
      "goals_header_ratio",
      "woodwork",
      "fastbreak_total",
      "fastbreak_goals",
      "fastbreak_shots",
      "fastbreak_ratio",
    ],
  },
  {
    id: "passing",
    label: "Passing",
    statKeys: [
      "avg_ball_possession",
      "pass_total",
      "pass_acc",
      "pass_acc_percentage",
      "pass_ownhalf_total",
      "pass_ownhalf_acc",
      "pass_ownhalf_perc",
      "pass_opphalf_total",
      "pass_opphalf_acc",
      "pass_opphalf_perc",
      "longballs_total",
      "longballs_acc",
      "longballs_perc",
      "cross_total",
      "cross_acc",
      "cross_perc",
    ],
  },
  {
    id: "defence",
    label: "Defence",
    statKeys: [
      "goals_conceded",
      "own_goals",
      "cleansheats",
      "tackles",
      "interceptions",
      "clearences",
      "duels_total",
      "duels_won",
      "duels_perc",
      "ground_duels_total",
      "ground_duels_won",
      "ground_duels_perc",
      "aerial_duels_total",
      "aerial_duels_won",
      "aerial_duels_perc",
      "clearences_offline",
      "saves",
      "lastman_tackles",
      "errors_to_goals",
      "errors_to_shot",
    ],
  },
  {
    id: "set-pieces-discipline",
    label: "Set Pieces / Discipline",
    statKeys: [
      "penalty_scored",
      "penalty_taken",
      "penalty_ratio",
      "freekick_goals",
      "freekick_taken",
      "freekick_ratio",
      "fouls",
      "yellowcards",
      "yellowcards_second",
      "redcards",
      "offsides",
    ],
  },
  {
    id: "against",
    label: "Against",
    statKeys: [
      "possession_lost",
      "shots_against",
      "shots_ontarget_against",
      "shots_offtarget_against",
      "shots_blocked_against",
      "shots_ontarget_against_ratio",
      "goalspershot_against_ratio",
      "big_chances_against",
      "big_chances_against_created",
      "big_chances_against_missed",
      "big_chances_goal_against_ratio",
      "woodwork_against",
      "penalty_commited",
      "penalty_conceded",
      "pass_against_total",
      "pass_against_acc",
      "pass_against_ratio",
      "finalthirdpass_against_total",
      "finalthirdpass_against_acc",
      "finalthirdpass_against_ratio",
      "opphalfpass_against_total",
      "opphalfpass_against_acc",
      "opphalfpass_against_ratio",
      "ownhalfpass_against_total",
      "ownhalfpass_against_acc",
      "ownhalfpass_against_ratio",
      "keypass_against",
      "longballs_against_total",
      "longballs_against_acc",
      "longballs_against_ratio",
      "cross_against_total",
      "cross_against_acc",
      "cross_against_ratio",
      "dribbles_against_total",
      "dribbles_against_acc",
      "dribbles_against_ratio",
      "tackles_against",
      "clearences_against",
      "interceptions_against",
      "corners_against",
      "offsides_against",
      "errors_to_goals_against",
      "errors_to_shot_against",
      "yellowcards_against",
      "redcards_against",
    ],
  },
] as const satisfies readonly TeamStatsCategoryDefinition[];

export type TeamStatsCategoryId = (typeof TEAM_STATS_CATEGORIES)[number]["id"];

export type TeamStats = Partial<Record<TeamStatKey, number | string | null>> &
  Record<string, unknown>;

export function getTeamStatMeta(statKey: TeamStatKey): TeamStatMeta {
  return TEAM_STAT_META[statKey];
}

export function formatTeamStatValue(
  value: unknown,
  format: TeamStatDisplayFormat = "number",
) {
  if (value == null || value === "") {
    return "—";
  }

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return "—";
  }

  const formattedValue = numericValue.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });

  if (format === "percent") {
    return `${formattedValue}%`;
  }

  return formattedValue;
}
