# Gantt Timeline Architecture

**Production-grade Gantt chart implementation with correctness, observability, and maintainability.**

---

## 🎯 Core Principles

### 1. Dates are Authoritative, Duration is Derived

**NEVER store both dates and duration.** This creates conflicting state that leads to drift.

```javascript
// ✓ CORRECT
task.start_date = '2026-02-19T00:00:00.000Z'
task.end_date = '2026-02-25T23:59:59.999Z'
task.duration_days = computed // Calculated on-demand

// ✗ WRONG - Duration will drift
task.start_date = '2026-02-19'
task.duration_days = 7  // This will become stale
```

### 2. View Layer NEVER Calculates Dates

The view only translates **pre-computed pixel positions** into rendered bars.

```javascript
// ✗ WRONG - Calculating in render
<div style={{ left: calculatePosition(task.start_date) }}>

// ✓ CORRECT - Using normalized data
<div style={{ left: `${task.position_x}px` }}>
```

### 3. Normalization Pipeline Runs Once Per Data Change

All date math, validation, and position calculations happen in a **single pipeline** before rendering.

```
API Data → Normalize → Validate → Separate → Position → Render
```

### 4. Scheduled and Unscheduled Tasks Separated at Data Layer

Tasks without dates should **never reach** the timeline renderer.

```javascript
// Separation happens in normalization, not in render
const { scheduledTasks, unscheduledTasks } = normalizeGanttData(rawTasks)
```

---

## 📁 Architecture Overview

### File Structure

```
frontend/src/
├── utils/
│   ├── dateNormalization.js      # Date utilities (UTC boundaries, duration calc)
│   ├── ganttNormalization.js     # Main pipeline (validation, positioning)
│   └── ganttDebugger.js          # Debug tools (inspector, export)
└── pages/
    └── ProjectGantt.jsx           # View layer (rendering only)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. API Response (Raw Tasks)                                 │
│    { start_date: "2026-02-19", due_date: "2026-02-25" }    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Date Normalization (dateNormalization.js)               │
│    - Parse ISO strings                                      │
│    - Normalize to UTC day boundaries                        │
│    - Validate date ordering                                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Validation (ganttNormalization.js)                      │
│    - Check invariants (start <= end, no cycles, etc.)      │
│    - Detect missing references                             │
│    - Log errors for observability                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Separation                                               │
│    scheduledTasks = tasks with valid start + end dates     │
│    unscheduledTasks = tasks missing dates                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Parent Aggregation (Optional)                           │
│    - Post-order tree traversal                             │
│    - parent.start = min(children.start)                    │
│    - parent.end = max(children.end)                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Position Calculation                                     │
│    position_x = (start - rangeStart) * pixelsPerDay        │
│    bar_width = (end - start) * pixelsPerDay                │
│    duration_days = Math.ceil((end - start) / MS_PER_DAY)   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Render (ProjectGantt.jsx)                               │
│    <div style={{ left: task.position_x, width: bar_width }}│
│    - No date math in view                                  │
│    - Only pixel position rendering                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Guide

### Step 1: Normalize Data in Component

Use `useMemo` to run the pipeline only when tasks or zoom level changes:

```javascript
import { normalizeGanttData } from '../utils/ganttNormalization.js';
import { logNormalizedDataSummary } from '../utils/ganttDebugger.js';

