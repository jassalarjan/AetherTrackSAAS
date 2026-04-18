import mongoose from 'mongoose';

const apiRequestLogSchema = new mongoose.Schema({
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
  method: {
    type: String,
    required: true,
    index: true
  },
  path: {
    type: String,
    required: true
  },
  module: {
    type: String,
    default: 'system',
    index: true
  },
  operation: {
    type: String,
    enum: ['create', 'read', 'update', 'delete'],
    required: true
  },
  outcome: {
    type: String,
    enum: ['success', 'failed'],
    required: true,
    index: true
  },
  status_code: {
    type: Number,
    required: true,
    index: true
  },
  target_type: {
    type: String,
    default: 'system'
  },
  target_id: {
    type: String,
    default: ''
  },
  target_name: {
    type: String,
    default: ''
  },
  ip: {
    type: String,
    default: ''
  },
  query: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  params: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  body_keys: {
    type: [String],
    default: []
  },
  response_keys: {
    type: [String],
    default: []
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

apiRequestLogSchema.index({ workspaceId: 1, created_at: -1 });
apiRequestLogSchema.index({ module: 1, created_at: -1 });
apiRequestLogSchema.index({ method: 1, created_at: -1 });
apiRequestLogSchema.index({ outcome: 1, created_at: -1 });
apiRequestLogSchema.index({ target_type: 1, target_id: 1 });

export default mongoose.model('ApiRequestLog', apiRequestLogSchema);
