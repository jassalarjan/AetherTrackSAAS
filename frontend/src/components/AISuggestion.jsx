/**
 * AetherTrack 2030 AI Suggestion Layer
 * Reference: System_UI_Shift.md Section 7 - AI Integration Layer
 * 
 * Features:
 * - Task description assist: "/" in description field → Suggestion popover
 * - Sprint planning: Sprint create dialog → Recommended assignments
 * - Attendance anomaly: Dashboard load → Inline alert callout
 * - Overdue prediction: Task list → Risk badge on at-risk tasks
 * - Smart search: Command palette → Natural language queries
 * - Leave conflict detection: Leave approval flow → Team conflict warning
 * 
 * AI UI Rules:
 * - Distinct --color-ai-subtle surface (light tint)
 * - ✦ icon prefix
 * - Always dismissible
 * - One-click accept/ignore
 * - Never blocks primary workflow
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * AI Suggestion Types
 */
export const AI_TYPES = {
  TASK_ASSIST: 'task_assist',
  SPRINT_PLANNING: 'sprint_planning',
  ATTENDANCE_ANOMALY: 'attendance_anomaly',
  OVERDUE_PREDICTION: 'overdue_prediction',
  SMART_SEARCH: 'smart_search',
  LEAVE_CONFLICT: 'leave_conflict',
  GENERAL: 'general',
};

/**
 * AI Suggestion Component
 */
export const AISuggestion = ({
  type = AI_TYPES.GENERAL,
  title,
  message,
  suggestions = [],
  onAccept,
  onIgnore,
  onDismiss,
  isLoading = false,
  className = '',
}) => {
  const getIcon = () => {
    switch (type) {
      case AI_TYPES.TASK_ASSIST:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case AI_TYPES.SPRINT_PLANNING:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        );
      case AI_TYPES.ATTENDANCE_ANOMALY:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case AI_TYPES.OVERDUE_PREDICTION:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case AI_TYPES.LEAVE_CONFLICT:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        );
    }
  };

  const getStyles = () => {
    switch (type) {
      case AI_TYPES.ATTENDANCE_ANOMALY:
      case AI_TYPES.OVERDUE_PREDICTION:
      case AI_TYPES.LEAVE_CONFLICT:
        return 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100';
      default:
        return 'bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800 text-violet-900 dark:text-violet-100';
    }
  };

  return (
    <div 
      className={`
        ai-suggestion
        relative flex flex-col gap-3 p-4 rounded-lg border
        ${getStyles()}
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0 text-[var(--color-ai-accent)]">
            ✦
          </span>
          <span className="font-medium text-sm">{title}</span>
        </div>
        
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Dismiss suggestion"
        >
          <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Message */}
      {message && (
        <p className="text-sm opacity-80">{message}</p>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onAccept?.(suggestion)}
              disabled={isLoading}
              className="
                inline-flex items-center gap-2 px-3 py-1.5 
                text-sm rounded-md font-medium
                bg-white/60 dark:bg-black/20
                border border-current/20
                hover:bg-white dark:hover:bg-black/30
                focus-visible:ring-2 focus-visible:[var(--brand)]
                transition-colors
              "
            >
              {isLoading ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span>✓</span>
              )}
              {suggestion.label || suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Ignore link */}
      <button
        onClick={onIgnore}
        className="text-xs opacity-60 hover:opacity-100 transition-opacity self-start"
      >
        Ignore
      </button>
    </div>
  );
};

/**
 * AI Suggestion Hook
 */
export const useAISuggestions = ({ type, context = {} }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const abortRef = useRef(null);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (prompt) => {
    setIsLoading(true);
    
    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    try {
      // Simulate AI suggestion API call
      // In production, replace with actual AI service
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock suggestions based on type
      const mockSuggestions = generateMockSuggestions(type, context);
      setSuggestions(mockSuggestions);
      setIsVisible(true);
      
      return mockSuggestions;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('AI suggestion error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [type, context]);

  // Dismiss suggestion
  const dismiss = useCallback((index = null) => {
    if (index !== null) {
      setSuggestions(prev => prev.filter((_, i) => i !== index));
    }
    if (suggestions.length <= 1) {
      setIsVisible(false);
    }
  }, [suggestions.length]);

  // Clear all
  const clear = useCallback(() => {
    setSuggestions([]);
    setIsVisible(false);
  }, []);

  // Accept suggestion
  const accept = useCallback((suggestion) => {
    dismiss(suggestions.indexOf(suggestion));
    return suggestion;
  }, [suggestions, dismiss]);

  return {
    suggestions,
    isLoading,
    isVisible,
    fetchSuggestions,
    dismiss,
    clear,
    accept,
  };
};

/**
 * Generate mock suggestions based on type
 */
const generateMockSuggestions = (type, context) => {
  switch (type) {
    case AI_TYPES.TASK_ASSIST:
      return [
        { label: 'Add subtasks', value: 'add_subtasks' },
        { label: 'Set due date', value: 'set_due_date' },
        { label: 'Assign team', value: 'assign_team' },
      ];
    case AI_TYPES.SPRINT_PLANNING:
      return context.teamMembers?.slice(0, 3).map(member => ({
        label: `Assign ${member.name}`,
        value: member.id,
      })) || [];
    case AI_TYPES.OVERDUE_PREDICTION:
      return [
        { label: 'Extend deadline', value: 'extend_deadline' },
        { label: 'Reassign task', value: 'reassign' },
        { label: 'Mark blocked', value: 'mark_blocked' },
      ];
    case AI_TYPES.LEAVE_CONFLICT:
      return [
        { label: 'View calendar', value: 'view_calendar' },
        { label: 'Approve anyway', value: 'approve' },
      ];
    default:
      return [];
  }
};

/**
 * AI Alert Callout - for inline alerts
 */
export const AIAlertCallout = ({
  title,
  children,
  type = 'info',
  onAction,
  onDismiss,
}) => {
  const styles = {
    info: 'bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800',
    warning: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
    success: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
  };

  return (
    <div 
      className={`
        ai-alert-callout
        flex items-start gap-3 p-4 rounded-lg border
        ${styles[type]}
      `}
      role="alert"
    >
      <span className="flex-shrink-0 text-[var(--color-ai-accent)] mt-0.5">
        ✦
      </span>
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-medium text-sm mb-1">{title}</h4>
        )}
        <div className="text-sm opacity-80">
          {children}
        </div>
      </div>

      {onAction && (
        <button
          onClick={onAction}
          className="
            flex-shrink-0 px-3 py-1.5 text-sm font-medium
            bg-white dark:bg-black/20
            border border-current/20 rounded-md
            hover:bg-white/80 dark:hover:bg-black/30
            transition-colors
          "
        >
          View
        </button>
      )}

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default AISuggestion;
