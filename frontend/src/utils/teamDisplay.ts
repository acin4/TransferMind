type TeamVenueObjectLike = {
  name?: string | null;
  city?: string | null;
};

export type TeamDisplayLocationLike = {
  city?: string | null;
  country?: unknown;
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
  const country = normalizeCountry(team.country);

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