const ganttData = useMemo(() => {
  const normalized = normalizeGanttData(filteredTasks, {
    pixelsPerDay: getPixelsPerDay(),
    enableParentAggregation: false  // Enable when implementing hierarchies
  });
  
  // Auto-log if debug mode enabled
  logNormalizedDataSummary(normalized);
  
  return normalized;
}, [filteredTasks, timeScale]);
```

### Step 2: Extract Normalized Data

```javascript
const {
  scheduledTasks,      // Tasks with dates + positions
  unscheduledTasks,    // Tasks without dates
  timelineRange,       // { startDate, endDate }
  pixelsPerDay,        // Current zoom level
  todayMarker,         // { position, visible, date }
  metadata             // Validation errors, counts
} = ganttData;
```

### Step 3: Render Using Pre-Computed Positions

```jsx
{scheduledTasks.map(task => (
  <div
    key={task.id}
    style={{
      left: `${task.position_x}px`,
      width: `${task.bar_width}px`
    }}
    title={`${task.title} - ${task.duration_days} days`}
  >
    {/* Bar content */}
  </div>
))}
```

### Step 4: Handle Today Marker

```jsx
{todayMarker.visible && (
  <div
    className="today-marker"
    style={{ left: `${todayMarker.position}px` }}
  >
    TODAY
  </div>
)}
```

### Step 5: Show Unscheduled Task Warning

```jsx
{unscheduledTasks.length > 0 && (
  <div className="warning-banner">
    {unscheduledTasks.length} task(s) without dates won't appear on timeline
  </div>
)}
```

---

## 🐛 Debug Mode

### Enabling Debug Mode

**Option 1: URL Parameter**
```
http://localhost:5173/projects/gantt?debug=gantt
```

**Option 2: Browser Console**
```javascript
localStorage.setItem('gantt_debug', 'true')
// Then reload page
```

### Debug Features

1. **Console Logging**
   - Normalization pipeline steps
   - Validation errors
   - Task counts (scheduled vs unscheduled)
   - Timeline range calculations

2. **Debug Panel**
   - Visual overlay showing metrics
   - Real-time FPS counter
   - Zoom level indicator
   - Error count badge

3. **Task Inspector**
   ```javascript
   // In browser console
   ganttDebug.inspect("task_id_here")
   ```
   **Shows:**
   - Stored dates vs computed positions
   - Duration calculation verification
   - Parent/child relationships
   - Dependency chains

4. **Export for Support**
   ```javascript
   ganttDebug.exportForSupport()
   ```
   Generates JSON with:
   - Sanitized task data
   - Timeline configuration
   - Validation errors
   - User agent info

### Disabling Debug Mode

```javascript
ganttDebugOff()  // In console
// or
localStorage.removeItem('gantt_debug')
```

---

## 📐 Data Contract

### Task Input (from API)

```typescript
interface TaskInput {
  _id: string
  title: string
  start_date: string | null      // ISO 8601 UTC
  due_date: string | null         // ISO 8601 UTC (aliased to end_date)
  status: 'todo' | 'in_progress' | 'done' | 'review'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress: number                // 0-100
  parent_id?: string | null
  dependencies?: Array<{ predecessor_id: string }>
}
```

### Task Output (normalized)

```typescript
interface TaskNormalized extends TaskInput {
  id: string                      // Normalized from _id
  start_date: Date | null         // Normalized to UTC start of day
  end_date: Date | null           // Normalized to UTC end of day
  
  // Computed fields (NEVER stored in DB)
  duration_days: number           // Math.ceil((end - start) / MS_PER_DAY)
  position_x: number              // Pixel offset from timeline start
  bar_width: number               // Width in pixels
  
  // Metadata
  is_parent: boolean              // Has children
  computed_dates: boolean         // Dates aggregated from children
}
```

### Gantt Data Output

```typescript
interface GanttData {
  scheduledTasks: TaskNormalized[]      // Tasks with valid dates
  unscheduledTasks: TaskInput[]         // Tasks without dates
  
  timelineRange: {
    startDate: Date                      // Timeline start (with padding)
    endDate: Date                        // Timeline end (with padding)
  }
  
  pixelsPerDay: number                   // Current zoom level
  
  todayMarker: {
    position: number                     // Pixel offset
    visible: boolean                     // Is today in visible range?
    date: Date                           // Today normalized
  }
  
  metadata: {
    totalTasks: number
    scheduledCount: number
    unscheduledCount: number
    validationErrors: Array<ValidationError>
    hasErrors: boolean
  }
}
```

---

## ✅ Validation Rules (Invariants)

These MUST always hold true for correct rendering:

### Data Integrity

1. **Date Ordering**
   ```javascript
   ∀ task: task.start_date ≤ task.end_date
   ```

2. **Parent Aggregation**
   ```javascript
   ∀ parent: parent.start_date = min(children.start_date)
   ∀ parent: parent.end_date = max(children.end_date)
   ```

3. **Reference Integrity**
   ```javascript
   ∀ task with parent_id: ∃ parent in tasks
   ∀ dependency: ∃ predecessor in tasks
   ```

4. **No Circular References**
   ```javascript
   ¬∃ cycle in parent-child graph
   ¬∃ cycle in dependency graph
   ```

### Rendering Consistency

1. **Position Formula**
   ```javascript
   position_x = (start_date - rangeStart) * pixelsPerDay
   ```

2. **Width Formula**
   ```javascript
   bar_width = duration_days * pixelsPerDay
   ```

3. **Duration Formula**
   ```javascript
   duration_days = Math.ceil((end_date - start_date) / MS_PER_DAY)
   ```

---

## ⚡ Performance Optimization

### Memoization Strategy

```javascript
// Normalize only when tasks or zoom changes
const ganttData = useMemo(() => 
  normalizeGanttData(tasks, { pixelsPerDay }), 
  [tasks, pixelsPerDay]
);

