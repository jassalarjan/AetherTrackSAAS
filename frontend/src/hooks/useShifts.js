/**
 * useShifts.js
 *
 * React hook that provides easy access to the entire shifts API:
 *   shifts, policy, assignments, rotations, my-shift (employee self)
 *
 * Follows the same pattern as useMeetings.js in this project.
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// baseURL is already set to /api in the configured axios instance
const BASE = '/hr/shifts';

export default function useShifts() {
  // ── State ────────────────────────────────────────────────────────────────
  const [shifts, setShifts] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [allPolicies, setAllPolicies] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [rotations, setRotations] = useState([]);
  const [myShift, setMyShift] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const handleError = (err) => {
    const msg = err.response?.data?.message || err.message || 'Something went wrong';
    setError(msg);
    throw new Error(msg);
  };

  // ── Shifts ───────────────────────────────────────────────────────────────
  const fetchShifts = useCallback(async (includeInactive = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(BASE, {
        params: includeInactive ? { include_inactive: 'true' } : {},
      });
      setShifts(data);
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createShift = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(BASE, payload);
      setShifts((prev) => [...prev, data]);
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateShift = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.put(`${BASE}/${id}`, payload);
      setShifts((prev) => prev.map((s) => (s._id === id ? data : s)));
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteShift = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`${BASE}/${id}`);
      setShifts((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Policy ───────────────────────────────────────────────────────────────
  const fetchPolicy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`${BASE}/policy/active`);
      setPolicy(data);
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`${BASE}/policy/all`);
      setAllPolicies(data);
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const savePolicy = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`${BASE}/policy`, payload);
      setPolicy(data);
      setAllPolicies((prev) => [data, ...prev.map((p) => ({ ...p, is_active: false }))]);
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePolicy = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.put(`${BASE}/policy/${id}`, payload);
      setPolicy(data);
      setAllPolicies((prev) => prev.map((p) => (p._id === id ? data : p)));
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Assignments ──────────────────────────────────────────────────────────
  const fetchAssignments = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`${BASE}/assignments`, {
        params: filters,
      });
      setAssignments(data);
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const assignShift = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`${BASE}/assignments`, payload);
      setAssignments((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAssignment = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.put(`${BASE}/assignments/${id}`, payload);
      setAssignments((prev) => prev.map((a) => (a._id === id ? data : a)));
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAssignment = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`${BASE}/assignments/${id}`);
      setAssignments((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Rotations ────────────────────────────────────────────────────────────
  const fetchRotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`${BASE}/rotations`);
      setRotations(data);
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRotation = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`${BASE}/rotations`, payload);
      setRotations((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRotation = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.put(`${BASE}/rotations/${id}`, payload);
      setRotations((prev) => prev.map((r) => (r._id === id ? data : r)));
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRotation = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`${BASE}/rotations/${id}`);
      setRotations((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── My Shift ─────────────────────────────────────────────────────────────
  const fetchMyShift = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`${BASE}/my-shift`);
      setMyShift(data);
      return data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  return {
    // state
    shifts,
    policy,
    allPolicies,
    assignments,
    rotations,
    myShift,
    loading,
    error,
    setError,

    // shifts
    fetchShifts,
    createShift,
    updateShift,
    deleteShift,

    // policy
    fetchPolicy,
    fetchAllPolicies,
    savePolicy,
    updatePolicy,

    // assignments
    fetchAssignments,
    assignShift,
    updateAssignment,
    deleteAssignment,

    // rotations
    fetchRotations,
    createRotation,
    updateRotation,
    deleteRotation,

    // my-shift
    fetchMyShift,
  };
}
