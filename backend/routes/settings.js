/**
 * Settings Routes — /api/settings
 *
 * User endpoints (all authenticated users):
 *   GET    /user                    → get or init user settings
 *   PATCH  /user                    → update user settings (notifications, privacy)
 *   POST   /user/api-keys           → generate a new API key (admin only)
 *   DELETE /user/api-keys/:keyId    → revoke an API key
 *   POST   /user/data-export        → request a data export
 *
 * Workspace endpoints (admin only for writes, admin+hr for reads):
 *   GET    /workspace               → get or init workspace settings
 *   PATCH  /workspace/general       → update general settings
 *   PATCH  /workspace/security      → update security policy
 *   PATCH  /workspace/integrations  → update integration settings
 *   PATCH  /workspace/automation    → update automation rules
 *   PATCH  /workspace/billing       → update billing info
 *   GET    /workspace/webhooks      → list webhooks
 *   POST   /workspace/webhooks      → create webhook
 *   PATCH  /workspace/webhooks/:id  → update webhook
 *   DELETE /workspace/webhooks/:id  → delete webhook
 */
import express from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';
import { auditLogger } from '../middleware/auditLogger.js';
import UserSettings from '../models/UserSettings.js';
import WorkspaceSettings from '../models/WorkspaceSettings.js';
import { validateIdParam } from '../utils/validation.js';
import getClientIP from '../utils/getClientIP.js';
import { logChange } from '../utils/changeLogService.js';

const router = express.Router();

// All settings routes require authentication
router.use(authenticate);

const WORKSPACE_ID = 'main';

const DEFAULT_FEATURE_MATRIX = {
  dashboard: true,
  tasks: true,
  kanban: true,
  calendar: true,
  notifications: true,
  self_attendance: true,
  projects: true,
  my_projects: true,
  sprints: true,
  gantt: true,
  resources: true,
  analytics: true,
  hr_dashboard: true,
  hr_attendance: true,
  hr_leaves: true,
  hr_calendar: true,
  reallocation: true,
  email_center: true,
  teams: true,
  users: true,
  settings: true,
  audit_log: true,
  changelog: true,
  geofencing: true,
  verification: true,
  feature_matrix: true,
};

// ─── helpers ────────────────────────────────────────────────────────────────

const handleError = (res, err, ctx = 'Settings') => {
  console.error(`[Settings] ${ctx}:`, err);
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
  return res.status(500).json({ message: err.message || 'Server error' });
};

/** Get-or-create the workspace settings singleton. */
async function getOrCreateWorkspace() {
  let ws = await WorkspaceSettings.findOne({ workspace_id: WORKSPACE_ID });
  if (!ws) {
    ws = await WorkspaceSettings.create({ workspace_id: WORKSPACE_ID });
  }
  const mergedFeatures = {
    ...DEFAULT_FEATURE_MATRIX,
    ...(ws.feature_matrix || {}),
  };
  const hasFeatureDrift = JSON.stringify(mergedFeatures) !== JSON.stringify(ws.feature_matrix || {});
  if (hasFeatureDrift) {
    ws.feature_matrix = mergedFeatures;
    await ws.save();
  }
  return ws;
}

const normalizeFeatureMatrix = (incoming = {}, existing = {}) => {
  const merged = {
    ...DEFAULT_FEATURE_MATRIX,
    ...(existing || {}),
  };

  for (const key of Object.keys(DEFAULT_FEATURE_MATRIX)) {
    if (incoming[key] !== undefined) {
      merged[key] = Boolean(incoming[key]);
    }
  }

  return merged;
};

const isSuperAdminUser = (user) => {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return user.role === 'admin' && !user.workspaceId;
};

const requireSuperAdmin = (req, res, next) => {
  if (!isSuperAdminUser(req.user)) {
    return res.status(403).json({
      message: 'Access denied. Super admin privileges are required.',
    });
  }
  next();
};

/** Get-or-create user settings for req.user. */
async function getOrCreateUserSettings(userId) {
  let us = await UserSettings.findOne({ user_id: userId });
  if (!us) {
    us = await UserSettings.create({ user_id: userId });
  }
  return us;
}

