/**
 * Frontend Calendar Engine
 *
 * Browser-side mirror of backend/utils/calendarEngine.js
 * THIS IS THE ONLY PLACE that computes working-day arithmetic in the browser.
 * View components MUST NOT import date math from anywhere else.
 *
 * INVARIANT: All dates in/out are Date objects at midnight UTC.
 *
 * @module calendarEngine
 */

const MS_PER_DAY = 86_400_000;

// ─────────────────────────────────────────────────────────────────────────────
// DATE NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize any date-like value to midnight UTC (start of day).
 * Accepts Date, ISO string, or timestamp number.
 */
export function startOfDayUTC(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Return 23:59:59.999 UTC of the given day. */
export function endOfDayUTC(date) {
  const d = startOfDayUTC(date);
  if (!d) return null;
  return new Date(d.getTime() + MS_PER_DAY - 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT CALENDAR
// ─────────────────────────────────────────────────────────────────────────────

/** Default calendar: Mon-Fri, no holidays */
export const DEFAULT_CALENDAR = {
  workingDays: new Set([1, 2, 3, 4, 5]), // 0=Sun … 6=Sat
  holidays:    new Set()                  // Set of 'YYYY-MM-DD' strings
};

function getCalendar(calendar) {
  if (!calendar || Object.keys(calendar).length === 0) return DEFAULT_CALENDAR;
  return {
    workingDays: calendar.workingDays instanceof Set
      ? calendar.workingDays
      : new Set(calendar.workingDays ?? [1, 2, 3, 4, 5]),
    holidays: calendar.holidays instanceof Set
      ? calendar.holidays
      : new Set(calendar.holidays ?? [])
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE PREDICATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a UTC date is a working day.
 */
export function isWorkingDay(date, calendar) {
  const cal = getCalendar(calendar);
  const d = startOfDayUTC(date);
  if (!d) return false;

  const dow = d.getUTCDay(); // 0=Sun … 6=Sat
  if (!cal.workingDays.has(dow)) return false;

  const iso = d.toISOString().slice(0, 10);
  return !cal.holidays.has(iso);
}

/** Return true if date falls on a calendar weekend (non-working). */
export function isWeekend(date, calendar) {
  const cal = getCalendar(calendar);
  const d = startOfDayUTC(date);
  if (!d) return false;
  const dow = d.getUTCDay();
  return !cal.workingDays.has(dow);
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKING-DAY ARITHMETIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Advance `date` forward until it lands on a working day.
 * If already a working day, returns the same date.
 */
export function forwardToWorkingDay(date, calendar) {
  let d = startOfDayUTC(date);
  if (!d) return null;
  while (!isWorkingDay(d, calendar)) {
    d = new Date(d.getTime() + MS_PER_DAY);
  }
  return d;
}

/**
 * Move `date` backward until it lands on a working day.
 */
export function backwardToWorkingDay(date, calendar) {
  let d = startOfDayUTC(date);
  if (!d) return null;
  while (!isWorkingDay(d, calendar)) {
    d = new Date(d.getTime() - MS_PER_DAY);
  }
  return d;
}

/**
 * Add `n` working days to `date`.
 * Negative `n` subtracts calendar days.
 */
export function addWorkingDays(date, n, calendar) {
  let d = startOfDayUTC(date);
  if (!d) return null;
  if (n === 0) return forwardToWorkingDay(d, calendar);

  const step      = n > 0 ? MS_PER_DAY : -MS_PER_DAY;
  let remaining   = Math.abs(n);

  while (remaining > 0) {
    d = new Date(d.getTime() + step);
    if (isWorkingDay(d, calendar)) remaining--;
  }
  return d;
}

/** Subtract `n` working days from `date`. */
export function subtractWorkingDays(date, n, calendar) {
  return addWorkingDays(date, -n, calendar);
}

/**
 * Count working days strictly between `start` and `end` (exclusive start, inclusive end).
 * Returns 0 if start >= end.
 */
export function workingDaysBetween(start, end, calendar) {
  const s = startOfDayUTC(start);
  const e = startOfDayUTC(end);
  if (!s || !e || s >= e) return 0;

  let count = 0;
  let cur   = new Date(s.getTime() + MS_PER_DAY); // exclusive of start
  while (cur <= e) {
    if (isWorkingDay(cur, calendar)) count++;
    cur = new Date(cur.getTime() + MS_PER_DAY);
  }
  return count;
}

/**
 * Duration in working days inclusive of both start and end.
 * A 1-day task (start === end) returns 1.
 */
export function taskDurationDays(start, end, calendar) {
  const s = startOfDayUTC(start);
  const e = startOfDayUTC(end);
  if (!s || !e) return null;
  if (s.getTime() === e.getTime()) return 1;
  return workingDaysBetween(s, e, calendar) + 1; // +1 for inclusive start
}

/**
 * Given a task start and its working-day `duration`, return the end date.
 * Duration=1 means same day.
 */
export function computeEndDate(start, duration, calendar) {
  if (!start || !duration || duration < 1) return null;
  return addWorkingDays(startOfDayUTC(start), duration - 1, calendar);
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Format a date to 'YYYY-MM-DD' string (UTC). */
export function formatDateISO(date) {
  const d = startOfDayUTC(date);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Build a holiday Set from an array of date-like values.
 * @param {Array} dates
 * @returns {Set<string>}
 */
export function buildHolidaySet(dates) {
  return new Set((dates ?? []).map(d => formatDateISO(d)).filter(Boolean));
}

/**
 * Build a calendar object from raw config.
 * @param {Object} config  { workingDays?: number[], holidays?: (Date|string)[] }
 * @returns {{ workingDays: Set<number>, holidays: Set<string> }}
 */
export function buildCalendar(config = {}) {
  return {
    workingDays: new Set(config.workingDays ?? [1, 2, 3, 4, 5]),
    holidays:    buildHolidaySet(config.holidays ?? [])
  };
}
