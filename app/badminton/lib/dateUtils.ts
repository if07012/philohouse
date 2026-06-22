const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Calendar date (YYYY-MM-DD) in Jakarta timezone from ISO datetime string.
 */
export function getCalendarDateInJakarta(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return dateStr.slice(0, 10);
  }
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
  const jakarta = new Date(utcMs + JAKARTA_OFFSET_MS);
  const year = jakarta.getUTCFullYear();
  const month = String(jakarta.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jakarta.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
