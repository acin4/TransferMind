export const ALL_COUNTRIES_TAB = "ALL";

export const COUNTRY_FILTER_TABS = [
  ALL_COUNTRIES_TAB,
  "ENGLAND",
  "GERMANY",
  "GREECE",
  "ITALY",
  "SPAIN",
] as const;

export type CountryFilterTab = (typeof COUNTRY_FILTER_TABS)[number];

export function filterItemsByCountry<T extends { country?: string | null }>(
  items: readonly T[],
  selectedCountryFilter: CountryFilterTab,
) {
  if (selectedCountryFilter === ALL_COUNTRIES_TAB) {
    return [...items];
  }

  const selectedCountry = normalizeCountryValue(selectedCountryFilter);

  return items.filter(
    (item) => normalizeCountryValue(item.country) === selectedCountry,
  );
}

export function normalizeCountryValue(value: string | null | undefined) {
  const country = value?.trim();
  return country ? country.toLocaleLowerCase() : null;
}
