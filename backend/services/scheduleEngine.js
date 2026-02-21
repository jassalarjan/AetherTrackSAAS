/**
 * Schedule Engine
 *
 * Server-side scheduling pipeline. This is authoritative for all date computation.
 * The browser ONLY renders pre-computed positions; it never re-runs this logic.
 *
 * Pipeline stages:
 *   1. validate       — structural + invariant checks, abort on hard errors
 *   2. normalize      — parse raw dates, assign canonical IDs
 *   3. topologicalSort — Kahn's algorithm; detects cycles
 *   4. forwardPass    — earliest start/end (ASAP scheduling)
 *   5. backwardPass   — latest start/end (for float + critical path)
 *   6. criticalPath   — total float, free float, is_critical flag
 *   7. aggregate      — parent task dates from children (post-order)
 *   8. renderModel    — pixel positions, today marker
 *
 * INVARIANTS (enforced here, never in the UI):
 *   INV-01  task.end >= task.start
 *   INV-02  FS: successor.start >= predecessor.end + lag
 *   INV-03  SS: successor.start >= predecessor.start + lag
 *   INV-04  FF: successor.end   >= predecessor.end   + lag
 *   INV-05  SF: successor.end   >= predecessor.start + lag
 *   INV-06  milestone.end === milestone.start
 *   INV-10  No cycles in dependency graph
 *   INV-15  All date math happens here, never in JSX
 */

import {
  startOfDayUTC,
  endOfDayUTC,
  addWorkingDays,
  subtractWorkingDays,
  taskDurationDays,
  isWorkingDay,
  forwardToWorkingDay,
  workingDaysBetween
} from '../utils/calendarEngine.js';

