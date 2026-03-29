import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// UserSettings — persisted preferences for a single user.
// Created lazily on first request (findOneOrCreate pattern).
// ─────────────────────────────────────────────────────────────────────────────

const apiKeySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  key_prefix:  { type: String },          // first 16 chars of raw key — for display
  key_hash:    { type: String },          // SHA-256 hash — for validation
  scopes:      { type: [String], default: ['read'] },
  is_active:   { type: Boolean, default: true },
  last_used_at: { type: Date, default: null },
  expires_at:  { type: Date, default: null },
  created_at:  { type: Date, default: Date.now },
});

const dataExportSchema = new mongoose.Schema({
  requested_at:   { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'expired'],
    default: 'pending',
  },
  download_token: { type: String, default: null },
  expires_at:     { type: Date, default: null },
});

const userSettingsSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // ── Notification preferences ──────────────────────────────────────────
    notifications: {
      email_task_assigned:   { type: Boolean, default: true },
      email_task_due:        { type: Boolean, default: true },
      email_mentions:        { type: Boolean, default: true },
      email_project_updates: { type: Boolean, default: false },
      email_weekly_digest:   { type: Boolean, default: false },
      push_enabled:          { type: Boolean, default: true },
      push_task_assigned:    { type: Boolean, default: true },
      push_mentions:         { type: Boolean, default: true },
      push_due_reminders:    { type: Boolean, default: true },
    },

    // ── Privacy ───────────────────────────────────────────────────────────
    privacy: {
      show_online_status: { type: Boolean, default: true },
      show_activity_feed: { type: Boolean, default: true },
    },

    // ── Developer: API keys ───────────────────────────────────────────────
    api_keys: { type: [apiKeySchema], default: [] },

    // ── Data export requests ──────────────────────────────────────────────
    data_exports: { type: [dataExportSchema], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.model('UserSettings', userSettingsSchema);
