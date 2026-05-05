/**
 * Time utilities for discipline tracker
 * All times are in Jakarta timezone (WIB - UTC+7)
 */

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

/**
 * Get current time in Jakarta timezone
 */
export function getCurrentTimeInJakarta(): Date {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + JAKARTA_OFFSET_MS);
}

/**
 * Get current date string in Jakarta timezone (YYYY-MM-DD)
 */
export function getCurrentDateInJakarta(): string {
  const jakartaTime = getCurrentTimeInJakarta();
  const year = jakartaTime.getUTCFullYear();
  const month = String(jakartaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jakartaTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date string to Indonesian locale
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('id-ID', options);
}

/**
 * Parse HH:mm time string to Date object
 */
export function parseTime(timeStr: string): Date | null {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Format Date to HH:mm string
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Compare two time strings (HH:mm format)
 * Returns: -1 if time1 < time2, 0 if equal, 1 if time1 > time2
 */
export function compareTimes(time1: string, time2: string): number {
  const d1 = parseTime(time1);
  const d2 = parseTime(time2);

  if (!d1 || !d2) return 0;

  const mins1 = d1.getHours() * 60 + d1.getMinutes();
  const mins2 = d2.getHours() * 60 + d2.getMinutes();

  return mins1 - mins2;
}

/**
 * Calculate delay in minutes between two time strings
 * If completedTime <= targetTime, returns 0
 */
export function calculateDelayMinutes(targetTime: string, completedTime: string): number {
  const d1 = parseTime(targetTime);
  const d2 = parseTime(completedTime);

  if (!d1 || !d2) return 0;

  const targetMinutes = d1.getHours() * 60 + d1.getMinutes();
  const completedMinutes = d2.getHours() * 60 + d2.getMinutes();

  const delay = completedMinutes - targetMinutes;
  return Math.max(0, delay);
}

/**
 * Add minutes to a time string
 * Returns HH:mm format
 */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  const date = parseTime(timeStr);
  if (!date) return timeStr;

  date.setMinutes(date.getMinutes() + minutes);
  return formatTime(date);
}

/**
 * Check if check-in is within valid time window
 * Valid: within 2 hours before target time and by 23:59 same day
 */
export function isValidCheckInTime(targetTime: string, completedTime: string): boolean {
  const targetDate = parseTime(targetTime);
  const completedDate = parseTime(completedTime);

  if (!targetDate || !completedDate) return false;

  // Convert to minutes from midnight
  const targetMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const completedMinutes = completedDate.getHours() * 60 + completedDate.getMinutes();

  // Must be within 2 hours before target time (120 minutes)
  const withinWindow = completedMinutes >= (targetMinutes - 120);

  // Must be before or at 23:59 (1439 minutes)
  const notTooLate = completedMinutes <= 1439;

  // Must not be before target time (can check in early)
  const notBeforeTarget = completedMinutes <= targetMinutes;

  // Allow check-in up to 2 hours after target time (for late check-ins)
  const notTooLateAfter = completedMinutes <= (targetMinutes + 120);

  return withinWindow && notTooLate;
}

/**
 * Determine check-in status based on delay
 * Tolerance: 5 minutes
 */
export function determineStatus(delayMinutes: number): 'on_time' | 'late' {
  return delayMinutes <= 5 ? 'on_time' : 'late';
}

/**
 * Check if time is within valid check-in window (not ignored)
 * Check-in is ignored if:
 * - Done too early (more than 2 hours before target)
 * - Done more than 2 hours after target time
 */
export function isValidTimeWindow(targetTime: string, completedTime: string): boolean {
  const targetDate = parseTime(targetTime);
  const completedDate = parseTime(completedTime);

  if (!targetDate || !completedDate) return false;

  const targetMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const completedMinutes = completedDate.getHours() * 60 + completedDate.getMinutes();

  // Valid: within 2 hours before AND up to 2 hours after target time
  const windowStart = targetMinutes - 120; // 2 hours before
  const windowEnd = targetMinutes + 120;   // 2 hours after

  return completedMinutes >= windowStart && completedMinutes <= windowEnd;
}

/**
 * Format delay minutes to readable string
 */
export function formatDelayString(delayMinutes: number): string {
  if (delayMinutes <= 0) return 'Tepat Waktu';
  if (delayMinutes < 60) return `${delayMinutes} menit`;

  const hours = Math.floor(delayMinutes / 60);
  const minutes = delayMinutes % 60;

  if (minutes === 0) return `${hours} jam`;
  return `${hours} jam ${minutes} menit`;
}
