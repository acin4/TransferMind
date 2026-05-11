export const POSITION_GROUP_ORDER = {
  GK: 0,
  DEF: 1,
  MID: 2,
  ATT: 3,
  UNKNOWN: 99,
} as const;

export type PositionGroup = keyof typeof POSITION_GROUP_ORDER;

export type SortablePlayerByPosition = {
  name: string;
  position?: string | null;
};

export const POSITION_GROUPS = {
  GK: ["GK"],
  DEF: ["CB", "LB", "RB", "LWB", "RWB", "SW", "DC", "DL", "DR"],
  MID: ["CDM", "CM", "CAM", "DM", "MC", "AMC", "ML", "MR", "LM", "RM"],
  ATT: ["LW", "RW", "ST", "CF", "SS", "AM", "WF"],
} as const satisfies Record<
  Exclude<PositionGroup, "UNKNOWN">,
  readonly string[]
>;

const POSITION_TO_GROUP = new Map<string, PositionGroup>(
  Object.entries(POSITION_GROUPS).flatMap(([group, positions]) =>
    positions.map((position) => [position, group as PositionGroup]),
  ),
);

const PLAYER_NAME_COLLATOR = new Intl.Collator(undefined, {
  sensitivity: "base",
});

export function getPrimaryPosition(position: string | null | undefined): string {
  const [primaryPosition] = (position ?? "").split(",");
  return normalizePositionCode(primaryPosition);
}

export function getPositionGroup(
  position: string | null | undefined,
): PositionGroup {
  return POSITION_TO_GROUP.get(getPrimaryPosition(position)) ?? "UNKNOWN";
}

export function sortPlayersByPosition<TPlayer extends SortablePlayerByPosition>(
  players: readonly TPlayer[],
): TPlayer[] {
  return [...players].sort(comparePlayersByPositionGroup);
}

function comparePlayersByPositionGroup<TPlayer extends SortablePlayerByPosition>(
  firstPlayer: TPlayer,
  secondPlayer: TPlayer,
): number {
  const firstGroup = getPositionGroup(firstPlayer.position);
  const secondGroup = getPositionGroup(secondPlayer.position);
  const groupComparison =
    POSITION_GROUP_ORDER[firstGroup] - POSITION_GROUP_ORDER[secondGroup];

  if (groupComparison !== 0) {
    return groupComparison;
  }

  return PLAYER_NAME_COLLATOR.compare(firstPlayer.name, secondPlayer.name);
}

function normalizePositionCode(position: string | undefined): string {
  const normalizedPosition = position?.trim().toUpperCase() ?? "";
  return normalizedPosition === "-" ? "" : normalizedPosition;
}
