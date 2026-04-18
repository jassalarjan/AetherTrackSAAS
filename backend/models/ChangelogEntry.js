import mongoose from 'mongoose';

const changelogEntrySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  entityType: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  entityName: {
    type: String,
    default: ''
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  diff: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

changelogEntrySchema.index({ tenantId: 1, createdAt: -1 });
changelogEntrySchema.index({ tenantId: 1, entityType: 1, action: 1, createdAt: -1 });

// Post-save hook: trigger matching automations (fire-and-forget, non-blocking)
changelogEntrySchema.post('save', function (doc) {
  setImmediate(async () => {
    try {
      const { handleChangelogAutomation } = await import('../services/automationRunner.js');
      await handleChangelogAutomation(doc);
    } catch (error) {
      console.error('Error processing changelog automation:', error?.message);
    }
  });
});

export default mongoose.model('ChangelogEntry', changelogEntrySchema);
