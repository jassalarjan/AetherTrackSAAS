# System Administrator Access - Multi-Workspace Support

## Overview
TaskFlow now supports **System Administrators** - super-users who can operate without being tied to a specific workspace and have system-wide access across all workspaces.

## System Admin Privileges

### What is a System Admin?
- An `admin` role user **without a workspaceId**
- Has unrestricted access to all data across all workspaces
- Can create, view, update, and delete resources in any workspace
- Bypasses all workspace-based restrictions and limits

### Key Differences

| Feature | Regular Admin (with workspace) | System Admin (no workspace) |
|---------|-------------------------------|----------------------------|
| Workspace Assignment | ✅ Required | ❌ Not required |
| Data Visibility | Single workspace only | All workspaces |
| Feature Restrictions | Respects workspace type | All features enabled |
| Usage Limits | Respects workspace limits | No limits |
| Workspace Context | Scoped to their workspace | System-wide (`SYSTEM` type) |

## Technical Implementation

### User Model
```javascript
workspaceId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Workspace',
  required: false,  // Optional - admins can exist without workspace
  index: true
}
```

### Workspace Context Middleware
The `workspaceContext` middleware now handles system admins:

```javascript
if (!user.workspaceId && user.role === 'admin') {
  // System admin - full access
  req.context = {
    workspaceId: null,
    workspaceType: 'SYSTEM',
    workspaceName: 'System Administrator',
    isSystemAdmin: true,
    // All privilege checks return true
    isCoreWorkspace: () => true,
    hasFeature: () => true,
    canAddUser: () => true,
    canAddTask: () => true,
    canAddTeam: () => true
  };
}
```

### Route Behavior

#### Tasks Routes
```javascript
// GET all tasks
const query = req.context.isSystemAdmin 
  ? {}  // No workspace filter - see all
  : { workspaceId: req.context.workspaceId };

// GET task by ID
const taskQuery = req.context.isSystemAdmin
  ? { _id: taskId }
  : { _id: taskId, workspaceId: req.context.workspaceId };

// CREATE task
const task = new Task({
  ...data,
  workspaceId: req.context.workspaceId || null  // null for system admins
});

// Usage tracking skipped for system admins
if (req.context.workspaceId) {
  await Workspace.findByIdAndUpdate(...);
}
```

## Creating a System Admin

### Option 1: Seed Script (Default Admin)
The default admin created by `npm run seed:admin` is now a system admin (no workspace):

```bash
cd backend
npm run seed:admin
```

Creates:
- **Email**: `admin@taskflow.com`
- **Password**: `Admin@123`
- **Role**: `admin`
- **workspaceId**: `null` (system admin)

### Option 2: Manual Creation (MongoDB)
```javascript
// Create system admin directly in database
db.users.insertOne({
  full_name: "System Administrator",
  email: "sysadmin@company.com",
  password: "hashed_password_here",
  role: "admin",
  workspaceId: null,  // No workspace = system admin
  created_at: new Date()
});
```

### Option 3: Update Existing Admin
```javascript
// Remove workspace from existing admin to make them system admin
db.users.updateOne(
  { email: "admin@taskflow.com" },
  { $unset: { workspaceId: "" } }
);
```

## Use Cases

### 1. Initial System Setup
- System admin logs in without workspace
- Creates first CORE workspace
- Creates workspace-specific admins
- Assigns users to workspaces

### 2. Multi-Workspace Management
- System admin oversees all workspaces
- Can troubleshoot issues across workspaces
- Can view aggregated analytics
- Can manage workspace configurations

### 3. Support & Troubleshooting
- System admin helps users in any workspace
- Can access and debug any data
- Can perform maintenance tasks
- Can migrate data between workspaces

### 4. Super-User Operations
- Create/delete/modify any workspace
- Access audit logs across all workspaces
- Generate system-wide reports
- Perform bulk operations globally

## Authentication Flow

### System Admin Login
```javascript
POST /api/auth/login
{
  "email": "admin@taskflow.com",
  "password": "Admin@123"
}

Response:
{
  "token": "jwt_token",
  "user": {
    "id": "...",
    "email": "admin@taskflow.com",
    "role": "admin",
    "workspaceId": null  // System admin indicator
  },
  "workspace": null  // No workspace for system admin
}
```

### Regular Admin Login
```javascript
POST /api/auth/login
{
  "email": "workspace-admin@company.com",
  "password": "password"
}

Response:
{
  "token": "jwt_token",
  "user": {
    "id": "...",
    "email": "workspace-admin@company.com",
    "role": "admin",
    "workspaceId": "workspace_id_here"
  },
  "workspace": {
    "_id": "workspace_id_here",
    "name": "My Company",
    "type": "CORE",
    ...
  }
}
```

## Security Considerations

### ⚠️ System Admin Risks
1. **Unrestricted Access** - Can see and modify ALL data
2. **No Audit Trail per Workspace** - Actions span multiple workspaces
3. **Privilege Escalation** - Highest level of access

### 🔒 Best Practices

