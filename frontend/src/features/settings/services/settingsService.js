/**
 * settingsService — thin wrapper over the /api/settings backend.
 * All methods return the resolved data (not the axios response object).
 */
import api from '@/shared/services/axios';

const settingsService = {
  // ── User settings ────────────────────────────────────────────────────────
  getUserSettings: () =>
    api.get('/settings/user').then(r => r.data),

  updateUserSettings: (data) =>
    api.patch('/settings/user', data).then(r => r.data.settings ?? r.data),

  // ── API keys ─────────────────────────────────────────────────────────────
  generateApiKey: ({ name, scopes = ['read'], expires_at = null }) =>
    api.post('/settings/user/api-keys', { name, scopes, expires_at }).then(r => r.data),

  revokeApiKey: (keyId) =>
    api.delete(`/settings/user/api-keys/${keyId}`).then(r => r.data),

  // ── Data export ──────────────────────────────────────────────────────────
  requestDataExport: () =>
    api.post('/settings/user/data-export').then(r => r.data),

  // ── Workspace settings ────────────────────────────────────────────────────
  getWorkspaceSettings: () =>
    api.get('/settings/workspace').then(r => r.data),

  updateWorkspaceGeneral: (data) =>
    api.patch('/settings/workspace/general', data).then(r => r.data),

  updateWorkspaceSecurity: (data) =>
    api.patch('/settings/workspace/security', data).then(r => r.data),

  updateWorkspaceIntegrations: (data) =>
    api.patch('/settings/workspace/integrations', data).then(r => r.data),

  updateWorkspaceAutomation: (data) =>
    api.patch('/settings/workspace/automation', data).then(r => r.data),

  updateWorkspaceBilling: (data) =>
    api.patch('/settings/workspace/billing', data).then(r => r.data),

  // ── Webhooks ──────────────────────────────────────────────────────────────
  listWebhooks: () =>
    api.get('/settings/workspace/webhooks').then(r => r.data),

  createWebhook: (data) =>
    api.post('/settings/workspace/webhooks', data).then(r => r.data),

  updateWebhook: (id, data) =>
    api.patch(`/settings/workspace/webhooks/${id}`, data).then(r => r.data),

  deleteWebhook: (id) =>
    api.delete(`/settings/workspace/webhooks/${id}`).then(r => r.data),
};

export default settingsService;