/** Generate a cryptographically secure API key and its SHA-256 hash. */
function generateApiKey() {
  const raw = 'at_' + crypto.randomBytes(32).toString('hex');        // e.g. at_abc123...
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.substring(0, 16);   // displayed to user after creation
  return { raw, hash, prefix };
}

// ─────────────────────────────────────────────────────────────────────────────
// USER SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

// GET /settings/user
router.get('/user', async (req, res) => {
  try {
    const settings = await getOrCreateUserSettings(req.user._id);
    // Never expose key_hash in the response
    const safe = settings.toObject();
    safe.api_keys = safe.api_keys.map(({ key_hash, ...rest }) => rest);
    res.json(safe);
  } catch (err) {
    handleError(res, err, 'Get user settings');
  }
});

// PATCH /settings/user  — update notifications and/or privacy
router.patch(
  '/user',
  auditLogger({ event_type: 'system_event', target_type: 'UserSettings', action: 'Update user settings' }),
  async (req, res) => {
    try {
      const allowed = ['notifications', 'privacy'];
      const update = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          update[key] = req.body[key];
        }
      }
      if (Object.keys(update).length === 0) {
        return res.status(400).json({ message: 'No updatable fields provided' });
      }

      const settings = await UserSettings.findOneAndUpdate(
        { user_id: req.user._id },
        { $set: update },
        { new: true, upsert: true, runValidators: true }
      );

      const safe = settings.toObject();
      safe.api_keys = safe.api_keys.map(({ key_hash, ...rest }) => rest);
      res.json({ message: 'Settings updated', settings: safe });
    } catch (err) {
      handleError(res, err, 'Update user settings');
    }
  }
);

// POST /settings/user/api-keys  — generate a new API key (admin only)
router.post(
  '/user/api-keys',
  checkRole(['admin']),
  auditLogger({ event_type: 'system_event', target_type: 'ApiKey', action: 'Generate API key' }),
  async (req, res) => {
    try {
      const { name, scopes = ['read'], expires_at } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'API key name is required' });
      }

      const settings = await getOrCreateUserSettings(req.user._id);

      // Max 10 active keys per user
      const activeKeys = settings.api_keys.filter(k => k.is_active);
      if (activeKeys.length >= 10) {
        return res.status(400).json({ message: 'Maximum of 10 active API keys reached. Revoke an existing key first.' });
      }

      const { raw, hash, prefix } = generateApiKey();

      const newKey = {
        name: name.trim(),
        key_prefix: prefix,
        key_hash: hash,
        scopes: Array.isArray(scopes) ? scopes : ['read'],
        is_active: true,
        expires_at: expires_at ? new Date(expires_at) : null,
        created_at: new Date(),
      };

      settings.api_keys.push(newKey);
      await settings.save();

      const saved = settings.api_keys[settings.api_keys.length - 1];

      // Return the raw key ONCE — it cannot be recovered after this
      res.status(201).json({
        message: 'API key created. Copy it now — it will not be shown again.',
        key: {
          _id: saved._id,
          name: saved.name,
          raw_key: raw,            // shown once
          key_prefix: saved.key_prefix,
          scopes: saved.scopes,
          expires_at: saved.expires_at,
          created_at: saved.created_at,
        },
      });
    } catch (err) {
      handleError(res, err, 'Generate API key');
    }
  }
);

// DELETE /settings/user/api-keys/:keyId  — revoke an API key
router.delete(
  '/user/api-keys/:keyId',
  auditLogger({ event_type: 'system_event', target_type: 'ApiKey', action: 'Revoke API key' }),
  async (req, res) => {
    try {
      const settings = await getOrCreateUserSettings(req.user._id);
      const key = settings.api_keys.id(req.params.keyId);
      if (!key) return res.status(404).json({ message: 'API key not found' });

      key.is_active = false;
      await settings.save();
      res.json({ message: 'API key revoked successfully' });
    } catch (err) {
      handleError(res, err, 'Revoke API key');
    }
  }
);

