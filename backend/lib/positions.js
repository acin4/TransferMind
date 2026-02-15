export function createPositionService(supabase) {
  const positionCache = new Map(); // Map<code, id>

  async function ensurePositionsAndGetIdMap(codes) {
    const clean = Array.isArray(codes)
      ? [
          ...new Set(
            codes
              .map((c) => (typeof c === "string" ? c.trim() : ""))
              .filter(Boolean),
          ),
        ]
      : [];

    if (clean.length === 0) return new Map();

    const missing = clean.filter((c) => !positionCache.has(c));

    if (missing.length > 0) {
      const { data: existing, error: selErr } = await supabase
        .from("positions")
        .select("id, position")
        .in("position", missing);

      if (selErr) throw selErr;

      for (const row of existing || []) {
        positionCache.set(row.position, row.id);
      }

      const stillMissing = missing.filter((c) => !positionCache.has(c));

      if (stillMissing.length > 0) {
        const { error: upErr } = await supabase.from("positions").upsert(
          stillMissing.map((c) => ({ position: c })),
          {
            onConflict: "position",
          },
        );

        if (upErr) throw upErr;

        const { data: inserted, error: reErr } = await supabase
          .from("positions")
          .select("id, position")
          .in("position", stillMissing);

        if (reErr) throw reErr;

        for (const row of inserted || []) {
          positionCache.set(row.position, row.id);
        }
      }
    }

    const out = new Map();
    for (const c of clean) {
      out.set(c, positionCache.get(c));
    }

    return out;
  }

  async function replacePlayerPositions(playerIds, joinRows) {
    if (!playerIds?.length) return;

    const { error: delErr } = await supabase
      .from("player_positions")
      .delete()
      .in("player_id", playerIds);

    if (delErr) throw delErr;

    if (!joinRows.length) return;

    const { error: insErr } = await supabase
      .from("player_positions")
      .insert(joinRows);

    if (insErr) throw insErr;
  }

  return {
    ensurePositionsAndGetIdMap,
    replacePlayerPositions,
  };
}

export function normalizePositions(p) {
  // Case 1: positionsDetailed exists and is array
  if (Array.isArray(p.positionsDetailed)) {
    return p.positionsDetailed
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
  }

  console.log("position detailed", p.positionsDetailed);

  // Case 2: position exists but is single value (string)
  if (typeof p.position === "string") {
    return [p.position.trim()].filter(Boolean);
  }

  console.log("position", p.position);

  // Fallback: no positions
  return [];
}

/*export function getCurrentSeason() {
  let date = new Date();
  let year = date.getFullYear();
  let season = "";
  console.log("Current date and time:", date.toString());

  if (date < "2026-07-01") {
    season = `${year - 1}/${year}`;
  } else {
    season = `${year}/${year + 1}`;
  }

  return season;
}*/
