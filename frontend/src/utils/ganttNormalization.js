/**
 * Gantt Normalization Pipeline  (v2 — scheduling-engine integration)
 *
 * DUAL-MODE OPERATION:
 *   1. API-backed  — call `normalizeFromScheduleResult(apiResponse, opts)` after
 *                    fetching GET /api/projects/:id/schedule
 *   2. Client-side — call `normalizeGanttData(rawTasks, opts)` for immediate,
 *                    offline rendering without a round-trip
 *
 * The client-side mode implements the same 8-stage pipeline as the backend
 * scheduleEngine.js.  It is used as a fallback and for real-time drag previews.
 *
 * ARCHITECTURE INVARIANTS (this file is the enforcer in the browser):
 *   INV-01  task.end >= task.start
 *   INV-06  milestone.end === milestone.start
 *   INV-10  No circular dependencies
 *   INV-15  No date math in JSX — only position_x / bar_width from here
 *
 * @module ganttNormalization
 */

import {
  startOfDayUTC,
  addWorkingDays,
  subtractWorkingDays,
  taskDurationDays,
  workingDaysBetween,
  forwardToWorkingDay,
  DEFAULT_CALENDAR,
  buildCalendar
} from './calendarEngine.js';

const MS_PER_DAY = 86_400_000;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A: VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export function validateGanttInvariants(tasks) {
  const errors   = [];
  const warnings = [];
  const taskMap  = new Map((tasks ?? []).map(t => [String(t._id ?? t.id), t]));

  (tasks ?? []).forEach(task => {
    const id = String(task._id ?? task.id);

    // INV-01
    if (task.start_date && (task.due_date ?? task.end_date)) {
      const s = new Date(task.start_date);
      const e = new Date(task.due_date ?? task.end_date);
      if (!isNaN(s) && !isNaN(e) && s > e) {
        errors.push({ taskId: id, taskTitle: task.title, rule: 'INV-01',
          message: `"${task.title}" start > end` });
      }
    }

    // Invalid format guards
    ['start_date', 'due_date', 'end_date'].forEach(field => {
      if (task[field] && isNaN(new Date(task[field]).getTime())) {
        errors.push({ taskId: id, taskTitle: task.title, rule: 'INVALID_DATE',
          message: `"${task.title}" has invalid ${field}` });
      }
    });

    // INV-06 milestone
    if (task.task_type === 'milestone' && task.start_date && (task.due_date ?? task.end_date)) {
      const s = startOfDayUTC(task.start_date)?.getTime();
      const e = startOfDayUTC(task.due_date ?? task.end_date)?.getTime();
      if (s != null && e != null && s !== e) {
        warnings.push({ taskId: id, taskTitle: task.title, rule: 'INV-06',
          message: `Milestone "${task.title}" has non-zero duration` });
      }
    }

    // Parent check
    if (task.parent_id && !taskMap.has(String(task.parent_id))) {
      warnings.push({ taskId: id, taskTitle: task.title, rule: 'MISSING_PARENT',
        message: `"${task.title}" parent not in task set` });
    }

    // Dependency referential integrity
    (task.dependencies ?? []).forEach(dep => {
      const predId = String(dep.predecessor_id ?? dep);
      if (!taskMap.has(predId)) {
        warnings.push({ taskId: id, taskTitle: task.title, rule: 'MISSING_DEP',
          message: `"${task.title}" dep predecessor not in set` });
      }
    });
  });

  // INV-10: cycle check
  const inDegree   = new Map((tasks ?? []).map(t => [String(t._id ?? t.id), 0]));
  const successors = new Map((tasks ?? []).map(t => [String(t._id ?? t.id), []]));
  (tasks ?? []).forEach(task => {
    const id = String(task._id ?? task.id);
    (task.dependencies ?? []).forEach(dep => {
      const predId = String(dep.predecessor_id ?? dep);
      if (taskMap.has(predId)) {
        successors.get(predId).push(id);
        inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
      }
    });
  });
  const queue = Array.from(inDegree.entries()).filter(([, d]) => d === 0).map(([id]) => id);
  let settled = 0;
  while (queue.length) {
    const id = queue.shift(); settled++;
    (successors.get(id) ?? []).forEach(sid => {
      const d = (inDegree.get(sid) ?? 1) - 1;
      inDegree.set(sid, d);
      if (d === 0) queue.push(sid);
    });
  }
  if (settled < (tasks ?? []).length) {
    const cycleIds = (tasks ?? [])
      .filter(t => inDegree.get(String(t._id ?? t.id)) > 0)
      .map(t => String(t._id ?? t.id));
    errors.push({ rule: 'INV-10', message: 'Circular dependency detected', cycleIds });
  }

  return { errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B: CLIENT-SIDE SCHEDULING PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

function normalizeTasks(rawTasks, calendar) {
  return rawTasks
    .filter(t => t.status !== 'archived' && t.status !== 'cancelled')
    .map(task => {
      const id = String(task._id ?? task.id);
      let start = startOfDayUTC(task.start_date);
      let end   = startOfDayUTC(task.due_date ?? task.end_date);

      if (task.task_type === 'milestone' && start) end = start;
      if (start && !end) end = start;
      if (!start && end) start = end;

      const duration = (start && end) ? taskDurationDays(start, end, calendar) : null;

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
          type:     d.type     ?? 'FS',
          lag_days: d.lag_days ?? 0
        }))
      };
    });
}

