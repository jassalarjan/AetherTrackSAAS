import { useState, useEffect, useCallback } from 'react';
import settingsService from '../services/settingsService';

// ─────────────────────────────────────────────────────────────────────────────
// useUserSettings
// ─────────────────────────────────────────────────────────────────────────────
export const useUserSettings = () => {
  const [settings, setSettings]  = useState(null);
  const [loading, setLoading]    = useState(true);
  const [saving,  setSaving]     = useState(false);
  const [error,   setError]      = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsService.getUserSettings();
      setSettings(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const update = useCallback(async (updates) => {
    try {
      setSaving(true);
      setError(null);
      const updated = await settingsService.updateUserSettings(updates);
      setSettings(prev => ({ ...prev, ...updated }));
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save settings';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, loading, saving, error, refetch: fetch, update };
};

// ─────────────────────────────────────────────────────────────────────────────
// useWorkspaceSettings
// ─────────────────────────────────────────────────────────────────────────────
export const useWorkspaceSettings = () => {
  const [settings, setSettings]  = useState(null);
  const [loading, setLoading]    = useState(true);
  const [saving,  setSaving]     = useState(false);
  const [error,   setError]      = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsService.getWorkspaceSettings();
      setSettings(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load workspace settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateSection = useCallback(async (section, updates) => {
    try {
      setSaving(true);
      setError(null);
      let updated;
      switch (section) {
        case 'general':       updated = await settingsService.updateWorkspaceGeneral(updates);       break;
        case 'security':      updated = await settingsService.updateWorkspaceSecurity(updates);      break;
        case 'integrations':  updated = await settingsService.updateWorkspaceIntegrations(updates);  break;
        case 'automation':    updated = await settingsService.updateWorkspaceAutomation(updates);    break;
        case 'billing':       updated = await settingsService.updateWorkspaceBilling(updates);       break;
        default: throw new Error(`Unknown section: ${section}`);
      }
      // Merge updated sub-section back into local state
      setSettings(prev => prev ? { ...prev, [section]: updated.settings ?? prev[section] } : prev);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, loading, saving, error, refetch: fetch, updateSection };
};

// ─────────────────────────────────────────────────────────────────────────────
// useApiKeys  — manage API keys from user settings
// ─────────────────────────────────────────────────────────────────────────────
export const useApiKeys = () => {
  const [keys,    setKeys]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsService.getUserSettings();
      setKeys(data.api_keys ?? []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const generate = useCallback(async (payload) => {
    const result = await settingsService.generateApiKey(payload);
    // result.key contains the one-time raw key
    await fetch();  // refresh list
    return result;
  }, [fetch]);

  const revoke = useCallback(async (keyId) => {
    await settingsService.revokeApiKey(keyId);
    setKeys(prev => prev.map(k => k._id === keyId ? { ...k, is_active: false } : k));
  }, []);

  return { keys, loading, error, refetch: fetch, generate, revoke };
};

// ─────────────────────────────────────────────────────────────────────────────
// useWebhooks  — workspace webhooks
// ─────────────────────────────────────────────────────────────────────────────
export const useWebhooks = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsService.listWebhooks();
      setWebhooks(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (data) => {
    const result = await settingsService.createWebhook(data);
    await fetch();
    return result;
  };

  const update = async (id, data) => {
    const result = await settingsService.updateWebhook(id, data);
    setWebhooks(prev => prev.map(w => w._id === id ? { ...w, ...result.webhook } : w));
    return result;
  };

  const remove = async (id) => {
    await settingsService.deleteWebhook(id);
    setWebhooks(prev => prev.filter(w => w._id !== id));
  };

  return { webhooks, loading, error, refetch: fetch, create, update, remove };
};
