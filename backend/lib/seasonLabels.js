const COMPACT_SEASON_LABEL_PATTERN = /^\d{2}\/\d{2}$/;

function getTrimmedText(value) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

export function toCompactSeasonLabel(value) {
  const text = getTrimmedText(value);

  if (!text) {
    return null;
  }

  const compactMatch = text.match(/\b(\d{2})\s*\/\s*(\d{2})\b/);

  if (compactMatch) {
    return `${compactMatch[1]}/${compactMatch[2]}`;
  }

  const fullMatch = text.match(/\b(\d{4})\s*\/\s*(\d{4})\b/);

  if (fullMatch) {
    return `${fullMatch[1].slice(-2)}/${fullMatch[2].slice(-2)}`;
  }

  const mixedMatch = text.match(/\b(\d{4})\s*\/\s*(\d{2})\b/);

  if (mixedMatch) {
    return `${mixedMatch[1].slice(-2)}/${mixedMatch[2]}`;
  }

  return null;
}

export function getSeasonLabel(row) {
  const existingLabel = getTrimmedText(row?.season_name);

  if (existingLabel && COMPACT_SEASON_LABEL_PATTERN.test(existingLabel)) {
    return existingLabel;
  }

  return (
    toCompactSeasonLabel(row?.year) ??
    toCompactSeasonLabel(row?.season_year) ??
    toCompactSeasonLabel(row?.name) ??
    toCompactSeasonLabel(row?.season_name) ??
    existingLabel ??
    getTrimmedText(row?.name) ??
    (row?.id != null ? `Season ${row.id}` : null)
  );
}

export function getSeasonEndYear(row) {
  const seasonLabel =
    toCompactSeasonLabel(row?.year) ??
    toCompactSeasonLabel(row?.season_year) ??
    toCompactSeasonLabel(row?.name) ??
    toCompactSeasonLabel(row?.season_name);

  if (!seasonLabel) {
    return -1;
  }

  const parts = seasonLabel.split("/");
  const endYear = Number(parts[1]);

  if (Number.isNaN(endYear)) {
    return -1;
  }

  return 2000 + endYear;
}
