/**
 * useMeetings — central data hook for the Meeting Management system.
 *
 * Responsibilities:
 *  - Fetch, create, update, cancel and delete meetings via /api/hr/meetings
 *  - Expose normalised calendar events ready for react-big-calendar
 *  - Surface conflict warnings returned from the API
 *  - Keep state consistent after mutations
 */

import { useState, useCallback, useRef } from 'react';
import api from '@/shared/services/axios';

// ── Meeting type colour palette (mirrored in MeetingFormModal) ───────────────
export const MEETING_TYPE_COLORS = {
  hr:         '#8b5cf6', // violet
  all_hands:  '#ef4444', // red
  team:       '#3b82f6', // blue
  interview:  '#f59e0b', // amber
  review:     '#10b981', // emerald
  one_on_one: '#6366f1', // indigo
  external:   '#ec4899', // pink
  other:      '#6b7280', // gray
};

export const MEETING_TYPE_LABELS = {
  hr:         'HR',
  all_hands:  'All-Hands',
  team:       'Team',
  interview:  'Interview',
  review:     'Review',
  one_on_one: '1-on-1',
  external:   'External',
  other:      'Other',
};

// ── Status badge styles ──────────────────────────────────────────────────────
export const STATUS_STYLES = {
  scheduled:  'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  completed:  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  cancelled:  'bg-red-500/20 text-red-400 border border-red-500/30',
};

/**
 * Convert a Meeting document from the API into a react-big-calendar event.
 */
export function meetingToCalendarEvent(m) {
  return {
    id:    `meeting-${m._id}`,
    title: m.title,
    start: new Date(m.start_time),
    end:   new Date(m.end_time),
    allDay: m.is_all_day || false,
    resource: {
      type:    'meeting',
      subtype: m.meeting_type,
      data:    m,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function useMeetings() {
  const [meetings, setMeetings]           = useState([]);
  const [loading, setLoading]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState(null);
  const [conflicts, setConflicts]         = useState([]);
  const abortRef                          = useRef(null);

  // ── Derived: calendar events ───────────────────────────────────────────────
  const calendarEvents = meetings.map(meetingToCalendarEvent);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchMeetings = useCallback(async ({ start, end, status, type } = {}) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (start)  params.start  = start instanceof Date ? start.toISOString() : start;
      if (end)    params.end    = end   instanceof Date ? end.toISOString()   : end;
      if (status) params.status = status;
      if (type)   params.type   = type;

      const { data } = await api.get('/hr/meetings', { params, signal: controller.signal });
      setMeetings(data.meetings || []);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error('useMeetings.fetchMeetings:', err);
        setError(err.response?.data?.message || 'Failed to load meetings');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Create ─────────────────────────────────────────────────────────────────
  const createMeeting = useCallback(async (payload) => {
    try {
      setSaving(true);
      setError(null);
      setConflicts([]);
      const { data } = await api.post('/hr/meetings', payload);
      if (data.conflicts?.length) setConflicts(data.conflicts);
      setMeetings(prev => [...prev, data.meeting]);
      return { success: true, meeting: data.meeting, conflicts: data.conflicts };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create meeting';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Update ─────────────────────────────────────────────────────────────────
  const updateMeeting = useCallback(async (id, payload) => {
    try {
      setSaving(true);
      setError(null);
      const { data } = await api.put(`/hr/meetings/${id}`, payload);
      setMeetings(prev => prev.map(m => m._id === id ? data : m));
      return { success: true, meeting: data };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update meeting';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const cancelMeeting = useCallback(async (id, reason = '') => {
    try {
      setSaving(true);
      setError(null);
      const { data } = await api.patch(`/hr/meetings/${id}/cancel`, { reason });
      setMeetings(prev => prev.map(m => m._id === id ? data.meeting : m));
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to cancel meeting';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Delete (hard) ──────────────────────────────────────────────────────────
  const deleteMeeting = useCallback(async (id) => {
    try {
      setSaving(true);
      setError(null);
      await api.delete(`/hr/meetings/${id}`);
      setMeetings(prev => prev.filter(m => m._id !== id));
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete meeting';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Conflict check (standalone, for form validation) ─────────────────────
  const checkConflicts = useCallback(async (payload) => {
    try {
      const { data } = await api.post('/hr/meetings/check-conflicts', payload);
      return data;
    } catch {
      return { has_conflicts: false, conflicts: [] };
    }
  }, []);

  return {
    meetings,
    calendarEvents,
    loading,
    saving,
    error,
    conflicts,
    fetchMeetings,
    createMeeting,
    updateMeeting,
    cancelMeeting,
    deleteMeeting,
    checkConflicts,
    clearError: () => setError(null),
    clearConflicts: () => setConflicts([]),
  };
}
