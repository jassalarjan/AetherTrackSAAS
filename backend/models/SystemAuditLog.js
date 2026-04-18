import mongoose from 'mongoose';

const systemAuditLogSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: false,
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  user_email: {
    type: String,
    default: ''
  },
  user_name: {
    type: String,
    default: ''
  },
  user_role: {
    type: String,
    default: ''
  },
  source: {
    type: String,
    enum: ['frontend', 'backend'],
    required: true,
    index: true
  },
  level: {
    type: String,
    enum: ['error', 'warn', 'critical'],
    default: 'error',
    index: true
  },
  category: {
    type: String,
    default: 'runtime_error',
    index: true
  },
  message: {
    type: String,
    required: true
  },
  request: {
    method: { type: String, default: '' },
    path: { type: String, default: '' },
    status_code: { type: Number, default: null },
    ip: { type: String, default: '' }
  },
  error: {
    name: { type: String, default: '' },
    stack: { type: String, default: '' }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

systemAuditLogSchema.index({ workspaceId: 1, created_at: -1 });
systemAuditLogSchema.index({ source: 1, created_at: -1 });
systemAuditLogSchema.index({ level: 1, created_at: -1 });
systemAuditLogSchema.index({ category: 1, created_at: -1 });

export default mongoose.model('SystemAuditLog', systemAuditLogSchema);
