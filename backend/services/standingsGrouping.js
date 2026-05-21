export function dedupeStandingsRowsByTeam(rows) {
  const rowsByTeamId = new Map();

  rows.forEach((row) => {
    const teamKey = row.team_id == null ? `row:${row.id}` : String(row.team_id);
    const existing = rowsByTeamId.get(teamKey);

    if (
      !existing ||
      (row.position ?? Number.MAX_SAFE_INTEGER) <
        (existing.position ?? Number.MAX_SAFE_INTEGER)
    ) {
      rowsByTeamId.set(teamKey, row);
    }
  });

  return Array.from(rowsByTeamId.values()).sort(
    (a, b) =>
      (a.position ?? Number.MAX_SAFE_INTEGER) -
      (b.position ?? Number.MAX_SAFE_INTEGER),
  );
}
