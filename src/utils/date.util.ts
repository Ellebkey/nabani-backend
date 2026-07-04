/**
 * Builds a Date at the first day of a YYYY-MM month using local-time
 * construction. Parsing the string directly (new Date('YYYY-MM-01')) is
 * interpreted as UTC midnight, which shifts the month back by one on
 * servers running in UTC-negative timezones (e.g. America/Mexico_City).
 */
function monthToLocalDate(periodMonth: string): Date {
  const [year, month] = periodMonth.split('-').map(Number);
  if (year === undefined || month === undefined || Number.isNaN(year) || Number.isNaN(month)) {
    throw new Error(`Invalid period month: ${periodMonth}`);
  }
  return new Date(year, month - 1, 1);
}

export { monthToLocalDate };
