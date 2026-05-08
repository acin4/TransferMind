const BIRTH_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatBirthDate(value: string | null | undefined) {
  const date = parseDate(value);

  if (!date) {
    return "Unknown";
  }

  return BIRTH_DATE_FORMATTER.format(date);
}

export function formatAgeFromBirthDate(value: string | null | undefined) {
  const date = parseDate(value);

  if (!date) {
    return "Unknown";
  }

  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const birthMonth = date.getUTCMonth();
  const hasBirthdayPassed =
    currentMonth > birthMonth ||
    (currentMonth === birthMonth && now.getUTCDate() >= date.getUTCDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return String(age);
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
