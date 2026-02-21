/**
 * Calendar Engine
 * Authoritative module for all working-day arithmetic.
 * This is the ONLY place date math happens. Nothing else does calendar math.
 *
 * Working day = not a weekend AND not a holiday exception
 * All dates treated as UTC.
 */

const MS_PER_DAY = 86_400_000;

/**
 * Default 5-day work week (Mon=1 … Fri=5; Sun=0, Sat=6)
 */
const DEFAULT_WORKING_DAYS = new Set([1, 2, 3, 4, 5]);

/**
 * Normalize a date to midnight UTC of that calendar day.
 * NEVER use new Date(stringWithoutTime) — it behaves differently across engines.
 */
export function startOfDayUTC(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Normalize a date to 23:59:59.999 UTC of that calendar day.
 */
export function endOfDayUTC(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

/**
 * Check whether a given Date falls on a working day.
 * @param {Date} date
 * @param {Object} calendar  - { workingDays?: Set<number>, holidays?: Set<string> }
 */
export function isWorkingDay(date, calendar = {}) {
  const wd = calendar.workingDays ?? DEFAULT_WORKING_DAYS;
  const holidays = calendar.holidays ?? new Set();
  const dayOfWeek = date.getUTCDay();
  const isoDate = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
  return wd.has(dayOfWeek) && !holidays.has(isoDate);
}

/**
 * Advance date by exactly 1 calendar day.
 */
export function nextCalendarDay(date) {
  return new Date(startOfDayUTC(date).getTime() + MS_PER_DAY);
}

/**
 * Step back exactly 1 calendar day.
 */
export function prevCalendarDay(date) {
  return new Date(startOfDayUTC(date).getTime() - MS_PER_DAY);
}

/**
 * Move forward to the nearest working day (inclusive of the given date).
 */
export function forwardToWorkingDay(date, calendar = {}) {
  let d = startOfDayUTC(date);
  while (!isWorkingDay(d, calendar)) {
    d = nextCalendarDay(d);
  }
  return d;
}

/**
 * Add N working days to a date.
 * @param {Date}   date
 * @param {number} days  Can be 0 (snap to nearest working day).
 * @param {Object} calendar
 * @returns {Date} Start-of-day UTC
 */
export function addWorkingDays(date, days, calendar = {}) {
  if (days < 0) return subtractWorkingDays(date, -days, calendar);
  let current = forwardToWorkingDay(startOfDayUTC(date), calendar);
  let added = 0;
  while (added < days) {
    current = nextCalendarDay(current);
    if (isWorkingDay(current, calendar)) added++;
  }
  return current;
}

/**
 * Subtract N working days from a date.
 */
export function subtractWorkingDays(date, days, calendar = {}) {
  if (days < 0) return addWorkingDays(date, -days, calendar);
  let current = startOfDayUTC(date);
  // Snap backward if current day is not working
  while (!isWorkingDay(current, calendar)) {
    current = prevCalendarDay(current);
  }
  let subtracted = 0;
  while (subtracted < days) {
    current = prevCalendarDay(current);
    if (isWorkingDay(current, calendar)) subtracted++;
  }
  return current;
}

/**
 * Count working days between two dates (exclusive of start, inclusive of end).
 * Equivalent to "how many days does this task occupy?"
 *
 * For a task that starts on Monday and ends on Friday: workingDaysBetween(Mon, Fri) = 4 (Tue–Fri).
 * To get "duration including start day" callers use: workingDaysBetween(start, end) + 1.
 */
export function workingDaysBetween(start, end, calendar = {}) {
  let s = startOfDayUTC(start);
  let e = startOfDayUTC(end);
  if (s >= e) return 0;
  let count = 0;
  let current = nextCalendarDay(s);
  while (current <= e) {
    if (isWorkingDay(current, calendar)) count++;
    current = nextCalendarDay(current);
  }
  return count;
}

/**
 * Duration of a task in working days (inclusive of both endpoints).
 * A task planned Mon → Mon = 1 working day.
 * A task planned Mon → Fri = 5 working days.
 */
export function taskDurationDays(start, end, calendar = {}) {
  const s = startOfDayUTC(start);
  const e = startOfDayUTC(end);
  if (s.getTime() === e.getTime()) return 1;
  return workingDaysBetween(s, e, calendar) + 1;
}

/**
 * Given a task's start_date and duration in working days, compute the end_date.
 */
export function computeEndDate(start, durationDays, calendar = {}) {
  if (durationDays <= 1) return forwardToWorkingDay(startOfDayUTC(start), calendar);
  return addWorkingDays(start, durationDays - 1, calendar);
}
