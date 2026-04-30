type TeamVenueObjectLike = {
  name?: string | null;
  city?: string | null;
};

export type TeamDisplayLocationLike = {
  name?: string | null;
  city?: string | null;
  country?: unknown;
  stadium?: string | null;
  venue?: string | TeamVenueObjectLike | null;
};

export type TeamDisplayVenueLike = {
  stadium?: string | null;
  venue?: string | TeamVenueObjectLike | null;
};

export function normalizeCountry(value: unknown) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

const GERMAN_TEAM_MARKERS = [
  "1. fc heidenheim",
  "1. fc koln",
  "1. fc union berlin",
  "1. fsv mainz 05",
  "bayer 04 leverkusen",
  "borussia dortmund",
  "borussia m'gladbach",
  "darmstadt 98",
  "eintracht frankfurt",
  "fc augsburg",
  "fc bayern munchen",
  "fc st. pauli",
  "hamburger sv",
  "holstein kiel",
  "rb leipzig",
  "sc freiburg",
  "sv werder bremen",
  "tsg hoffenheim",
  "vfb stuttgart",
  "vfl bochum",
  "vfl wolfsburg",
];

const ITALIAN_TEAM_MARKERS = [
  "atalanta",
  "bologna",
  "cagliari",
  "como",
  "cremonese",
  "empoli",
  "fiorentina",
  "frosinone",
  "genoa",
  "hellas verona",
  "inter",
  "juventus",
  "lazio",
  "lecce",
  "milan",
  "monza",
  "napoli",
  "parma",
  "pisa",
  "roma",
  "salernitana",
  "sassuolo",
  "torino",
  "udinese",
  "venezia",
];

const GERMAN_LOCATION_MARKERS = [
  "heidenheim",
  "cologne",
  "koln",
  "berlin",
  "mainz",
  "leverkusen",
  "dortmund",
  "monchengladbach",
  "darmstadt",
  "frankfurt",
  "augsburg",
  "munich",
  "hamburg",
  "kiel",
  "leipzig",
  "freiburg",
  "bremen",
  "sinsheim",
  "stuttgart",
  "bochum",
  "wolfsburg",
];

const ITALIAN_LOCATION_MARKERS = [
  "bergamo",
  "bologna",
  "cagliari",
  "como",
  "cremona",
  "empoli",
  "florence",
  "firenze",
  "frosinone",
  "genoa",
  "genova",
  "verona",
  "milan",
  "milano",
  "turin",
  "torino",
  "rome",
  "roma",
  "lecce",
  "monza",
  "naples",
  "napoli",
  "parma",
  "pisa",
  "salerno",
  "reggio emilia",
  "udine",
  "venice",
  "venezia",
];

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function includesAny(text: string, markers: string[]) {
  return markers.some((marker) => text.includes(marker));
}

export function getTeamCountry(
  team: TeamDisplayLocationLike | null | undefined,
) {
  if (!team) {
    return null;
  }

  const country = normalizeCountry(team.country);

  if (country) {
    return country;
  }

  const identityText = normalizeSearchText(
    [team.name, team.city, team.stadium, getVenueText(team.venue)]
      .filter(Boolean)
      .join(" "),
  );

  if (includesAny(identityText, GERMAN_TEAM_MARKERS)) {
    return "Germany";
  }

  if (includesAny(identityText, ITALIAN_TEAM_MARKERS)) {
    return "Italy";
  }

  if (includesAny(identityText, GERMAN_LOCATION_MARKERS)) {
    return "Germany";
  }

  if (includesAny(identityText, ITALIAN_LOCATION_MARKERS)) {
    return "Italy";
  }

  return null;
}

function getVenueText(venue: TeamDisplayLocationLike["venue"]) {
  if (typeof venue === "string") {
    return venue;
  }

  if (typeof venue === "object" && venue) {
    return [venue.name, venue.city].filter(Boolean).join(" ");
  }

  return null;
}

export function getTeamLocation(
  team: TeamDisplayLocationLike | null | undefined,
) {
  if (!team) {
    return null;
  }

  const city =
    (typeof team.city === "string" ? team.city : null) ||
    (typeof team.venue === "object" && team.venue
      ? team.venue.city ?? null
      : null);
  const country = getTeamCountry(team);

  if (city && country) {
    return `${city}, ${country}`;
  }

  return city || country || null;
}

export function getTeamStadium(
  team: TeamDisplayVenueLike | null | undefined,
) {
  if (!team) {
    return null;
  }

  if (typeof team.venue === "object" && team.venue) {
    const venueName = team.venue.name?.trim();
    if (venueName) {
      return venueName;
    }
  }

  if (typeof team.stadium === "string" && team.stadium.trim()) {
    return team.stadium.trim();
  }

  if (typeof team.venue === "string" && team.venue.trim()) {
    return team.venue.trim();
  }

  return null;
}
