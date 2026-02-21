/**
 * Gantt Timeline Debug Utilities
 * 
 * Lightweight diagnostic tools for troubleshooting timeline rendering issues.
 * Enable with: ?debug=gantt in URL or localStorage.setItem('gantt_debug', 'true')
 * 
 * @module ganttDebugger
 */

import { formatDate } from './dateNormalization.js';

/**
 * Check if debug mode is enabled
 * @returns {boolean}
 */
export function isDebugMode() {
  if (typeof window === 'undefined') return false;
  
  // Check URL params
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') === 'gantt') return true;
  
  // Check localStorage
  if (localStorage.getItem('gantt_debug') === 'true') return true;
  
  return false;
}

/**
 * Enable debug mode
 */
export function enableDebugMode() {
  localStorage.setItem('gantt_debug', 'true');
  console.log('🔍 Gantt debug mode enabled. Reload to see detailed logs.');
}

/**
 * Disable debug mode
 */
export function disableDebugMode() {
  localStorage.removeItem('gantt_debug');
  console.log('Gantt debug mode disabled.');
}

/**
 * Create debug panel data structure
 * @param {Object} normalizedData - Output from normalizeGanttData()
 * @returns {Object} Debug panel data
 */
export function createDebugPanel(normalizedData) {
  if (!isDebugMode()) return null;
  
  const {
    scheduledTasks,
    unscheduledTasks,
    timelineRange,
    pixelsPerDay,
    todayMarker,
    metadata
  } = normalizedData;
  
  return {
    // Summary metrics
    metrics: {
      totalTasks: metadata.totalTasks,
      scheduled: metadata.scheduledCount,
      unscheduled: metadata.unscheduledCount,
      hasErrors: metadata.hasErrors,
      errorCount: metadata.validationErrors.length
    },
    
    // Timeline info
    timeline: {
      startDate: formatDate(timelineRange.startDate, 'long'),
      endDate: formatDate(timelineRange.endDate, 'long'),
      pixelsPerDay,
      totalDays: Math.ceil((timelineRange.endDate - timelineRange.startDate) / (1000 * 60 * 60 * 24)),
      totalWidth: Math.ceil((timelineRange.endDate - timelineRange.startDate) / (1000 * 60 * 60 * 24)) * pixelsPerDay
    },
    
    // Today marker
    today: {
      date: formatDate(todayMarker.date, 'long'),
      position: todayMarker.position,
      visible: todayMarker.visible
    },
    
    // Validation errors
    errors: metadata.validationErrors,
    
    // Task breakdown
    taskBreakdown: {
      byStatus: getTaskBreakdown(scheduledTasks, 'status'),
      byPriority: getTaskBreakdown(scheduledTasks, 'priority')
    },
    
    // Utility functions
    inspect: (taskId) => inspectTask(taskId, scheduledTasks, unscheduledTasks, timelineRange, pixelsPerDay),
    exportForSupport: () => exportDebugData(normalizedData)
  };
}

/**
 * Get task breakdown by field
 * @param {Array} tasks - Tasks to analyze
 * @param {string} field - Field to group by
 * @returns {Object} Counts by field value
 */
function getTaskBreakdown(tasks, field) {
  const breakdown = {};
  tasks.forEach(task => {
    const value = task[field] || 'none';
    breakdown[value] = (breakdown[value] || 0) + 1;
  });
  return breakdown;
}

/**
 * Inspect a specific task in detail
 * @param {string} taskId - Task ID to inspect
 * @param {Array} scheduledTasks - Scheduled tasks
 * @param {Array} unscheduledTasks - Unscheduled tasks
 * @param {Object} timelineRange - Timeline range
 * @param {number} pixelsPerDay - Zoom level
 */
function inspectTask(taskId, scheduledTasks, unscheduledTasks, timelineRange, pixelsPerDay) {
  const task = [...scheduledTasks, ...unscheduledTasks].find(t => t.id === taskId || t._id === taskId);
  
  if (!task) {
    console.error(`Task not found: ${taskId}`);
    return;
  }
  
  console.group(`🔍 Task Inspector: ${task.title}`);
  
  console.table({
    'Task ID': task.id || task._id,
    'Title': task.title,
    'Status': task.status,
    'Priority': task.priority,
    'Progress': `${task.progress || 0}%`,
    'Start Date (stored)': task.start_date ? new Date(task.start_date).toISOString() : 'null',
    'End Date (stored)': task.end_date ? new Date(task.end_date).toISOString() : 'null',
    'Duration (computed)': task.duration_days ? `${task.duration_days} days` : 'N/A',
    'Position X (pixels)': task.position_x || 'N/A',
    'Bar Width (pixels)': task.bar_width || 'N/A',
    'Is Scheduled': scheduledTasks.includes(task) ? 'Yes' : 'No',
    'Is Parent': task.is_parent ? 'Yes' : 'No',
    'Dates Computed': task.computed_dates ? 'Yes' : 'No'
  });
  
  // Check position calculations
  if (task.start_date && task.end_date) {
    const expectedPosition = Math.floor(
      (new Date(task.start_date) - timelineRange.startDate) / (1000 * 60 * 60 * 24)
    ) * pixelsPerDay;
    
    const expectedWidth = Math.ceil(
      (new Date(task.end_date) - new Date(task.start_date)) / (1000 * 60 * 60 * 24)
    ) * pixelsPerDay;
    
    console.log('Position Verification:');
    console.table({
      'Expected Position': expectedPosition,
      'Actual Position': task.position_x,
      'Match': expectedPosition === task.position_x ? '✓' : '✗',
      'Expected Width': expectedWidth,
      'Actual Width': task.bar_width,
      'Match ': expectedWidth === task.bar_width ? '✓' : '✗'
    });
  }
  
  // Dependencies
  if (task.dependencies && task.dependencies.length > 0) {
    console.log('Dependencies:', task.dependencies);
  }
  
  // Parent/children
  if (task.parent_id) {
    console.log('Parent ID:', task.parent_id);
  }
  
  console.groupEnd();
}