const MS_PER_DAY = 86_400_000;

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1 — VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export function validateTasks(rawTasks) {
  const errors   = [];
  const warnings = [];
  const taskMap  = new Map(rawTasks.map(t => [String(t._id ?? t.id), t]));

  rawTasks.forEach(task => {
    const id = String(task._id ?? task.id);

    // INV-01: start <= end (only if both exist)
    if (task.start_date && task.due_date) {
      const s = new Date(task.start_date);
      const e = new Date(task.due_date);
      if (!isNaN(s) && !isNaN(e) && s > e) {
        errors.push({ taskId: id, rule: 'INV-01', message: `"${task.title}" start_date > due_date` });
      }
    }

    // Invalid date formats
    if (task.start_date && isNaN(new Date(task.start_date).getTime())) {
      errors.push({ taskId: id, rule: 'INVALID_DATE', message: `"${task.title}" has invalid start_date` });
    }
    if (task.due_date && isNaN(new Date(task.due_date).getTime())) {
      errors.push({ taskId: id, rule: 'INVALID_DATE', message: `"${task.title}" has invalid due_date` });
    }

    // Referential integrity — parent
    if (task.parent_id && !taskMap.has(String(task.parent_id))) {
      warnings.push({ taskId: id, rule: 'MISSING_PARENT', message: `"${task.title}" parent not in set` });
    }

    // Referential integrity — dependencies
    (task.dependencies ?? []).forEach(dep => {
      const predId = String(dep.predecessor_id ?? dep);
      if (!taskMap.has(predId)) {
        warnings.push({ taskId: id, rule: 'MISSING_DEP', message: `"${task.title}" dep predecessor not in set` });
      }
    });

    // INV-06: milestone must have zero duration
    if (task.task_type === 'milestone' && task.start_date && task.due_date) {
      const s = startOfDayUTC(task.start_date).getTime();
      const e = startOfDayUTC(task.due_date).getTime();
      if (s !== e) {
        warnings.push({ taskId: id, rule: 'INV-06', message: `milestone "${task.title}" has non-zero duration` });
      }
    }
  });

  return { errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2 — NORMALIZE
// ─────────────────────────────────────────────────────────────────────────────

function normalizeTasks(rawTasks, calendar) {
  return rawTasks
    .filter(t => t.status !== 'archived' && t.status !== 'cancelled')
    .map(task => {
      const id = String(task._id ?? task.id);

      let start = task.start_date ? startOfDayUTC(task.start_date) : null;
      let end   = task.due_date   ? startOfDayUTC(task.due_date)   :
                  task.end_date   ? startOfDayUTC(task.end_date)   : null;

      // Milestone: force end == start
      if (task.task_type === 'milestone' && start) end = start;

      // Single date fallbacks → 1-day task
      if (start && !end) end = start;
      if (!start && end) start = end;

      const duration = (start && end)
        ? taskDurationDays(start, end, calendar)
        : null;

      return {
        ...task,
        id,
        start_date: start,
        end_date:   end,
        duration,
        scheduling_mode: task.scheduling_mode ?? 'manual',
        constraint_type: task.constraint_type ?? 'ASAP',
        task_type:       task.task_type ?? 'task',
        dependencies:    (task.dependencies ?? []).map(d => ({
          predecessor_id: String(d.predecessor_id ?? d),
          type:    d.type    ?? 'FS',
          lag_days: d.lag_days ?? 0
        }))
      };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 3 — TOPOLOGICAL SORT (Kahn's algorithm)
// ─────────────────────────────────────────────────────────────────────────────

function topologicalSort(tasks) {
  const taskMap   = new Map(tasks.map(t => [t.id, t]));
  const inDegree  = new Map(tasks.map(t => [t.id, 0]));
  const successors = new Map(tasks.map(t => [t.id, []]));

  tasks.forEach(task => {
    task.dependencies.forEach(dep => {
      const predId = dep.predecessor_id;
      if (taskMap.has(predId)) {
        successors.get(predId).push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
      }
    });
  });

  const queue  = tasks.filter(t => inDegree.get(t.id) === 0).map(t => t.id);
  const sorted = [];

  while (queue.length > 0) {
    const id = queue.shift();
    sorted.push(id);
    (successors.get(id) ?? []).forEach(succId => {
      const deg = (inDegree.get(succId) ?? 1) - 1;
      inDegree.set(succId, deg);
      if (deg === 0) queue.push(succId);
    });
  }

  if (sorted.length < tasks.length) {
    const cycleIds = tasks.filter(t => !sorted.includes(t.id)).map(t => t.id);
    const error = new Error('CIRCULAR_DEPENDENCY_DETECTED');
    error.cycleIds = cycleIds;
    throw error;
  }

  return { sortedIds: sorted, successors };
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 4 — FORWARD PASS (earliest start / end)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute earliest start for a single task given resolved predecessor dates.
 * Returns a Date (start-of-day UTC).
 */
function computeEarliestStart(task, taskMap, calendar, projectStart) {
  const candidates = [projectStart ?? new Date(0)];

  task.dependencies.forEach(dep => {
    const pred = taskMap.get(dep.predecessor_id);
    if (!pred) return;
    const lag = dep.lag_days ?? 0;

    switch (dep.type) {
      case 'FS':
        // successor.start >= predecessor.end + lag
        if (pred.early_end)
          candidates.push(addWorkingDays(pred.early_end, lag, calendar));
        break;
      case 'SS':
        // successor.start >= predecessor.start + lag
        if (pred.early_start)
          candidates.push(addWorkingDays(pred.early_start, lag, calendar));
        break;
      case 'FF': {
        // successor.end >= predecessor.end + lag  →  successor.start >= that - duration
        if (pred.early_end && task.duration) {
          const requiredEnd = addWorkingDays(pred.early_end, lag, calendar);
          candidates.push(subtractWorkingDays(requiredEnd, task.duration - 1, calendar));
        }
        break;
      }
      case 'SF': {
        // successor.end >= predecessor.start + lag  →  successor.start >= that - duration
        if (pred.early_start && task.duration) {
          const requiredEnd = addWorkingDays(pred.early_start, lag, calendar);
          candidates.push(subtractWorkingDays(requiredEnd, task.duration - 1, calendar));
        }
        break;
      }
    }
  });

  let earliest = new Date(Math.max(...candidates.map(d => d.getTime())));
  earliest = forwardToWorkingDay(earliest, calendar);

  // Apply hard constraint
  switch (task.constraint_type) {
    case 'SNET': // Start No Earlier Than
      if (task.constraint_date)
        earliest = new Date(Math.max(earliest.getTime(), startOfDayUTC(task.constraint_date).getTime()));
      break;
    case 'MSO':  // Must Start On
      if (task.constraint_date)
        earliest = startOfDayUTC(task.constraint_date);
      break;
    case 'MFO':  // Must Finish On
      if (task.constraint_date && task.duration)
        earliest = subtractWorkingDays(startOfDayUTC(task.constraint_date), task.duration - 1, calendar);
      break;
    case 'FNLT': // Finish No Later Than — soft warning, does not change start here
    default:
      break;
  }

  return earliest;
}

function forwardPass(tasks, sortedIds, calendar, projectStart) {
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  sortedIds.forEach(id => {
    const task = taskMap.get(id);
    if (!task) return;

    if (task.scheduling_mode === 'locked' || task.scheduling_mode === 'manual') {
      // Use stored dates as-is
      task.early_start = task.start_date ?? task.end_date ?? projectStart;
      task.early_end   = task.end_date   ?? task.start_date ?? projectStart;
    } else {
      // Auto scheduling
      task.early_start = computeEarliestStart(task, taskMap, calendar, projectStart);
      const dur = task.duration ?? 1;
      task.early_end = task.task_type === 'milestone'
        ? task.early_start
        : addWorkingDays(task.early_start, dur - 1, calendar);
    }
  });

  return taskMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 5 — BACKWARD PASS (latest dates for critical path)
// ─────────────────────────────────────────────────────────────────────────────

function backwardPass(tasks, sortedIds, successors, taskMap, calendar, projectDeadline) {
  const deadline = projectDeadline
    ?? new Date(Math.max(...Array.from(taskMap.values()).map(t => (t.early_end ?? new Date(0)).getTime())));

  // Process in reverse topological order
  const reversed = [...sortedIds].reverse();

  reversed.forEach(id => {
    const task = taskMap.get(id);
    if (!task) return;

    const succs = (successors.get(id) ?? [])
      .map(sid => taskMap.get(sid))
      .filter(Boolean);

    if (succs.length === 0) {
      // No successors — late end is project deadline
      task.late_end   = deadline;
      task.late_start = task.task_type === 'milestone'
        ? deadline
        : subtractWorkingDays(deadline, (task.duration ?? 1) - 1, calendar);
    } else {
      // Compute latest end from all successors
      const lateCandidates = [];

      succs.forEach(succ => {
        succ.dependencies.filter(d => d.predecessor_id === id).forEach(dep => {
          const lag = dep.lag_days ?? 0;
          switch (dep.type) {
            case 'FS':
              if (succ.late_start) lateCandidates.push(subtractWorkingDays(succ.late_start, lag + 1, calendar));
              break;
            case 'SS':
              if (succ.late_start) {
                const lateEndFromSS = addWorkingDays(subtractWorkingDays(succ.late_start, lag, calendar), (task.duration ?? 1) - 1, calendar);
                lateCandidates.push(lateEndFromSS);
              }
              break;
            case 'FF':
              if (succ.late_end) lateCandidates.push(subtractWorkingDays(succ.late_end, lag, calendar));
              break;
            case 'SF':
              if (succ.late_end) {
                const lateEndFromSF = addWorkingDays(subtractWorkingDays(succ.late_end, lag, calendar), (task.duration ?? 1) - 1, calendar);
                lateCandidates.push(lateEndFromSF);
              }
              break;
          }
        });
      });

      task.late_end   = lateCandidates.length
        ? new Date(Math.min(...lateCandidates.map(d => d.getTime())))
        : deadline;
      task.late_start = task.task_type === 'milestone'
        ? task.late_end
        : subtractWorkingDays(task.late_end, (task.duration ?? 1) - 1, calendar);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 6 — CRITICAL PATH
// ─────────────────────────────────────────────────────────────────────────────

function computeCriticalPath(taskMap, sortedIds, calendar) {
  sortedIds.forEach(id => {
    const task = taskMap.get(id);
    if (!task || !task.early_start || !task.late_start) return;

    task.total_float = workingDaysBetween(task.early_start, task.late_start, calendar);
    task.is_critical = task.total_float === 0;

    // FNLT constraint violation
    if (task.constraint_type === 'FNLT' && task.constraint_date && task.early_end) {
      const fnlt = startOfDayUTC(task.constraint_date);
      if (task.early_end > fnlt) {
        task.constraint_violated = true;
        task.constraint_violation_days = workingDaysBetween(fnlt, task.early_end, calendar);
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 7 — PARENT AGGREGATION (post-order tree traversal)
// ─────────────────────────────────────────────────────────────────────────────

function buildChildrenMap(tasks) {
  const map = new Map(tasks.map(t => [t.id, []]));
  tasks.forEach(task => {
    const parentId = task.parent_id ? String(task.parent_id) : null;
    if (parentId && map.has(parentId)) {
      map.get(parentId).push(task.id);
    }
  });
  return map;
}

function aggregateParents(tasks, taskMap) {
  const childrenMap = buildChildrenMap(tasks);
  const roots = tasks.filter(t => !t.parent_id || !taskMap.has(String(t.parent_id)));

  function traverse(id) {
    const task    = taskMap.get(id);
    const children = childrenMap.get(id) ?? [];

    children.forEach(traverse); // Children first

    if (children.length > 0) {
      const childTasks = children.map(cid => taskMap.get(cid)).filter(Boolean);
      const starts = childTasks.map(c => c.early_start ?? c.start_date).filter(Boolean);
      const ends   = childTasks.map(c => c.early_end   ?? c.end_date).filter(Boolean);

      if (starts.length) task.early_start = new Date(Math.min(...starts.map(d => d.getTime())));
      if (ends.length)   task.early_end   = new Date(Math.max(...ends.map(d => d.getTime())));

      task.is_parent = true;
      task.is_critical = childTasks.some(c => c.is_critical);
    }
  }

  roots.forEach(r => traverse(r.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 8 — RENDER MODEL
// ─────────────────────────────────────────────────────────────────────────────

function buildRenderModel(tasks, pixelsPerDay) {
  // Determine range from all scheduled tasks
  const allStarts = tasks.map(t => t.early_start ?? t.start_date).filter(Boolean);
  const allEnds   = tasks.map(t => t.early_end   ?? t.end_date).filter(Boolean);

  if (!allStarts.length || !allEnds.length) {
    return { scheduledTasks: [], unscheduledTasks: tasks, timelineRange: null, todayMarker: null, pixelsPerDay };
  }

  const today = startOfDayUTC(new Date());
  const rawStart = new Date(Math.min(...allStarts.map(d => d.getTime())));
  const rawEnd   = new Date(Math.max(...allEnds.map(d => d.getTime())));

  // Add padding: 7 days before, 14 days after
  const rangeStart = new Date(rawStart.getTime() - 7 * MS_PER_DAY);
  const rangeEnd   = new Date(rawEnd.getTime()   + 14 * MS_PER_DAY);

  function toPixel(date) {
    return Math.max(0, Math.floor((date.getTime() - rangeStart.getTime()) / MS_PER_DAY) * pixelsPerDay);
  }

  const scheduled   = [];
  const unscheduled = [];

  tasks.forEach(task => {
    const start = task.early_start ?? task.start_date;
    const end   = task.early_end   ?? task.end_date;

    if (!start || !end) {
      unscheduled.push(task);
      return;
    }

    const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
    const barWidth     = Math.max(task.task_type === 'milestone' ? 12 : pixelsPerDay, durationDays * pixelsPerDay);

    // Slack bar width (float extension)
    const slackWidth = task.total_float != null
      ? task.total_float * pixelsPerDay
      : 0;

    // Baseline delta (if baseline_start / baseline_end are present)
    let baselineDelta = null;
    if (task.baseline_start && task.baseline_end) {
      const bStart = new Date(task.baseline_start);
      const bEnd   = new Date(task.baseline_end);
      baselineDelta = {
        start_days: Math.round((start.getTime() - bStart.getTime()) / MS_PER_DAY),
        end_days:   Math.round((end.getTime()   - bEnd.getTime())   / MS_PER_DAY),
        position_x: toPixel(bStart),
        bar_width:  Math.max(1, Math.ceil((bEnd.getTime() - bStart.getTime()) / MS_PER_DAY) + 1) * pixelsPerDay
      };
    }

    const isOverdue = end < today && task.status !== 'done' && task.status !== 'archived';
    const isAtRisk  = !isOverdue && task.total_float != null && task.duration > 0
      && task.total_float / task.duration < 0.2;

    scheduled.push({
      ...task,
      effective_start: start,
      effective_end:   end,
      duration_days:   durationDays,
      position_x:      toPixel(start),
      bar_width:        barWidth,
      slack_width:      slackWidth,
      is_overdue:       isOverdue,
      is_at_risk:       isAtRisk,
      baseline_delta:   baselineDelta,
      has_late_start:   task.actual_start ? new Date(task.actual_start) > start : false
    });
  });

  const todayPosition = toPixel(today);
  const isTodayVisible = today >= rangeStart && today <= rangeEnd;

  return {
    scheduledTasks: scheduled,
    unscheduledTasks: unscheduled,
    timelineRange: { startDate: rangeStart, endDate: rangeEnd },
    todayMarker: { position: todayPosition, visible: isTodayVisible, date: today },
    pixelsPerDay
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API — runScheduler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full scheduling pipeline.
 *
 * @param {Array}  rawTasks        - Tasks from DB (Mongoose docs or plain objects)
 * @param {Object} options
 * @param {Object} options.calendar       - { workingDays, holidays }
 * @param {Date}   options.projectStart   - Project start constraint (floor)
 * @param {Date}   options.projectDeadline- Project deadline for backward pass
 * @param {number} options.pixelsPerDay   - Render zoom level (default 8)
 * @param {boolean} options.throwOnError  - If true, throw on hard validation errors
 *
 * @returns {Object} ScheduleResult
 */
export default function runScheduler(rawTasks, options = {}) {
  const {
    calendar       = {},
    projectStart   = startOfDayUTC(new Date()),
    projectDeadline = null,
    pixelsPerDay   = 8,
    throwOnError   = false
  } = options;

  const startTime = Date.now();

  // Stage 1: Validate
  const { errors, warnings } = validateTasks(rawTasks);
  if (throwOnError && errors.length > 0) {
    const err = new Error('SCHEDULE_VALIDATION_FAILED');
    err.validationErrors = errors;
    throw err;
  }

  // Stage 2: Normalize
  const tasks = normalizeTasks(rawTasks, calendar);
  if (tasks.length === 0) {
    return {
      scheduledTasks: [], unscheduledTasks: [],
      timelineRange: null, todayMarker: null, pixelsPerDay,
      metadata: { totalTasks: rawTasks.length, scheduledCount: 0, unscheduledCount: rawTasks.length,
                  validationErrors: errors, warnings, hasErrors: errors.length > 0,
                  computedMs: Date.now() - startTime }
    };
  }

  // Stage 3: Topological sort (catches circular deps)
  let sortedIds, successors;
  try {
    ({ sortedIds, successors } = topologicalSort(tasks));
  } catch (e) {
    if (e.message === 'CIRCULAR_DEPENDENCY_DETECTED') {
      errors.push({ rule: 'INV-10', message: 'Circular dependency detected', cycleIds: e.cycleIds });
      if (throwOnError) throw e;
      // Fall back: schedule without dependencies
      const taskMap = new Map(tasks.map(t => [t.id, t]));
      const result  = buildRenderModel(tasks, pixelsPerDay);
      return {
        ...result,
        metadata: { totalTasks: rawTasks.length, scheduledCount: result.scheduledTasks.length,
                    unscheduledCount: result.unscheduledTasks.length,
                    validationErrors: errors, warnings, hasErrors: true,
                    computedMs: Date.now() - startTime }
      };
    }
    throw e;
  }

  // Stage 4: Forward pass
  const taskMap = forwardPass(tasks, sortedIds, calendar, projectStart);

  // Stage 5: Backward pass
  backwardPass(tasks, sortedIds, successors, taskMap, calendar, projectDeadline);

  // Stage 6: Critical path
  computeCriticalPath(taskMap, sortedIds, calendar);

  // Stage 7: Parent aggregation
  aggregateParents(tasks, taskMap);

  // Stage 8: Render model
  const result = buildRenderModel(Array.from(taskMap.values()), pixelsPerDay);

  return {
    ...result,
    metadata: {
      totalTasks:       rawTasks.length,
      scheduledCount:   result.scheduledTasks.length,
      unscheduledCount: result.unscheduledTasks.length,
      criticalPathCount: result.scheduledTasks.filter(t => t.is_critical).length,
      validationErrors: errors,
      warnings,
      hasErrors:        errors.length > 0,
      computedMs:       Date.now() - startTime
    }
  };
}
