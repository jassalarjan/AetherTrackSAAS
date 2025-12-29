# 🚀 TaskFlow Workspace Quick Reference

## For Backend Developers

### Writing Workspace-Aware Queries

#### ✅ DO: Always scope by workspace
```javascript
// Query
const tasks = await Task.find({ 
  status: 'todo',
  workspaceId: req.context.workspaceId 
});

// Get by ID
const task = await Task.findOne({ 
  _id: taskId, 
  workspaceId: req.context.workspaceId 
});

// Create
const task = new Task({
  ...data,
  workspaceId: req.context.workspaceId
});

// Update
await Task.findOneAndUpdate(
  { _id: id, workspaceId: req.context.workspaceId },
  updates
);

// Delete
await Task.findOneAndDelete({ 
  _id: id, 
  workspaceId: req.context.workspaceId 
});
```

#### ❌ DON'T: Use these patterns
```javascript
// ❌ No workspace scoping
const tasks = await Task.find({ status: 'todo' });

// ❌ findById without workspace check
const task = await Task.findById(taskId);

// ❌ Missing workspaceId on creation
const task = new Task({ title, description });
```

### Middleware Order
```javascript
router.post('/',
  authenticate,           // 1. Verify JWT
  checkRole(['admin']),   // 2. Check user role
  checkTaskLimit,         // 3. Check workspace limits
  ...requireFeature,      // 4. Check feature access (optional)
  async (req, res) => {}  // 5. Handler with req.context available
);
```

### Using req.context
```javascript
router.post('/', authenticate, async (req, res) => {
  // Available context
  const workspaceId = req.context.workspaceId;
  const workspaceType = req.context.workspaceType; // 'CORE' or 'COMMUNITY'
  const workspace = req.context.workspace; // Full document
  
  // Helper methods
  if (req.context.isCoreWorkspace()) {
    // CORE-only logic
  }
  
  if (req.context.hasFeature('bulkUserImport')) {
    // Feature-gated logic
  }
  
  if (!req.context.canAddTask()) {
    return res.status(403).json({ 
      message: 'Task limit reached',
      limit: workspace.limits.maxTasks,
      current: workspace.usage.tasks
    });
  }
});
```

### Guard Middleware
```javascript
import { 
  requireCoreWorkspace,
  requireBulkImport,
  requireAuditLogs,
  checkUserLimit,
  checkTaskLimit,
  checkTeamLimit
} from '../middleware/workspaceGuard.js';

// CORE-only endpoint
router.get('/advanced', authenticate, requireCoreWorkspace, handler);

// Bulk import (CORE only)
router.post('/bulk', authenticate, ...requireBulkImport, handler);

// Check limits before creation
router.post('/', authenticate, checkTaskLimit, handler);
```

### Usage Tracking
```javascript
// After creating a resource
await Workspace.findByIdAndUpdate(req.context.workspaceId, {
  $inc: { 'usage.tasks': 1 }
});

// After deleting a resource
await Workspace.findByIdAndUpdate(req.context.workspaceId, {
  $inc: { 'usage.tasks': -1 }
});
```

### ChangeLog Integration
```javascript
import { logChange } from '../utils/changeLogService.js';

await logChange({
  event_type: 'task_created',
  action: 'Created task',
  description: `Task "${task.title}" created`,
  performed_by: req.user._id,
  target_type: 'task',
  target_id: task._id,
  metadata: { priority: task.priority },
  workspaceId: req.context.workspaceId  // ⚠️ Required!
});
```

## For Frontend Developers

### Using WorkspaceContext
```javascript
import { useWorkspace } from '../context/WorkspaceContext';

function MyComponent() {
  const { 
    workspace,
    isCore,
    isCommunity,
    hasFeature,
    canAddUser,
    canAddTask,
    canAddTeam,
    getRemainingCapacity,
    isApproachingLimit
  } = useWorkspace();
  
  // Check workspace type
  if (isCore()) {
    return <AdvancedFeatures />;
  }
  
  // Check feature access
  if (hasFeature('bulkUserImport')) {
    return <BulkImportButton />;
  }
  
  // Check limits
  const canCreate = canAddTask();
  const remaining = getRemainingCapacity('tasks');
  const warning = isApproachingLimit('tasks', 0.8); // 80% threshold
  
  return (
    <div>
      {warning && (
        <Alert>
          You've used {workspace.usage.tasks} of {workspace.limits.maxTasks} tasks
        </Alert>
      )}
      
      <Button disabled={!canCreate}>
        Create Task {remaining && `(${remaining} left)`}
      </Button>
    </div>
  );
}
```

### Feature Guards
```javascript
// Conditional rendering
{hasFeature('auditLogs') && (
  <Link to="/changelog">Audit Logs</Link>
)}

// Conditional routes
{isCore() && (
  <Route path="/advanced" element={<AdvancedAnalytics />} />
)}

// Workspace badge
<WorkspaceBadge type={workspace.type} />
```