// Re-calculate only positions on zoom (lightweight)
const recalculated = useMemo(() =>
  recalculateForZoom(ganttData, newPixelsPerDay),
  [ganttData, newPixelsPerDay]
);
```

### Virtualization

For **>500 tasks**, implement virtual scrolling:

```javascript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={scheduledTasks.length}
  itemSize={40}
>
  {({ index, style }) => (
    <TaskBar task={scheduledTasks[index]} style={style} />
  )}
</FixedSizeList>
```

### Debouncing

```javascript
const debouncedZoom = useMemo(
  () => debounce((newZoom) => setPixelsPerDay(newZoom), 100),
  []
);
```

---

## 🚫 Anti-Patterns (DON'T DO THIS)

### ❌ Calculating Dates in Render

```javascript
// WRONG - Recalculates on every render
{tasks.map(task => {
  const duration = (new Date(task.end) - new Date(task.start)) / MS_PER_DAY
  return <div>{duration} days</div>
})}

// CORRECT - Use pre-computed value
{tasks.map(task => <div>{task.duration_days} days</div>)}
```

### ❌ Parent Aggregation in View

```javascript
// WRONG - Calculating in component
const parentStart = Math.min(...children.map(c => new Date(c.start)))

// CORRECT - Computed in normalization pipeline
const parentStart = task.start_date  // Already aggregated
```

### ❌ Mixing Local Time and UTC

```javascript
// WRONG - Creates "off by one day" bugs
const date = new Date('2026-02-19')  // Midnight in LOCAL time

// CORRECT - Always UTC
const date = normalizeToStartOfDay('2026-02-19T00:00:00.000Z')
```

### ❌ Storing Both Duration and Dates

```javascript
// WRONG - Creates conflicting state
await api.patch('/tasks/123', {
  end_date: '2026-02-25',
  duration_days: 7  // This will drift!
})

// CORRECT - Store dates only
await api.patch('/tasks/123', {
  end_date: '2026-02-25'
  // Duration computed on read
})
```

---

## 🔍 Troubleshooting

### Tasks Not Appearing on Timeline

**Symptom:** Tasks exist but aren't visible on Gantt chart

**Debug Steps:**
1. Enable debug mode: `?debug=gantt`
2. Check console: "Scheduled tasks (with dates): X"
3. If X = 0, tasks are missing dates
4. Inspect specific task: `ganttDebug.inspect("task_id")`
5. Check "Is Scheduled" field

**Common Causes:**
- Task has `start_date` but no `end_date` (or vice versa)
- Dates are invalid ISO strings
- Dates are in wrong format

**Fix:**
```javascript
// Ensure both dates are set
task.start_date = "2026-02-19T00:00:00.000Z"
task.end_date = "2026-02-25T23:59:59.999Z"
```

### Bars Positioned Incorrectly

**Symptom:** Task bars appear in wrong location on timeline

**Debug Steps:**
1. Run `ganttDebug.inspect("task_id")`
2. Compare "Expected Position" vs "Actual Position"
3. Check timeline range in debug panel

**Common Causes:**
- Timezone mismatch (using local time instead of UTC)
- Timeline range calculation excludes task dates
- Incorrect `pixelsPerDay` value

**Fix:**
- Use `normalizeToStartOfDay()` for all dates
- Verify timeline padding includes all tasks

### "Off by One Day" Bugs

**Symptom:** Task displays 6 days instead of 7

**Root Cause:** Using exclusive end dates instead of inclusive

**Fix:**
```javascript
// Duration calculation must use Math.ceil for inclusive end
duration_days = Math.ceil((end - start) / MS_PER_DAY)  // ✓ Inclusive
duration_days = Math.floor((end - start) / MS_PER_DAY) // ✗ Exclusive (wrong!)
```

### Parent Dates Not Updating

**Symptom:** Parent task doesn't reflect child task changes

**Debug Steps:**
1. Check if `enableParentAggregation: true` in config
2. Verify parent has `is_parent: true` in normalized data
3. Check for circular references in validation errors

**Fix:**
```javascript
const ganttData = normalizeGanttData(tasks, {
  pixelsPerDay: 8,
  enableParentAggregation: true  // ← Enable this
});
```

---

## 📊 Observability & Monitoring

### Console Logging (Production-Safe)

The normalization pipeline logs a **compact summary** that's safe for production:

```
📊 Gantt Normalization Pipeline
  Step 1: Validating data invariants...
  ✓ All invariants satisfied
  Step 2: Normalizing dates to UTC boundaries...
  ✓ Normalized 47 tasks
  Step 3: Separating scheduled vs unscheduled tasks...
  ✓ Scheduled: 42, Unscheduled: 5
  ...
  normalization: 12.3ms