function topologicalSort(tasks) {
  const taskMap    = new Map(tasks.map(t => [t.id, t]));
  const inDegree   = new Map(tasks.map(t => [t.id, 0]));
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
  while (queue.length) {
    const id = queue.shift();
    sorted.push(id);
    (successors.get(id) ?? []).forEach(sid => {
      const d = (inDegree.get(sid) ?? 1) - 1;
      inDegree.set(sid, d);
      if (d === 0) queue.push(sid);
    });
  }
  // Cycle guard: append any unvisited nodes in original order
  tasks.forEach(t => { if (!sorted.includes(t.id)) sorted.push(t.id); });
  return { sortedIds: sorted, successors };
}

function forwardPass(tasks, sortedIds, calendar, projectStart) {
  const anchor  = projectStart ?? startOfDayUTC(new Date());
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  sortedIds.forEach(id => {
    const task = taskMap.get(id);
    if (!task) return;

    if (task.scheduling_mode === 'locked' || task.scheduling_mode === 'manual') {
      task.early_start = task.start_date ?? task.end_date ?? anchor;
      task.early_end   = task.end_date   ?? task.start_date ?? anchor;
      return;
    }

    const candidates = [anchor];
    task.dependencies.forEach(dep => {
      const pred = taskMap.get(dep.predecessor_id);
      if (!pred) return;
      const lag = dep.lag_days ?? 0;
      switch (dep.type) {
        case 'FS':
          if (pred.early_end) candidates.push(addWorkingDays(pred.early_end, lag + 1, calendar));
          break;
        case 'SS':
          if (pred.early_start) candidates.push(addWorkingDays(pred.early_start, lag, calendar));
          break;
        case 'FF':
          if (pred.early_end && task.duration) {
            const reqEnd = addWorkingDays(pred.early_end, lag, calendar);
            candidates.push(subtractWorkingDays(reqEnd, task.duration - 1, calendar));
          }
          break;
        case 'SF':
          if (pred.early_start && task.duration) {
            const reqEnd = addWorkingDays(pred.early_start, lag, calendar);
            candidates.push(subtractWorkingDays(reqEnd, task.duration - 1, calendar));
          }
          break;
      }
    });

    let es = new Date(Math.max(...candidates.filter(Boolean).map(d => d.getTime())));
    es = forwardToWorkingDay(es, calendar);

    if (task.constraint_type === 'SNET' && task.constraint_date)
      es = new Date(Math.max(es.getTime(), startOfDayUTC(task.constraint_date).getTime()));
    if (task.constraint_type === 'MSO' && task.constraint_date)
      es = startOfDayUTC(task.constraint_date);
    if (task.constraint_type === 'MFO' && task.constraint_date && task.duration)
      es = subtractWorkingDays(startOfDayUTC(task.constraint_date), task.duration - 1, calendar);

    task.early_start = es;
    task.early_end   = task.task_type === 'milestone'
      ? es
      : addWorkingDays(es, (task.duration ?? 1) - 1, calendar);
  });

  return taskMap;
}

