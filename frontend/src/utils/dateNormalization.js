/**
 * Date Normalization Utilities for Gantt Timeline
 * 
 * CRITICAL RULES:
 * - All dates stored in DB as ISO 8601 UTC timestamps
 * - View layer NEVER calculates dates, only translates dates → pixels
 * - Duration is ALWAYS computed, NEVER stored
 * - Dates are normalized to start/end of day boundaries
 * 
 * @module dateNormalization
 */

/**
 * Normalize a date string to start of day in UTC
 * @param {string|Date} dateInput - ISO string or Date object
 * @returns {Date} Date object at start of day (00:00:00.000 UTC)
 */
export function normalizeToStartOfDay(dateInput) {
  if (!dateInput) return null;
  
  const date = new Date(dateInput);
  
  // Check for invalid date
  if (isNaN(date.getTime())) {
    console.error('Invalid date input:', dateInput);
    return null;
  }
  
  // Set to start of day in UTC
  const normalized = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
  
  return normalized;
}

/**
 * Normalize a date string to end of day in UTC
 * @param {string|Date} dateInput - ISO string or Date object
 * @returns {Date} Date object at end of day (23:59:59.999 UTC)
 */
export function normalizeToEndOfDay(dateInput) {
  if (!dateInput) return null;
  
  const date = new Date(dateInput);
  
  // Check for invalid date
  if (isNaN(date.getTime())) {
    console.error('Invalid date input:', dateInput);
    return null;
  }
  
  // Set to end of day in UTC
  const normalized = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    23, 59, 59, 999
  ));
  
  return normalized;
}

/**
 * Calculate duration in days between two dates (inclusive)
 * End date is INCLUSIVE: 2/19 → 2/25 = 7 days, not 6
 * 
 * @param {Date} startDate - Normalized start date
 * @param {Date} endDate - Normalized end date
 * @returns {number} Duration in days (minimum 1)
 */
export function calculateDurationDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diffMs = endDate - startDate;
  const diffDays = Math.ceil(diffMs / MS_PER_DAY);
  
  // Minimum 1 day duration (inclusive end date)
  return Math.max(1, diffDays);
}

/**
 * Check if a task has valid dates for timeline rendering
 * @param {Object} task - Task object with start_date and end_date
 * @returns {boolean} True if task has both dates and they're valid
 */
export function hasValidDates(task) {
  if (!task || !task.start_date || !task.end_date) {
    return false;
  }
  
  const start = new Date(task.start_date);
  const end = new Date(task.end_date);
  
  // Check for invalid dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }
  
  // Start must be <= end
  return start <= end;
}

/**
 * Calculate today marker position (for "current day" line)
 * @returns {Date} Current date normalized to start of day
 */
export function getTodayNormalized() {
  return normalizeToStartOfDay(new Date());
}

/**
 * Check if a date is today
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  if (!date) return false;
  const today = getTodayNormalized();
  const normalized = normalizeToStartOfDay(date);
  return normalized.getTime() === today.getTime();
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * @param {Date} date - Date to check
 * @returns {boolean} True if weekend
 */
export function isWeekend(date) {
  if (!date) return false;
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Format date for display (localized)
 * @param {Date} date - Date to format
 * @param {string} format - Format type: 'short', 'long', 'iso'
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'short') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    case 'iso':
      return d.toISOString().split('T')[0];
    default:
      return d.toLocaleDateString();
  }
}

/**
 * Calculate timeline range with padding
 * @param {Array} tasks - Array of tasks with dates
 * @param {number} paddingDaysBefore - Days to add before earliest date
 * @param {number} paddingDaysAfter - Days to add after latest date
 * @returns {Object} { startDate, endDate } normalized range
 */
export function calculateTimelineRange(tasks, paddingDaysBefore = 7, paddingDaysAfter = 14) {
  // Extract all valid dates from tasks
  const dates = tasks
    .filter(hasValidDates)
    .flatMap(t => [t.start_date, t.end_date])
    .filter(Boolean)
    .map(d => new Date(d));
  
  // Default to current month + 3 months if no tasks
  if (dates.length === 0) {
    const today = new Date();
    const startDate = new Date(today.getUTCFullYear(), today.getUTCMonth(), 1);
    const endDate = new Date(today.getUTCFullYear(), today.getUTCMonth() + 3, 0);
    return {
      startDate: normalizeToStartOfDay(startDate),
      endDate: normalizeToEndOfDay(endDate)
    };
  }
  
  // Find min and max dates
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  
  // Add padding
  const startDate = new Date(minDate);
  startDate.setDate(startDate.getDate() - paddingDaysBefore);
  
  const endDate = new Date(maxDate);
  endDate.setDate(endDate.getDate() + paddingDaysAfter);
  
  return {
    startDate: normalizeToStartOfDay(startDate),
    endDate: normalizeToEndOfDay(endDate)
  };
}

/**
 * Calculate pixel offset from timeline start
 * @param {Date} date - Date to calculate position for
 * @param {Date} rangeStart - Timeline start date
 * @param {number} pixelsPerDay - Zoom level (pixels per day)
 * @returns {number} Pixel offset from left edge
 */
export function calculatePixelOffset(date, rangeStart, pixelsPerDay) {
  if (!date || !rangeStart) return 0;
  
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor((date - rangeStart) / MS_PER_DAY);
  
  return Math.max(0, diffDays * pixelsPerDay);
}

/**
 * Calculate bar width in pixels
 * @param {Date} startDate - Task start date
 * @param {Date} endDate - Task end date
 * @param {number} pixelsPerDay - Zoom level (pixels per day)
 * @returns {number} Width in pixels
 */
export function calculateBarWidth(startDate, endDate, pixelsPerDay) {
  if (!startDate || !endDate) return 0;
  
  const durationDays = calculateDurationDays(startDate, endDate);
  return durationDays * pixelsPerDay;
}