#### 1. Limit System Admin Accounts
```javascript
// Recommended: Only 1-2 system admins maximum
// For normal operations, use workspace-specific admins
```

#### 2. Audit System Admin Actions
```javascript
// Log all system admin actions with special flag
await logChange({
  ...logData,
  performedBy: req.user._id,
  isSystemAdmin: req.context.isSystemAdmin,
  affectedWorkspace: affectedWorkspaceId
});
```

#### 3. Require Strong Authentication
```javascript
// Enforce:
// - Strong passwords
// - 2FA (recommended)
// - IP restrictions
// - Session timeouts
```

#### 4. Regular Access Reviews
```javascript
// Periodically verify system admin list
db.users.find({ 
  role: 'admin', 
  workspaceId: null 
});
```

## Migration Considerations

### Existing Admins
After updating the code, existing admins with workspaces continue to function normally:
- They remain workspace-specific admins
- They see only their workspace data
- No behavior change for them

### Converting to System Admin
To convert a workspace admin to system admin:
```javascript
// Remove workspace association
db.users.updateOne(
  { _id: ObjectId("admin_user_id") },
  { $unset: { workspaceId: "" } }
);
```

To convert system admin to workspace admin:
```javascript
// Add workspace association
db.users.updateOne(
  { _id: ObjectId("admin_user_id") },
  { $set: { workspaceId: ObjectId("workspace_id") } }
);
```

## Frontend Implications

### Workspace Context
```javascript
// Frontend should handle null workspace
const { workspace } = useWorkspace();

if (!workspace) {
  // System admin view
  return <SystemAdminDashboard />;
} else {
  // Regular workspace view
  return <WorkspaceDashboard workspace={workspace} />;
}
```

### Navigation
```javascript
// Show workspace selector for system admins
{user.role === 'admin' && !user.workspaceId && (
  <WorkspaceSwitcher />
)}
```

### Data Display
```javascript
// System admins see workspace column in all tables
{isSystemAdmin && (
  <th>Workspace</th>
)}
```

## API Response Changes

### Task GET Response (System Admin)
```json
{
  "tasks": [
    {
      "_id": "task1",
      "title": "Task 1",
      "workspaceId": "workspace_a",
      "workspace": {
        "name": "Company A",
        "type": "CORE"
      },
      ...
    },
    {
      "_id": "task2",
      "title": "Task 2",
      "workspaceId": "workspace_b",
      "workspace": {
        "name": "Company B",
        "type": "COMMUNITY"
      },
      ...
    }
  ]
}
```

### Task GET Response (Regular Admin)
```json
{
  "tasks": [
    {
      "_id": "task1",
      "title": "Task 1",
      "workspaceId": "workspace_a",
      ...
    }
  ]
}
```

## Testing System Admin Access

### 1. Login as System Admin
```bash
# Use default system admin credentials
Email: admin@taskflow.com
Password: Admin@123
```

### 2. Verify System-Wide Access
```javascript
// Should see tasks from all workspaces
GET /api/tasks
→ Returns tasks from ALL workspaces

// Should create tasks without workspace
POST /api/tasks
→ Creates task with workspaceId: null

// Should access all users
GET /api/users
→ Returns users from ALL workspaces
```

### 3. Test Workspace Admin
```javascript
// Create workspace-specific admin
POST /api/users
{
  "full_name": "Workspace Admin",
  "email": "wadmin@company.com",
  "role": "admin",
  "workspaceId": "workspace_id_here"
}

// Login and verify restricted access
→ Can only see data from their workspace
```

## Troubleshooting

### System Admin Can't Login
**Issue**: Login fails with "User not associated with workspace"

**Solution**: Verify middleware updates:
```javascript
// Check workspaceContext.js has system admin handling
if (!user.workspaceId && user.role === 'admin') {
  // System admin path
}
```

### System Admin Sees No Data
**Issue**: Empty results despite data existing

**Solution**: Check route queries:
```javascript
// Ensure routes check isSystemAdmin
const query = req.context.isSystemAdmin ? {} : { workspaceId: ... };
```

### Workspace Count Issues
**Issue**: Usage tracking incorrect for system admin actions

**Solution**: Verify workspace updates are skipped:
```javascript
if (req.context.workspaceId) {
  // Only update for workspace-scoped operations
  await Workspace.findByIdAndUpdate(...);
}
```

## Recommendations

### Development
- ✅ Use system admin for testing across workspaces
- ✅ Create workspace-specific admins for each test workspace
- ✅ Test both system admin and workspace admin flows

### Staging
- ✅ Have one system admin for troubleshooting
- ✅ Primary usage through workspace-specific admins
- ✅ Document system admin credentials securely

### Production
- ⚠️ Limit to 1-2 system admins (emergency access only)
- ✅ Use workspace-specific admins for daily operations
- ✅ Enable audit logging for system admin actions
- ✅ Require 2FA for system admin accounts
- ✅ Regular access reviews

---

**System Admin Access is a powerful feature - use responsibly!**

**Security Priority**: Limit system admin accounts to absolute minimum necessary.