/**
 * Export debug data for support/troubleshooting
 * @param {Object} normalizedData - Normalized Gantt data
 * @returns {string} JSON string with sanitized data
 */
function exportDebugData(normalizedData) {
  const sanitized = {
    metadata: normalizedData.metadata,
    timeline: {
      startDate: normalizedData.timelineRange.startDate.toISOString(),
      endDate: normalizedData.timelineRange.endDate.toISOString(),
      pixelsPerDay: normalizedData.pixelsPerDay
    },
    tasks: {
      scheduled: normalizedData.scheduledTasks.map(t => ({
        id: t.id,
        title: t.title,
        start_date: t.start_date ? new Date(t.start_date).toISOString() : null,
        end_date: t.end_date ? new Date(t.end_date).toISOString() : null,
        duration_days: t.duration_days,
        position_x: t.position_x,
        bar_width: t.bar_width,
        status: t.status,
        priority: t.priority
      })),
      unscheduled: normalizedData.unscheduledTasks.map(t => ({
        id: t.id,
        title: t.title,
        start_date: t.start_date,
        end_date: t.end_date
      }))
    },
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
  
  return JSON.stringify(sanitized, null, 2);
}

/**
 * Log normalized data summary (called automatically if debug mode enabled)
 * @param {Object} normalizedData - Normalized Gantt data
 */
export function logNormalizedDataSummary(normalizedData) {
  if (!isDebugMode()) return;
  
  const debug = createDebugPanel(normalizedData);
  
  console.group('📊 Gantt Debug Summary');
  
  console.log('Metrics:', debug.metrics);
  console.log('Timeline:', debug.timeline);
  console.log('Today Marker:', debug.today);
  
  if (debug.errors.length > 0) {
    console.error('⚠️ Validation Errors:', debug.errors);
  }
  
  console.log('Task Breakdown:', debug.taskBreakdown);
  
  console.log('\n💡 Quick Commands:');
  console.log('  ganttDebug.inspect("task_id") - Inspect specific task');
  console.log('  ganttDebug.exportForSupport() - Export debug data');
  console.log('  ganttDebugOff() - Disable debug mode');
  
  console.groupEnd();
  
  // Expose to window for easy access in console
  if (typeof window !== 'undefined') {
    window.ganttDebug = debug;
    window.ganttDebugOff = disableDebugMode;
  }
}

/**
 * Render debug overlay UI (optional visual debugger)
 * @param {Object} normalizedData - Normalized Gantt data
 * @returns {React.Element|null} Debug overlay component or null
 */
export function DebugOverlay({ normalizedData }) {
  if (!isDebugMode()) return null;
  
  const debug = createDebugPanel(normalizedData);
  
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white text-xs p-4 rounded-lg shadow-xl max-w-sm z-50 font-mono">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold">🔍 Gantt Debug</span>
        <button
          onClick={disableDebugMode}
          className="text-gray-400 hover:text-white"
          title="Disable debug mode"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div>
          <div className="text-gray-400">Tasks</div>
          <div>Scheduled: {debug.metrics.scheduled} | Unscheduled: {debug.metrics.unscheduled}</div>
        </div>
        
        <div>
          <div className="text-gray-400">Timeline</div>
          <div>{debug.timeline.totalDays} days ({debug.timeline.totalWidth}px)</div>
        </div>
        
        <div>
          <div className="text-gray-400">Zoom</div>
          <div>{debug.timeline.pixelsPerDay}px/day</div>
        </div>
        
        {debug.metrics.hasErrors && (
          <div className="text-red-400">
            ⚠️ {debug.metrics.errorCount} validation error(s)
          </div>
        )}
        
        <div className="text-gray-500 text-[10px] mt-2">
          Open console for detailed logs
        </div>
      </div>
    </div>
  );
}