### Limit Warnings
```javascript
function LimitWarning({ resourceType }) {
  const { workspace, getRemainingCapacity, isApproachingLimit } = useWorkspace();
  
  const remaining = getRemainingCapacity(resourceType);
  const isWarning = isApproachingLimit(resourceType, 0.8);
  const isCritical = isApproachingLimit(resourceType, 0.95);
  
  if (!remaining) return null; // Unlimited (CORE)
  
  return (
    <Alert severity={isCritical ? 'error' : isWarning ? 'warning' : 'info'}>
      {workspace.usage[resourceType]} / {workspace.limits[`max${capitalize(resourceType)}`]} 
      {resourceType} used ({remaining} remaining)
    </Alert>
  );
}
```

## API Reference

### Auth Endpoints

#### Register Community Workspace
```http
POST /api/auth/register-community
Content-Type: application/json

{
  "workspace_name": "My Company",
  "full_name": "John Doe",
  "email": "john@company.com",
  "password": "securepass123"
}

Response:
{
  "message": "Workspace and admin user created successfully",
  "token": "jwt_token_here",
  "user": { ... },
  "workspace": {
    "_id": "...",
    "name": "My Company",
    "type": "COMMUNITY",
    "limits": { "maxUsers": 10, "maxTasks": 100, "maxTeams": 3 },
    "usage": { "users": 1, "tasks": 0, "teams": 0 },
    "features": { "bulkUserImport": false, "auditLogs": false, ... }
  }
}
```

#### Login (Returns Workspace)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@company.com",
  "password": "securepass123"
}

Response:
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": { ... },
  "workspace": { ... }  // NEW: Workspace info included
}
```

### Error Responses

#### Limit Reached
```json
{
  "message": "Task limit reached",
  "limit": 100,
  "current": 100
}
```

#### Feature Restricted
```json
{
  "message": "Bulk import is not available for COMMUNITY workspaces"
}
```

#### Workspace Not Found
```json
{
  "message": "User not associated with any workspace"
}
```

## Workspace Types

### CORE (Enterprise)
```javascript
{
  type: 'CORE',
  limits: {
    maxUsers: null,    // Unlimited
    maxTasks: null,    // Unlimited
    maxTeams: null     // Unlimited
  },
  features: {
    bulkUserImport: true,
    auditLogs: true,
    advancedAutomation: true,
    customBranding: true
  }
}
```

### COMMUNITY (Free)
```javascript
{
  type: 'COMMUNITY',
  limits: {
    maxUsers: 10,
    maxTasks: 100,
    maxTeams: 3
  },
  features: {
    bulkUserImport: false,
    auditLogs: false,
    advancedAutomation: false,
    customBranding: false
  }
}
```

## Testing

### Test Workspace Creation
```javascript
// Create test COMMUNITY workspace
const response = await fetch('/api/auth/register-community', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspace_name: 'Test Company',
    full_name: 'Test User',
    email: 'test@test.com',
    password: 'testpass123'
  })
});
```

### Test Limits
```javascript
// Create users until limit
for (let i = 0; i < 11; i++) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      full_name: `User ${i}`,
      email: `user${i}@test.com`,
      role: 'team_member'
    })
  });
  
  if (i === 10) {
    // Should fail with 403
    expect(response.status).toBe(403);
  }
}
```

### Test Feature Restrictions
```javascript
// Try bulk import from COMMUNITY workspace
const response = await fetch('/api/users/bulk-import/json', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${communityToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ users: [...] })
});

expect(response.status).toBe(403);
expect(response.json()).toContain('not available for COMMUNITY');
```

## Debugging

### Check Workspace Assignment
```javascript
// In route handler
console.log('User workspace:', req.user.workspaceId);
console.log('Context workspace:', req.context.workspaceId);
console.log('Workspace type:', req.context.workspaceType);
```

### Verify Data Isolation
```javascript
// Should only return workspace-scoped data
const tasks = await Task.find({ workspaceId: req.context.workspaceId });
console.log(`Found ${tasks.length} tasks for workspace ${req.context.workspace.name}`);
```

### Check Usage Tracking
```javascript
const workspace = await Workspace.findById(workspaceId);
console.log('Usage:', workspace.usage);
console.log('Limits:', workspace.limits);
console.log('Can add user:', workspace.canAddUser());
```

## Migration

### Run Migration Script
```bash
npm run migrate:workspaces
```

### Verify Migration
```javascript
// Check all users have workspace
const usersWithoutWorkspace = await User.countDocuments({ 
  workspaceId: { $exists: false } 
});
console.log('Users without workspace:', usersWithoutWorkspace); // Should be 0
```

---

**Quick Links:**
- [Full Summary](./FINAL_WORKSPACE_SUMMARY.md)
- [Migration Guide](./WORKSPACE_MIGRATION_GUIDE.md)
- [Implementation Status](./WORKSPACE_IMPLEMENTATION_STATUS.md)
