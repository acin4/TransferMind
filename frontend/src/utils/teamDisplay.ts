type TeamVenueObjectLike = {
  name?: string | null;
  city?: string | null;
};

type TeamDisplayLocationLike = {
  city?: string | null;
  country?: string | null;
  stadium?: string | null;
  venue?: string | TeamVenueObjectLike | null;
};

type TeamDisplayVenueLike = {
  stadium?: string | null;
  venue?: string | TeamVenueObjectLike | null;
};

function normalizeCountry(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const text = value.trim();
  return text || null;
}

function normalizeDisplayText(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const text = value.trim();
  return text || null;
}

export function getTeamCountry(
  team: TeamDisplayLocationLike | null | undefined,
) {
  if (!team) {
    return null;
  }

  return normalizeCountry(team.country);
}

export function getTeamLocation(
  team: TeamDisplayLocationLike | null | undefined,
) {
  if (!team) {
    return null;
  }

  const city = normalizeDisplayText(team.city);
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
    const venueName = normalizeDisplayText(team.venue.name);
    if (venueName) {
      return venueName;
    }
  }

  const stadium = normalizeDisplayText(team.stadium);
  if (stadium) {
    return stadium;
  }

  if (typeof team.venue === "string") {
    return normalizeDisplayText(team.venue);
  }

  return null;
}