```

### Error Tracking

Validation errors are **logged but don't block rendering**:

```javascript
if (metadata.hasErrors) {
  console.error('⚠️ Gantt validation errors:', metadata.validationErrors);
  // Send to Sentry or logging service
  captureException(new Error('Gantt validation failed'), {
    extra: { errors: metadata.validationErrors }
  });
}
```

### Performance Metrics

Track normalization pipeline performance:

```javascript
console.time('gantt-normalization');
const ganttData = normalizeGanttData(tasks, config);
console.timeEnd('gantt-normalization');

// Target: <50ms for 1000 tasks
```

---

## 🎓 Key Learnings

### Why This Architecture?

**Problem:** Most Gantt implementations fail because:
1. View layer calculates dates (slow, inconsistent)
2. No separation of scheduled vs unscheduled tasks
3. Parent dates stored instead of computed (drift)
4. Timezone issues create "off by one" bugs
5. No validation → bad data silently breaks UI

**Solution:** This architecture enforces:
1. **Single source of truth:** Dates, not duration
2. **Normalization pipeline:** All math happens once, before render
3. **Immutability:** View receives frozen, position-ready data
4. **Validation first:** Detect bad data before it breaks rendering
5. **Observability:** Debug mode for troubleshooting

### When to Use

**Use this architecture when:**
- Building production SaaS with Gantt charts
- Rendering >100 tasks with complex dependencies
- Supporting parent-child hierarchies
- Need audit trails and observability
- Timeline must be pixel-perfect

**Simpler alternatives sufficient when:**
- <20 tasks, no relationships
- Static demo or proof-of-concept
- No zoom/scroll requirements
- Timeline accuracy not critical

---

## 📚 API Reference

See individual utility files for full API documentation:
- [dateNormalization.js](./frontend/src/utils/dateNormalization.js) - Date/time utilities
- [ganttNormalization.js](./frontend/src/utils/ganttNormalization.js) - Main pipeline
- [ganttDebugger.js](./frontend/src/utils/ganttDebugger.js) - Debug tools

---

## 🚀 Next Steps

### Implement Hierarchies

Enable parent-child aggregation:

```javascript
const ganttData = normalizeGanttData(tasks, {
  pixelsPerDay: 8,
  enableParentAggregation: true  // ← Enable
});
```

### Add Dependencies

Validate dependency constraints:

```javascript
// In normalization pipeline
if (task.dependencies) {
  task.dependencies.forEach(dep => {
    const predecessor = tasks.find(t => t.id === dep.predecessor_id);
    if (new Date(task.start_date) < new Date(predecessor.end_date)) {
      // Mark as validation error
      errors.push({ taskId: task.id, rule: 'dependency_violated' });
    }
  });
}
```

### Drag-to-Reschedule

When user drags a task bar:

```javascript
const handleDragEnd = async (taskId, newStartDate, newEndDate) => {
  // Send to API
  await api.patch(`/tasks/${taskId}`, {
    start_date: newStartDate.toISOString(),
    end_date: newEndDate.toISOString()
  });
  
  // Re-fetch tasks (pipeline will auto-normalize)
  fetchTasks();
};
```

### Critical Path Highlighting

Identify tasks on critical path:

```javascript
// In normalization pipeline
task.is_critical_path = calculateCriticalPath(tasks, task.id);

// In render
className={task.is_critical_path ? 'critical-path-bar' : 'regular-bar'}
```

---

## 📞 Support

**Issues with timeline rendering?**
1. Enable debug mode: `?debug=gantt`
2. Run `ganttDebug.exportForSupport()` in console
3. Share the exported JSON with your team

**Questions about architecture?**
- See inline comments in utility files
- Review test cases (when implemented)
- Consult this guide's troubleshooting section

---

**Last Updated:** February 19, 2026  
**Architecture Version:** 1.0.0  
**Maintainers:** Development Team
