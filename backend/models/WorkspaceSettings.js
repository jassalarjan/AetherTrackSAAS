import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceSettings — singleton document for the workspace.
// workspace_id is always 'main' for single-tenant deployments.
// ─────────────────────────────────────────────────────────────────────────────

const webhookSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  url:             { type: String, required: true },
  events:          { type: [String], default: ['task.created'] },
  secret:          { type: String, default: null },
  is_active:       { type: Boolean, default: true },
  last_triggered:  { type: Date, default: null },
  last_status:     { type: Number, default: null },  // HTTP status of last delivery
  delivery_count:  { type: Number, default: 0 },
  created_at:      { type: Date, default: Date.now },
});

const workspaceSettingsSchema = new mongoose.Schema(
  {
    workspace_id: { type: String, required: true, unique: true, default: 'main' },

    // ── General ───────────────────────────────────────────────────────────
    general: {
      name:        { type: String, default: 'AetherTrack Workspace' },
      description: { type: String, default: '' },
      timezone:    { type: String, default: 'UTC' },
      date_format: { type: String, enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], default: 'DD/MM/YYYY' },
      language:    { type: String, default: 'en' },
      logo_url:    { type: String, default: null },
    },

    // ── Security policy ───────────────────────────────────────────────────
    security: {
      session_timeout_minutes:        { type: Number, default: 480 },
      password_min_length:            { type: Number, default: 12 },
      password_require_uppercase:     { type: Boolean, default: true },
      password_require_numbers:       { type: Boolean, default: true },
      password_require_symbols:       { type: Boolean, default: true },
      allowed_signup_domains:         { type: [String], default: [] },
      restrict_signups_to_domains:    { type: Boolean, default: false },
      audit_log_retention_days:       { type: Number, default: 90 },
    },

    // ── Integrations ──────────────────────────────────────────────────────
    integrations: {
      slack_enabled:        { type: Boolean, default: false },
      slack_webhook_url:    { type: String, default: null },
      slack_channel:        { type: String, default: null },
      github_enabled:       { type: Boolean, default: false },
      github_token:         { type: String, default: null },
      github_repo:          { type: String, default: null },
      jira_enabled:         { type: Boolean, default: false },
      jira_base_url:        { type: String, default: null },
      jira_token:           { type: String, default: null },
      jira_project_key:     { type: String, default: null },
    },

    // ── Automation rules ──────────────────────────────────────────────────
    automation: {
      auto_assign_unassigned_tasks:    { type: Boolean, default: false },
      auto_close_resolved_days:        { type: Number, default: 7 },
      auto_close_resolved:             { type: Boolean, default: false },
      due_reminder_days_before:        { type: Number, default: 2 },
      notify_on_overdue:               { type: Boolean, default: true },
      auto_archive_completed_projects: { type: Boolean, default: false },
      auto_archive_days:               { type: Number, default: 30 },
    },

    // ── Webhooks ──────────────────────────────────────────────────────────
    webhooks: { type: [webhookSchema], default: [] },

    // ── Billing (read-only via API unless admin) ──────────────────────────
    billing: {
      plan:            { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' },
      billing_email:   { type: String, default: null },
      billing_cycle:   { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
      seats_used:      { type: Number, default: 1 },
      seats_limit:     { type: Number, default: 5 },
      trial_ends_at:   { type: Date, default: null },
      subscription_id: { type: String, default: null },
      next_invoice_at: { type: Date, default: null },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

workspaceSettingsSchema.index({ workspace_id: 1 }, { unique: true });

export default mongoose.model('WorkspaceSettings', workspaceSettingsSchema);
