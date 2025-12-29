import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    validate: {
      validator: function(value) {
        // Prevent creating team named "Admin"
        return value.toLowerCase() !== 'admin';
      },
      message: 'Team name "Admin" is reserved for super users only'
    }
  },
  hr_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'HR is required']
  },
  lead_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Team lead is required']
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pinned: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 0
  },
  // WORKSPACE SUPPORT: All teams belong to a workspace
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// WORKSPACE SUPPORT: Indexes for workspace-scoped queries
teamSchema.index({ workspaceId: 1, name: 1 });
teamSchema.index({ workspaceId: 1, lead_id: 1 });

export default mongoose.model('Team', teamSchema);