// POST /settings/user/data-export  — request a data export package
router.post('/user/data-export', async (req, res) => {
  try {
    const settings = await getOrCreateUserSettings(req.user._id);

    // Allow one pending/processing request at a time
    const inFlight = settings.data_exports.find(e =>
      ['pending', 'processing'].includes(e.status)
    );
    if (inFlight) {
      return res.status(409).json({
        message: 'A data export is already in progress. Please wait for it to complete.',
        export_id: inFlight._id,
      });
    }

    const downloadToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    settings.data_exports.push({
      status: 'pending',
      download_token: downloadToken,
      expires_at: expiresAt,
    });
    await settings.save();

    const exportRequest = settings.data_exports[settings.data_exports.length - 1];

    logChange({
      event_type: 'system_event',
      user: req.user,
      user_ip: getClientIP(req),
      target_type: 'UserSettings',
      action: 'Data export requested',
      description: `User ${req.user.email} requested a data export`,
    }).catch(() => {});

    res.status(202).json({
      message: 'Data export requested. You will be notified when it is ready.',
      export_id: exportRequest._id,
    });
  } catch (err) {
    handleError(res, err, 'Request data export');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WORKSPACE SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

// GET /settings/workspace  — readable by admin and hr
router.get('/workspace', checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const ws = await getOrCreateWorkspace();
    const obj = ws.toObject();
    // Mask integration tokens before sending
    if (obj.integrations) {
      if (obj.integrations.github_token) obj.integrations.github_token = '••••••••';
      if (obj.integrations.jira_token) obj.integrations.jira_token = '••••••••';
    }
    // Mask webhook secrets
    if (obj.webhooks) {
      obj.webhooks = obj.webhooks.map(wh => ({
        ...wh,
        secret: wh.secret ? '••••••••' : null,
      }));
    }
    res.json(obj);
  } catch (err) {
    handleError(res, err, 'Get workspace settings');
  }
});

// GET /settings/workspace/features  — readable by all authenticated users
router.get('/workspace/features', async (req, res) => {
  try {
    const ws = await getOrCreateWorkspace();
    res.json({ features: normalizeFeatureMatrix({}, ws.feature_matrix) });
  } catch (err) {
    handleError(res, err, 'Get workspace feature flags');
  }
});

// GET /settings/workspace/feature-matrix  — super admin only
router.get('/workspace/feature-matrix', requireSuperAdmin, async (req, res) => {
  try {
    const ws = await getOrCreateWorkspace();
    res.json({ features: normalizeFeatureMatrix({}, ws.feature_matrix) });
  } catch (err) {
    handleError(res, err, 'Get feature matrix');
  }
});

// PATCH /settings/workspace/feature-matrix  — super admin only
router.patch(
  '/workspace/feature-matrix',
  requireSuperAdmin,
  auditLogger({ event_type: 'system_event', target_type: 'WorkspaceSettings', action: 'Update feature matrix' }),
  async (req, res) => {
    try {
      const incomingFeatures = req.body?.features;
      if (!incomingFeatures || typeof incomingFeatures !== 'object') {
        return res.status(400).json({ message: 'features object is required' });
      }

      const ws = await getOrCreateWorkspace();
      ws.feature_matrix = normalizeFeatureMatrix(incomingFeatures, ws.feature_matrix);
      await ws.save();

      res.json({
        message: 'Feature matrix updated',
        features: normalizeFeatureMatrix({}, ws.feature_matrix),
      });
    } catch (err) {
      handleError(res, err, 'Update feature matrix');
    }
  }
);

// PATCH /settings/workspace/general  — admin only
router.patch(
  '/workspace/general',
  checkRole(['admin']),
  auditLogger({ event_type: 'system_event', target_type: 'WorkspaceSettings', action: 'Update workspace general settings' }),
  async (req, res) => {
    try {
      const allowed = ['name', 'description', 'timezone', 'date_format', 'language', 'logo_url'];
      const update = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) update[`general.${key}`] = req.body[key];
      }
      if (!Object.keys(update).length) return res.status(400).json({ message: 'No fields to update' });

      const ws = await WorkspaceSettings.findOneAndUpdate(
        { workspace_id: WORKSPACE_ID },
        { $set: update },
        { new: true, upsert: true, runValidators: true }
      );
      res.json({ message: 'General settings updated', settings: ws.general });
    } catch (err) {
      handleError(res, err, 'Update workspace general');
    }
  }
);

