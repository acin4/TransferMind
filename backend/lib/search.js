const EXACT_MATCH_RANK = 0;
const STARTS_WITH_MATCH_RANK = 1;
const WORD_START_MATCH_RANK = 2;
const CONTAINS_MATCH_RANK = 3;

export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/\u03c2/g, "\u03c3")
    .replace(/[_\-.,:;()[\]{}'"!?|\\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getSearchTokens(query) {
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

export function matchesSearch(query, fields) {
  return rankSearchMatch(query, fields) !== null;
}

export function rankSearchMatch(query, fields) {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = getSearchTokens(query);

  if (!normalizedQuery || queryTokens.length === 0) {
    return {
      rank: EXACT_MATCH_RANK,
      matchedText: "",
    };
  }

  const normalizedFields = fields
    .map((field) => normalizeSearchText(field))
    .filter(Boolean);

  if (normalizedFields.length === 0) {
    return null;
  }

  const queryLength = getSearchQueryLength(normalizedQuery);

  if (
    !queryTokens.every((token) =>
      normalizedFields.some((field) =>
        fieldMatchesToken(field, token, queryLength),
      ),
    )
  ) {
    return null;
  }

  let bestMatch = null;

  for (const field of normalizedFields) {
    const rank = getFieldRank(field, normalizedQuery, queryLength);

    if (rank == null) {
      continue;
    }

    if (
      !bestMatch ||
      rank < bestMatch.rank ||
      (rank === bestMatch.rank && field.length < bestMatch.matchedText.length)
    ) {
      bestMatch = {
        rank,
        matchedText: field,
      };
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  if (queryTokens.length > 1) {
    const tokenRanks = queryTokens.map((token) =>
      getBestTokenRank(normalizedFields, token, queryLength),
    );

    if (tokenRanks.every((rank) => rank != null)) {
      return {
        rank: Math.max(...tokenRanks),
        matchedText: normalizedFields.join(" "),
      };
    }
  }

  return null;
}

export function filterAndRankSearchResults(items, query, getFields) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return items;
  }

  return items
    .map((item, index) => ({
      item,
      index,
      match: rankSearchMatch(query, getFields(item)),
    }))
    .filter((result) => result.match !== null)
    .sort((left, right) => {
      if (left.match.rank !== right.match.rank) {
        return left.match.rank - right.match.rank;
      }

      if (left.match.matchedText.length !== right.match.matchedText.length) {
        return left.match.matchedText.length - right.match.matchedText.length;
      }

      return left.index - right.index;
    })
    .map((result) => result.item);
}

function getFieldRank(field, normalizedQuery, queryLength) {
  if (field === normalizedQuery) {
    return EXACT_MATCH_RANK;
  }

  if (field.startsWith(normalizedQuery)) {
    return STARTS_WITH_MATCH_RANK;
  }

  if (queryLength >= 2 && hasWordStartingWith(field, normalizedQuery)) {
    return WORD_START_MATCH_RANK;
  }

  if (queryLength >= 3 && field.includes(normalizedQuery)) {
    return CONTAINS_MATCH_RANK;
  }

  return null;
}

function fieldMatchesToken(field, token, queryLength) {
  if (field === token || field.startsWith(token)) {
    return true;
  }

  if (queryLength >= 2 && hasWordStartingWith(field, token)) {
    return true;
  }

  return queryLength >= 3 && field.includes(token);
}

function getBestTokenRank(fields, token, queryLength) {
  const ranks = fields
    .map((field) => getFieldRank(field, token, queryLength))
    .filter((rank) => rank != null);

  return ranks.length > 0 ? Math.min(...ranks) : null;
}

function getSearchQueryLength(normalizedQuery) {
  return normalizedQuery.replace(/\s+/g, "").length;
}

function hasWordStartingWith(field, token) {
  return field.split(" ").some((word) => word.startsWith(token));
}