function backwardPass(tasks, sortedIds, successors, taskMap, calendar, deadline) {
  const deadlineDate = deadline
    ?? new Date(Math.max(...tasks.map(t => (t.early_end ?? new Date(0)).getTime())));

  const reversed = [...sortedIds].reverse();
  reversed.forEach(id => {
    const task  = taskMap.get(id);
    if (!task) return;

    const succs = (successors.get(id) ?? []).map(sid => taskMap.get(sid)).filter(Boolean);
    if (!succs.length) {
      task.late_end   = deadlineDate;
      task.late_start = task.task_type === 'milestone'
        ? deadlineDate
        : subtractWorkingDays(deadlineDate, (task.duration ?? 1) - 1, calendar);
      return;
    }

    const lateCandidates = [];
    succs.forEach(succ => {
      (succ.dependencies ?? []).filter(dep => dep.predecessor_id === id).forEach(dep => {
        const lag = dep.lag_days ?? 0;
        switch (dep.type) {
          case 'FS':
            if (succ.late_start) lateCandidates.push(subtractWorkingDays(succ.late_start, lag + 1, calendar));
            break;
          case 'SS':
            if (succ.late_start)
              lateCandidates.push(addWorkingDays(
                subtractWorkingDays(succ.late_start, lag, calendar),
                (task.duration ?? 1) - 1, calendar
              ));
            break;
          case 'FF':
            if (succ.late_end) lateCandidates.push(subtractWorkingDays(succ.late_end, lag, calendar));
            break;
          case 'SF':
            if (succ.late_end)
              lateCandidates.push(addWorkingDays(
                subtractWorkingDays(succ.late_end, lag, calendar),
                (task.duration ?? 1) - 1, calendar
              ));
            break;
        }
      });
    });

    task.late_end   = lateCandidates.length
      ? new Date(Math.min(...lateCandidates.filter(Boolean).map(d => d.getTime())))
      : deadlineDate;
    task.late_start = task.task_type === 'milestone'
      ? task.late_end
      : subtractWorkingDays(task.late_end, (task.duration ?? 1) - 1, calendar);
  });
}

function computeCriticalPath(sortedIds, taskMap, calendar) {
  sortedIds.forEach(id => {
    const t = taskMap.get(id);
    if (!t || !t.early_start || !t.late_start) return;
    t.total_float = workingDaysBetween(t.early_start, t.late_start, calendar);
    t.is_critical = t.total_float === 0;

    if (t.constraint_type === 'FNLT' && t.constraint_date && t.early_end) {
      const fnlt = startOfDayUTC(t.constraint_date);
      if (t.early_end > fnlt) {
        t.constraint_violated       = true;
        t.constraint_violation_days = workingDaysBetween(fnlt, t.early_end, calendar);
      }
    }
  });
}