// PATCH /settings/workspace/security  — admin only
router.patch(
  '/workspace/security',
  checkRole(['admin']),
  auditLogger({ event_type: 'system_event', target_type: 'WorkspaceSettings', action: 'Update workspace security policy' }),
  async (req, res) => {
    try {
      const allowed = [
        'session_timeout_minutes', 'password_min_length',
        'password_require_uppercase', 'password_require_numbers', 'password_require_symbols',
        'allowed_signup_domains', 'restrict_signups_to_domains', 'audit_log_retention_days',
      ];
      const update = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) update[`security.${key}`] = req.body[key];
      }
      if (!Object.keys(update).length) return res.status(400).json({ message: 'No fields to update' });

      const ws = await WorkspaceSettings.findOneAndUpdate(
        { workspace_id: WORKSPACE_ID },
        { $set: update },
        { new: true, upsert: true, runValidators: true }
      );
      res.json({ message: 'Security policy updated', settings: ws.security });
    } catch (err) {
      handleError(res, err, 'Update workspace security');
    }
  }
);

// PATCH /settings/workspace/integrations  — admin only
router.patch(
  '/workspace/integrations',
  checkRole(['admin']),
  auditLogger({ event_type: 'system_event', target_type: 'WorkspaceSettings', action: 'Update workspace integrations' }),
  async (req, res) => {
    try {
      const allowed = [
        'slack_enabled', 'slack_webhook_url', 'slack_channel',
        'github_enabled', 'github_token', 'github_repo',
        'jira_enabled', 'jira_base_url', 'jira_token', 'jira_project_key',
      ];
      const update = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) update[`integrations.${key}`] = req.body[key];
      }
      if (!Object.keys(update).length) return res.status(400).json({ message: 'No fields to update' });

      const ws = await WorkspaceSettings.findOneAndUpdate(
        { workspace_id: WORKSPACE_ID },
        { $set: update },
        { new: true, upsert: true, runValidators: true }
      );
      // Mask tokens in response
      const safe = { ...ws.integrations.toObject() };
      if (safe.github_token) safe.github_token = '••••••••';
      if (safe.jira_token) safe.jira_token = '••••••••';
      res.json({ message: 'Integrations updated', settings: safe });
    } catch (err) {
      handleError(res, err, 'Update workspace integrations');
    }
  }
);

// PATCH /settings/workspace/automation  — admin only
router.patch(
  '/workspace/automation',
  checkRole(['admin']),
  auditLogger({ event_type: 'system_event', target_type: 'WorkspaceSettings', action: 'Update workspace automation rules' }),
  async (req, res) => {
    try {
      const allowed = [
        'auto_assign_unassigned_tasks', 'auto_close_resolved_days', 'auto_close_resolved',
        'due_reminder_days_before', 'notify_on_overdue',
        'auto_archive_completed_projects', 'auto_archive_days',
      ];
      const update = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) update[`automation.${key}`] = req.body[key];
      }
      if (!Object.keys(update).length) return res.status(400).json({ message: 'No fields to update' });

      const ws = await WorkspaceSettings.findOneAndUpdate(
        { workspace_id: WORKSPACE_ID },
        { $set: update },
        { new: true, upsert: true, runValidators: true }
      );
      res.json({ message: 'Automation rules updated', settings: ws.automation });
    } catch (err) {
      handleError(res, err, 'Update workspace automation');
    }
  }
);

