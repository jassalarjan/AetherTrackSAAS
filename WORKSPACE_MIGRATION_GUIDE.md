# Workspace Migration Guide

## Overview
This document provides guidance on implementing workspace scoping for all route files.

## Pattern for Updating Routes

### General Principles
1. **All queries MUST include workspaceId** from `req.context.workspaceId`
2. **All new documents MUST set workspaceId** when creating
3. **Apply workspace guards** to restricted features
4. **Check workspace limits** before creating new entities

### Standard Query Pattern

#### Before (without workspace scoping):
```javascript
const tasks = await Task.find({ status: 'todo' });
```

#### After (with workspace scoping):
```javascript
const tasks = await Task.find({ 
  workspaceId: req.context.workspaceId,
  status: 'todo' 
});
```

### Standard Create Pattern

#### Before:
```javascript
const task = new Task({
  title,
  description,
  created_by: req.user._id
});
await task.save();
```

#### After:
```javascript
// Check workspace limits first
if (!req.canAddTask()) {
  return res.status(403).json({
    message: 'Task limit reached for your workspace',
    error: 'TASK_LIMIT_REACHED'
  });
}

const task = new Task({
  title,
  description,
  created_by: req.user._id,
  workspaceId: req.context.workspaceId  // ADD THIS
});
await task.save();

// Update workspace usage count
await Workspace.findByIdAndUpdate(
  req.context.workspaceId,
  { $inc: { 'usage.taskCount': 1 } }
);
```

### Standard FindById Pattern

#### Before:
```javascript
const task = await Task.findById(req.params.id);
if (!task) {
  return res.status(404).json({ message: 'Task not found' });
}
```

#### After:
```javascript
const task = await Task.findOne({ 
  _id: req.params.id,
  workspaceId: req.context.workspaceId  // SCOPE TO WORKSPACE
});
if (!task) {
  return res.status(404).json({ message: 'Task not found' });
}
```

### Standard Update Pattern

#### Before:
```javascript
const task = await Task.findById(req.params.id);
task.status = newStatus;
await task.save();
```

#### After:
```javascript
const task = await Task.findOne({
  _id: req.params.id,
  workspaceId: req.context.workspaceId  // SCOPE TO WORKSPACE
});
if (!task) {
  return res.status(404).json({ message: 'Task not found' });
}
task.status = newStatus;
await task.save();
```

### Standard Delete Pattern

#### Before:
```javascript
await Task.findByIdAndDelete(req.params.id);
```

#### After:
```javascript
const result = await Task.findOneAndDelete({
  _id: req.params.id,
  workspaceId: req.context.workspaceId  // SCOPE TO WORKSPACE
});
if (!result) {
  return res.status(404).json({ message: 'Task not found' });
}

// Update workspace usage count
await Workspace.findByIdAndUpdate(
  req.context.workspaceId,
  { $inc: { 'usage.taskCount': -1 } }
);
```

## Route-Specific Updates

### tasks.js
- **CREATE**: Add `workspaceId` and check task limit
- **GET ALL**: Scope by `workspaceId`
- **GET BY ID**: Use `findOne` with `workspaceId`
- **UPDATE**: Scope by `workspaceId`
- **DELETE**: Scope by `workspaceId` and decrement usage

### users.js
- **CREATE**: Add `workspaceId`, check user limit, apply `checkUserLimit` middleware
- **BULK IMPORT**: Apply `requireBulkImport` guard middleware
- **BULK DELETE**: Apply `requireBulkImport` guard middleware
- **GET ALL**: Scope by `workspaceId`
- **UPDATE**: Scope by `workspaceId`
- **DELETE**: Scope by `workspaceId` and decrement usage

### teams.js
- **CREATE**: Add `workspaceId`, check team limit
- **GET ALL**: Scope by `workspaceId`
- **UPDATE**: Scope by `workspaceId`
- **DELETE**: Scope by `workspaceId` and decrement usage

### notifications.js
- **CREATE**: Add `workspaceId`
- **GET ALL**: Scope by `workspaceId` and `user_id`
- **UPDATE**: Scope by `workspaceId`

### changelog.js
- **ALL ROUTES**: Apply `requireAuditLogs` guard middleware
- **CREATE**: Add `workspaceId` (already done in changeLogService.js)
- **GET ALL**: Scope by `workspaceId`

## Applying Workspace Guards

### For Bulk User Import (users.js):
```javascript
import { requireBulkImport, checkUserLimit } from '../middleware/workspaceGuard.js';

// Bulk import endpoint
router.post('/bulk-import', 
  authenticate, 
  requireBulkImport,  // <-- ADD THIS
  async (req, res) => {
    // ... implementation
  }
);
```

### For Audit Logs (changelog.js):
```javascript
import { requireAuditLogs } from '../middleware/workspaceGuard.js';

// Apply to ALL routes
router.use(requireAuditLogs);

// Then define your routes
router.get('/', authenticate, async (req, res) => {
  // ...
});
```

## Workspace Model Updates

### Updating Usage Counts

After creating a document:
```javascript
await Workspace.findByIdAndUpdate(
  req.context.workspaceId,
  { $inc: { 'usage.userCount': 1 } }
);
```

After deleting a document:
```javascript
await Workspace.findByIdAndUpdate(
  req.context.workspaceId,
  { $inc: { 'usage.userCount': -1 } }
);
```

## Testing Workspace Scoping

### Test Cases:
1. **Isolation Test**: Create two workspaces, ensure data doesn't leak between them
2. **Limit Test**: Test COMMUNITY workspace limits (users, tasks, teams)
3. **Feature Test**: Test that COMMUNITY workspaces cannot access restricted features
4. **Migration Test**: Verify all existing data is assigned to CORE workspace

### Quick Test Queries:
```javascript
// Check if all users have workspaceId
await User.countDocuments({ workspaceId: { $exists: false } });

// Check if all tasks have workspaceId
await Task.countDocuments({ workspaceId: { $exists: false } });

// Verify workspace isolation
const workspace1Tasks = await Task.find({ workspaceId: workspace1Id });
const workspace2Tasks = await Task.find({ workspaceId: workspace2Id });
// Should be completely separate
```

## Critical Reminders

1. ✅ **ALWAYS** scope queries by `workspaceId`
2. ✅ **ALWAYS** set `workspaceId` when creating documents
3. ✅ **ALWAYS** use `findOne` instead of `findById` for workspace scoping
4. ✅ **ALWAYS** check workspace limits before creating entities
5. ✅ **ALWAYS** update workspace usage counts
6. ✅ **ALWAYS** apply appropriate workspace guards
7. ⚠️ **NEVER** expose data from other workspaces
8. ⚠️ **NEVER** skip workspace validation

## Next Steps

1. Run migration script: `npm run migrate:workspaces`
2. Update each route file following the patterns above
3. Test thoroughly before deployment
4. Update frontend to handle workspace context
5. Update documentation for end users