function aggregateParents(tasks, taskMap) {
  const childrenMap = new Map(tasks.map(t => [t.id, []]));
  tasks.forEach(task => {
    const pid = task.parent_id ? String(task.parent_id) : null;
    if (pid && childrenMap.has(pid)) childrenMap.get(pid).push(task.id);
  });

  const visited = new Set();
  function traverse(id) {
    if (visited.has(id)) return;
    visited.add(id);
    const task     = taskMap.get(id);
    if (!task) return;
    const children = childrenMap.get(id) ?? [];
    children.forEach(traverse);

    if (children.length) {
      const childTasks = children.map(cid => taskMap.get(cid)).filter(Boolean);
      const starts = childTasks.map(c => c.early_start).filter(Boolean);
      const ends   = childTasks.map(c => c.early_end).filter(Boolean);
      if (starts.length) task.early_start = new Date(Math.min(...starts.map(d => d.getTime())));
      if (ends.length)   task.early_end   = new Date(Math.max(...ends.map(d => d.getTime())));
      task.is_parent   = true;
      task.is_critical = childTasks.some(c => c.is_critical);
    }
  }

  tasks.filter(t => !t.parent_id || !taskMap.has(String(t.parent_id))).forEach(r => traverse(r.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C: RENDER MODEL BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildRenderModel(tasks, pixelsPerDay) {
  const allStarts = tasks.map(t => t.early_start ?? t.start_date).filter(Boolean);
  const allEnds   = tasks.map(t => t.early_end   ?? t.end_date).filter(Boolean);

  if (!allStarts.length) {
    return { scheduledTasks: [], unscheduledTasks: tasks, timelineRange: null, todayMarker: null, pixelsPerDay };
  }

  const today    = startOfDayUTC(new Date());
  const rawStart = new Date(Math.min(...allStarts.map(d => d.getTime())));
  const rawEnd   = new Date(Math.max(...allEnds.map(d => d.getTime())));

  const rangeStart = new Date(rawStart.getTime() - 7  * MS_PER_DAY);
  const rangeEnd   = new Date(rawEnd.getTime()   + 14 * MS_PER_DAY);

  function toPixel(date) {
    if (!date) return 0;
    return Math.max(0, Math.floor((date.getTime() - rangeStart.getTime()) / MS_PER_DAY) * pixelsPerDay);
  }

  const scheduled   = [];
  const unscheduled = [];

  tasks.forEach(task => {
    const start = task.early_start ?? task.start_date;
    const end   = task.early_end   ?? task.end_date;

    if (!start || !end) { unscheduled.push(task); return; }

    const durDays  = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
    const barWidth = task.task_type === 'milestone'
      ? 14
      : Math.max(pixelsPerDay, durDays * pixelsPerDay);
    const slackWidth = (task.total_float ?? 0) * pixelsPerDay;

    let baselineDelta = null;
    if (task.baseline_start && task.baseline_end) {
      const bs = startOfDayUTC(task.baseline_start);
      const be = startOfDayUTC(task.baseline_end);
      if (bs && be) {
        baselineDelta = {
          start_delta_days: Math.round((start.getTime() - bs.getTime()) / MS_PER_DAY),
          end_delta_days:   Math.round((end.getTime()   - be.getTime()) / MS_PER_DAY),
          position_x: toPixel(bs),
          bar_width:  Math.max(1, Math.round((be.getTime() - bs.getTime()) / MS_PER_DAY) + 1) * pixelsPerDay
        };
      }
    }

    const isOverdue = end < today && task.status !== 'done' && task.status !== 'archived';
    const isAtRisk  = !isOverdue && task.total_float != null && (task.duration ?? 1) > 0
      && task.total_float / (task.duration ?? 1) < 0.2;

    scheduled.push({
      ...task,
      effective_start: start,
      effective_end:   end,
      duration_days:   durDays,
      position_x:      toPixel(start),
      bar_width:        barWidth,
      slack_width:      slackWidth,
      is_overdue:       isOverdue,
      is_at_risk:       isAtRisk,
      baseline_delta:   baselineDelta
    });
  });

  const todayPos     = toPixel(today);
  const todayVisible = today >= rangeStart && today <= rangeEnd;

  return {
    scheduledTasks:   scheduled,
    unscheduledTasks: unscheduled,
    timelineRange:    { startDate: rangeStart, endDate: rangeEnd },
    todayMarker:      { position: todayPos, visible: todayVisible, date: today },
    pixelsPerDay
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION D: PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full client-side scheduling + render pipeline.
 *
 * @param {Array}  rawTasks
 * @param {Object} options
 * @param {number} options.pixelsPerDay
 * @param {Object} options.calendar        - pass buildCalendar() result
 * @param {Date}   options.projectStart
 * @param {Date}   options.projectDeadline
 * @returns {GanttData}
 */
export function normalizeGanttData(rawTasks, options = {}) {
  const {
    pixelsPerDay    = 8,
    calendar        = DEFAULT_CALENDAR,
    projectStart    = null,
    projectDeadline = null
  } = options;

  const startT = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const { errors, warnings } = validateGanttInvariants(rawTasks ?? []);

  if (!rawTasks?.length) {
    return {
      scheduledTasks: [], unscheduledTasks: [], timelineRange: null,
      todayMarker: null, pixelsPerDay,
      metadata: { totalTasks: 0, scheduledCount: 0, unscheduledCount: 0,
                  validationErrors: errors, warnings, hasErrors: errors.length > 0,
                  computedMs: 0, source: 'client' }
    };
  }

  const cal = (calendar && calendar.workingDays) ? calendar : buildCalendar(calendar ?? {});
  const tasks = normalizeTasks(rawTasks, cal);

  const { sortedIds, successors } = topologicalSort(tasks);
  const taskMap = forwardPass(tasks, sortedIds, cal, projectStart ?? undefined);
  backwardPass(tasks, sortedIds, successors, taskMap, cal, projectDeadline);
  computeCriticalPath(sortedIds, taskMap, cal);
  aggregateParents(tasks, taskMap);

  const result = buildRenderModel(Array.from(taskMap.values()), pixelsPerDay);

  return {
    ...result,
    metadata: {
      totalTasks:        rawTasks.length,
      scheduledCount:    result.scheduledTasks.length,
      unscheduledCount:  result.unscheduledTasks.length,
      criticalPathCount: result.scheduledTasks.filter(t => t.is_critical).length,
      validationErrors:  errors,
      warnings,
      hasErrors:         errors.length > 0,
      computedMs:        Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startT),
      source:            'client'
    }
  };
}

/**
 * Consume a pre-computed response from GET /api/projects/:id/schedule.
 * Preferred over normalizeGanttData when the API is available.
 *
 * @param {Object} scheduleResult  - API response
 * @param {Object} options
 * @param {number} options.pixelsPerDay
 * @returns {GanttData}
 */
export function normalizeFromScheduleResult(scheduleResult, options = {}) {
  const { pixelsPerDay = scheduleResult?.meta?.pixelsPerDay ?? 8 } = options;
  if (!scheduleResult?.schedule) return normalizeGanttData([], { pixelsPerDay });

  const { schedule } = scheduleResult;
  if (pixelsPerDay !== schedule.pixelsPerDay) {
    return recalculateForZoom({ ...schedule, metadata: { ...schedule.metadata, source: 'api' } }, pixelsPerDay);
  }
  return { ...schedule, metadata: { ...schedule.metadata, source: 'api' } };
}

/**
 * Recalculate pixel positions only (zoom change).  Does NOT re-run scheduling.
 *
 * @param {GanttData} ganttData
 * @param {number}    newPixelsPerDay
 * @returns {GanttData}
 */
export function recalculateForZoom(ganttData, newPixelsPerDay) {
  const { scheduledTasks, unscheduledTasks, metadata } = ganttData;
  if (!scheduledTasks?.length) return { ...ganttData, pixelsPerDay: newPixelsPerDay };

  const tasksWithDates = scheduledTasks.map(t => ({
    ...t,
    early_start: t.early_start ? new Date(t.early_start) : undefined,
    early_end:   t.early_end   ? new Date(t.early_end)   : undefined,
    start_date:  t.start_date  ? new Date(t.start_date)  : undefined,
    end_date:    t.end_date    ? new Date(t.end_date)     : undefined
  }));

  const result = buildRenderModel([...tasksWithDates, ...(unscheduledTasks ?? [])], newPixelsPerDay);
  return { ...result, metadata: { ...(metadata ?? {}), source: metadata?.source ?? 'client' } };
}

/**
 * Build SVG dependency arrow descriptors for the Gantt renderer.
 *
 * @param {Array}  scheduledTasks - from normalizeGanttData
 * @param {number} rowHeight      - pixel height per row (default 44)
 * @returns {Array<DependencyArrow>}
 */
export function buildDependencyArrows(scheduledTasks, rowHeight = 44) {
  const taskIndexMap = new Map(scheduledTasks.map((t, i) => [t.id, i]));
  const arrows = [];

  scheduledTasks.forEach(task => {
    (task.dependencies ?? []).forEach(dep => {
      const predIdx = taskIndexMap.get(dep.predecessor_id);
      const succIdx = taskIndexMap.get(task.id);
      if (predIdx == null || succIdx == null) return;

      const pred = scheduledTasks[predIdx];
      const startX = (dep.type === 'FS' || dep.type === 'FF')
        ? pred.position_x + pred.bar_width
        : pred.position_x;
      const startY = predIdx * rowHeight + rowHeight / 2;
      const endX   = task.position_x;
      const endY   = succIdx * rowHeight + rowHeight / 2;

      arrows.push({
        id:         `dep-${pred.id}-${task.id}-${dep.type}`,
        type:       dep.type,
        lag:        dep.lag_days ?? 0,
        startX, startY, endX, endY,
        isCritical: pred.is_critical && task.is_critical
      });
    });
  });

  return arrows;
}