// PATCH /settings/workspace/billing  — admin only
router.patch(
  '/workspace/billing',
  checkRole(['admin']),
  auditLogger({ event_type: 'system_event', target_type: 'WorkspaceSettings', action: 'Update billing info' }),
  async (req, res) => {
    try {
      const allowed = ['billing_email', 'billing_cycle'];
      const update = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) update[`billing.${key}`] = req.body[key];
      }
      if (!Object.keys(update).length) return res.status(400).json({ message: 'No fields to update' });

      const ws = await WorkspaceSettings.findOneAndUpdate(
        { workspace_id: WORKSPACE_ID },
        { $set: update },
        { new: true, upsert: true, runValidators: true }
      );
      res.json({ message: 'Billing info updated', settings: ws.billing });
    } catch (err) {
      handleError(res, err, 'Update billing');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOKS (admin only for all operations)
// ─────────────────────────────────────────────────────────────────────────────

// GET /settings/workspace/webhooks
router.get('/workspace/webhooks', checkRole(['admin']), async (req, res) => {
  try {
    const ws = await getOrCreateWorkspace();
    const hooks = ws.webhooks.map(wh => ({
      ...wh.toObject(),
      secret: wh.secret ? '••••••••' : null,
    }));
    res.json(hooks);
  } catch (err) {
    handleError(res, err, 'List webhooks');
  }
});

// POST /settings/workspace/webhooks
router.post(
  '/workspace/webhooks',
  checkRole(['admin']),
  auditLogger({ event_type: 'system_event', target_type: 'Webhook', action: 'Create webhook' }),
  async (req, res) => {
    try {
      const { name, url, events = [], secret } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: 'Webhook name is required' });
      if (!url?.trim()) return res.status(400).json({ message: 'Webhook URL is required' });

      const ws = await getOrCreateWorkspace();
      if (ws.webhooks.length >= 20) {
        return res.status(400).json({ message: 'Maximum of 20 webhooks reached' });
      }

      const newHook = { name: name.trim(), url: url.trim(), events, secret: secret || null };
      ws.webhooks.push(newHook);
      await ws.save();

      const saved = ws.webhooks[ws.webhooks.length - 1];
      res.status(201).json({
        message: 'Webhook created',
        webhook: { ...saved.toObject(), secret: secret ? '••••••••' : null },
      });
    } catch (err) {
      handleError(res, err, 'Create webhook');
    }
  }
);

// PATCH /settings/workspace/webhooks/:id
router.patch(
  '/workspace/webhooks/:id',
  checkRole(['admin']),
  auditLogger({ event_type: 'system_event', target_type: 'Webhook', action: 'Update webhook' }),
  async (req, res) => {
    try {
      const ws = await getOrCreateWorkspace();
      const hook = ws.webhooks.id(req.params.id);
      if (!hook) return res.status(404).json({ message: 'Webhook not found' });

      const { name, url, events, secret, is_active } = req.body;
      if (name !== undefined) hook.name = name.trim();
      if (url !== undefined) hook.url = url.trim();
      if (events !== undefined) hook.events = events;
      if (secret !== undefined && secret !== '••••••••') hook.secret = secret;
      if (is_active !== undefined) hook.is_active = is_active;

      await ws.save();
      res.json({ message: 'Webhook updated', webhook: { ...hook.toObject(), secret: hook.secret ? '••••••••' : null } });
    } catch (err) {
      handleError(res, err, 'Update webhook');
    }
  }
);

// DELETE /settings/workspace/webhooks/:id
router.delete(
  '/workspace/webhooks/:id',
  checkRole(['admin']),
  auditLogger({ event_type: 'system_event', target_type: 'Webhook', action: 'Delete webhook' }),
  async (req, res) => {
    try {
      const ws = await getOrCreateWorkspace();
      const hook = ws.webhooks.id(req.params.id);
      if (!hook) return res.status(404).json({ message: 'Webhook not found' });

      hook.deleteOne();
      await ws.save();
      res.json({ message: 'Webhook deleted' });
    } catch (err) {
      handleError(res, err, 'Delete webhook');
    }
  }
);

export default router;
