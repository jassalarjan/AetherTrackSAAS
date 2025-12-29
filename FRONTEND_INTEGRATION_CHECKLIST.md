# Frontend Integration Checklist

## Overview
Backend workspace conversion is 100% complete. This checklist guides the remaining frontend integration work.

## ✅ Completed Frontend Components

### Context & Registration
- [x] WorkspaceContext.jsx - Complete workspace state management
- [x] CommunityRegister.jsx - Registration page for COMMUNITY workspaces

## ⏳ Remaining Frontend Tasks

### 1. App.jsx Integration
**File**: `frontend/src/App.jsx`

**Changes Required**:
```javascript
// Add imports
import { WorkspaceProvider } from './context/WorkspaceContext';
import CommunityRegister from './pages/CommunityRegister';

// Wrap application
<AuthProvider>
  <WorkspaceProvider>  {/* NEW */}
    <Routes>
      <Route path="/register-community" element={<CommunityRegister />} />  {/* NEW */}
      {/* ... existing routes ... */}
    </Routes>
  </WorkspaceProvider>
</AuthProvider>
```

**Testing**:
- [ ] Application renders without errors
- [ ] WorkspaceProvider wraps all routes
- [ ] /register-community route accessible

---

### 2. Login.jsx Updates
**File**: `frontend/src/pages/Login.jsx`

**Changes Required**:
```javascript
import { useWorkspace } from '../context/WorkspaceContext';

function Login() {
  const { updateWorkspace } = useWorkspace();
  
  const handleLogin = async (email, password) => {
    const response = await loginAPI(email, password);
    // response now includes workspace data
    
    // Store workspace info
    updateWorkspace(response.workspace);  // NEW
    
    // Existing login logic...
  };
  
  return (
    <div>
      {/* Existing login form */}
      
      {/* NEW: Add link to community registration */}
      <div className="mt-4 text-center">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <Link to="/register-community" className="text-primary-600 hover:underline">
            Register for free
          </Link>
        </p>
      </div>
    </div>
  );
}
```

**Testing**:
- [ ] Login stores workspace info
- [ ] Workspace context populated after login
- [ ] Link to community registration visible
- [ ] Console shows workspace data after login

---

### 3. Dashboard.jsx Updates
**File**: `frontend/src/pages/Dashboard.jsx`

**Changes Required**:
```javascript
import { useWorkspace } from '../context/WorkspaceContext';
import WorkspaceBadge from '../components/WorkspaceBadge';

function Dashboard() {
  const { workspace, isCore, hasFeature } = useWorkspace();
  
  return (
    <div>
      {/* NEW: Workspace badge */}
      <div className="mb-4">
        <WorkspaceBadge type={workspace.type} name={workspace.name} />
      </div>
      
      {/* Existing dashboard cards */}
      
      {/* NEW: Conditionally show advanced analytics */}
      {hasFeature('advancedAutomation') && (
        <AdvancedAnalyticsCard />
      )}
      
      {/* NEW: Hide CORE-only features for COMMUNITY */}
      {hasFeature('customBranding') && (
        <BrandingSettings />
      )}
    </div>
  );
}
```

**Component to Create**: `frontend/src/components/WorkspaceBadge.jsx`
```javascript
export default function WorkspaceBadge({ type, name }) {
  const bgColor = type === 'CORE' ? 'bg-purple-100' : 'bg-blue-100';
  const textColor = type === 'CORE' ? 'text-purple-800' : 'text-blue-800';
  
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full ${bgColor} ${textColor}`}>
      <span className="text-sm font-medium">{name}</span>
      <span className="ml-2 text-xs">({type})</span>
    </div>
  );
}
```

**Testing**:
- [ ] Workspace badge displays correctly
- [ ] CORE users see all features
- [ ] COMMUNITY users don't see restricted features
- [ ] Badge shows correct workspace name and type

---

### 4. UserManagement.jsx Updates
**File**: `frontend/src/pages/UserManagement.jsx`

**Changes Required**:
```javascript
import { useWorkspace } from '../context/WorkspaceContext';
import LimitWarning from '../components/LimitWarning';

function UserManagement() {
  const { 
    workspace, 
    hasFeature, 
    canAddUser,
    getRemainingCapacity,
    isApproachingLimit 
  } = useWorkspace();
  
  return (
    <div>
      {/* NEW: Limit warning */}
      <LimitWarning resourceType="users" />
      
      {/* Existing user list */}
      
      {/* NEW: Conditionally show bulk import */}
      {hasFeature('bulkUserImport') && (
        <BulkImportButton />
      )}
      
      {/* NEW: Disable create button if limit reached */}
      <Button 
        onClick={handleCreateUser}
        disabled={!canAddUser()}
      >
        Create User 
        {workspace.limits?.maxUsers && (
          <span className="ml-2">
            ({getRemainingCapacity('users')} left)
          </span>
        )}
      </Button>
    </div>
  );
}
```

**Component to Create**: `frontend/src/components/LimitWarning.jsx`
```javascript
import { useWorkspace } from '../context/WorkspaceContext';

export default function LimitWarning({ resourceType }) {
  const { workspace, getRemainingCapacity, isApproachingLimit } = useWorkspace();
  
  const remaining = getRemainingCapacity(resourceType);
  const isWarning = isApproachingLimit(resourceType, 0.8);
  const isCritical = isApproachingLimit(resourceType, 0.95);
  
  if (!remaining) return null; // Unlimited (CORE)
  
  const resourceLabel = {
    users: 'users',
    tasks: 'tasks',
    teams: 'teams'
  }[resourceType];
  
  const maxKey = `max${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`;
  const max = workspace.limits?.[maxKey];
  const current = workspace.usage?.[resourceType];
  
  if (!isWarning) return null;
  
  const alertClass = isCritical 
    ? 'bg-red-50 border-red-200 text-red-800'
    : 'bg-yellow-50 border-yellow-200 text-yellow-800';
  
  return (
    <div className={`mb-4 p-4 border rounded-lg ${alertClass}`}>
      <div className="flex items-center">
        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
        </svg>
        <span className="font-medium">
          {isCritical ? 'Critical: ' : 'Warning: '}
          You've used {current} of {max} {resourceLabel}
        </span>
      </div>
      <p className="mt-1 text-sm">
        {remaining} {resourceLabel} remaining. 
        {isCritical && ' Upgrade to CORE for unlimited access.'}
      </p>
    </div>
  );
}
```

**Testing**:
- [ ] Limit warning appears when approaching limit
- [ ] Critical alert at 95%+ usage
- [ ] Warning alert at 80%+ usage
- [ ] Bulk import button hidden for COMMUNITY
- [ ] Create user button disabled when limit reached
- [ ] Remaining count displays correctly

---

### 5. ChangeLog.jsx Updates
**File**: `frontend/src/pages/ChangeLog.jsx`

**Changes Required**:
```javascript
import { useWorkspace } from '../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function ChangeLog() {
  const { hasFeature } = useWorkspace();
  const navigate = useNavigate();
  
  // NEW: Redirect if no access
  useEffect(() => {
    if (!hasFeature('auditLogs')) {
      navigate('/dashboard');
    }
  }, [hasFeature, navigate]);
  
  if (!hasFeature('auditLogs')) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Audit Logs Unavailable
        </h2>
        <p className="text-gray-600 mb-4">
          Audit logs are only available for CORE workspaces.
        </p>
        <Button onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      {/* Existing changelog content */}
    </div>
  );
}
```

**Testing**:
- [ ] CORE users can access changelog
- [ ] COMMUNITY users redirected to dashboard
- [ ] API returns 403 for COMMUNITY users
- [ ] Upgrade message shown for COMMUNITY

---

### 6. Navbar.jsx Updates
**File**: `frontend/src/components/Navbar.jsx`

**Changes Required**:
```javascript
import { useWorkspace } from '../context/WorkspaceContext';

function Navbar() {
  const { workspace, hasFeature } = useWorkspace();
  
  return (
    <nav>
      {/* Existing nav items */}
      
      {/* NEW: Conditionally show changelog link */}
      {hasFeature('auditLogs') && (
        <NavLink to="/changelog">
          Audit Logs
        </NavLink>
      )}
      
      {/* NEW: Workspace info in user menu */}
      <div className="ml-auto">
        <span className="text-sm text-gray-600">
          {workspace.name} ({workspace.type})
        </span>
      </div>
    </nav>
  );
}
```

**Testing**:
- [ ] Changelog link visible for CORE
- [ ] Changelog link hidden for COMMUNITY
- [ ] Workspace name displays in navbar
- [ ] Workspace type badge visible

---

### 7. TaskList.jsx Updates (Optional Enhancement)
**File**: `frontend/src/components/TaskList.jsx`

**Changes Required**:
```javascript
import { useWorkspace } from '../context/WorkspaceContext';
import LimitWarning from './LimitWarning';

function TaskList() {
  const { canAddTask, getRemainingCapacity } = useWorkspace();
  
  return (
    <div>
      {/* NEW: Task limit warning */}
      <LimitWarning resourceType="tasks" />
      
      {/* Existing task list */}
      
      {/* NEW: Disable create button if limit reached */}
      <Button 
        onClick={handleCreateTask}
        disabled={!canAddTask()}
      >
        Create Task
        {getRemainingCapacity('tasks') && (
          <span className="ml-2">
            ({getRemainingCapacity('tasks')} left)
          </span>
        )}
      </Button>
    </div>
  );
}
```

**Testing**:
- [ ] Task limit warning appears
- [ ] Create button disabled when limit reached
- [ ] Remaining count accurate

---

### 8. TeamManagement.jsx Updates (Optional Enhancement)
**File**: `frontend/src/pages/TeamManagement.jsx`

**Changes Required**:
```javascript
import { useWorkspace } from '../context/WorkspaceContext';
import LimitWarning from '../components/LimitWarning';

function TeamManagement() {
  const { canAddTeam, getRemainingCapacity } = useWorkspace();
  
  return (
    <div>
      {/* NEW: Team limit warning */}
      <LimitWarning resourceType="teams" />
      
      {/* Existing team list */}
      
      {/* NEW: Disable create button if limit reached */}
      <Button 
        onClick={handleCreateTeam}
        disabled={!canAddTeam()}
      >
        Create Team
        {getRemainingCapacity('teams') && (
          <span className="ml-2">
            ({getRemainingCapacity('teams')} left)
          </span>
        )}
      </Button>
    </div>
  );
}
```

**Testing**:
- [ ] Team limit warning appears
- [ ] Create button disabled when limit reached
- [ ] Remaining count accurate

---

## Summary of Files to Create/Modify

### Create New Files (2):
1. ✅ `frontend/src/context/WorkspaceContext.jsx` (Already created)
2. ✅ `frontend/src/pages/CommunityRegister.jsx` (Already created)
3. ⏳ `frontend/src/components/WorkspaceBadge.jsx`
4. ⏳ `frontend/src/components/LimitWarning.jsx`

### Modify Existing Files (6-8):
1. ⏳ `frontend/src/App.jsx` - Add WorkspaceProvider and route
2. ⏳ `frontend/src/pages/Login.jsx` - Store workspace info, add registration link
3. ⏳ `frontend/src/pages/Dashboard.jsx` - Add badge, feature guards
4. ⏳ `frontend/src/pages/UserManagement.jsx` - Add limits, hide bulk import
5. ⏳ `frontend/src/pages/ChangeLog.jsx` - Add access control
6. ⏳ `frontend/src/components/Navbar.jsx` - Conditional menu, workspace badge
7. ⏳ `frontend/src/components/TaskList.jsx` (Optional)
8. ⏳ `frontend/src/pages/TeamManagement.jsx` (Optional)

## Testing Strategy

### Unit Tests
```javascript
// Test WorkspaceContext
describe('WorkspaceContext', () => {
  it('should provide workspace data', () => {
    // Test context provider
  });
  
  it('should check feature access correctly', () => {
    // Test hasFeature()
  });
  
  it('should calculate remaining capacity', () => {
    // Test getRemainingCapacity()
  });
});
```

### Integration Tests
```javascript
// Test feature guards
describe('Feature Guards', () => {
  it('should hide bulk import for COMMUNITY', async () => {
    render(<UserManagement />, { workspace: communityWorkspace });
    expect(screen.queryByText('Bulk Import')).not.toBeInTheDocument();
  });
  
  it('should show bulk import for CORE', async () => {
    render(<UserManagement />, { workspace: coreWorkspace });
    expect(screen.getByText('Bulk Import')).toBeInTheDocument();
  });
});

// Test limits
describe('Limit Enforcement', () => {
  it('should disable create button when limit reached', () => {
    const workspace = { 
      usage: { users: 10 }, 
      limits: { maxUsers: 10 } 
    };
    render(<UserManagement />, { workspace });
    expect(screen.getByText('Create User')).toBeDisabled();
  });
});
```

### End-to-End Tests
```javascript
// Test complete flow
describe('Workspace Flow', () => {
  it('should register community workspace and login', async () => {
    // Register
    await registerCommunityWorkspace({
      workspace_name: 'Test Co',
      full_name: 'Test User',
      email: 'test@test.com',
      password: 'test123'
    });
    
    // Verify workspace badge
    expect(screen.getByText('Test Co')).toBeInTheDocument();
    expect(screen.getByText('(COMMUNITY)')).toBeInTheDocument();
    
    // Verify limits
    expect(screen.getByText('0 / 10 users')).toBeInTheDocument();
  });
});
```

## Estimated Time

- App.jsx: 15 minutes
- Login.jsx: 20 minutes
- Dashboard.jsx: 30 minutes
- WorkspaceBadge.jsx: 15 minutes
- LimitWarning.jsx: 30 minutes
- UserManagement.jsx: 45 minutes
- ChangeLog.jsx: 20 minutes
- Navbar.jsx: 20 minutes
- Testing: 60 minutes

**Total**: ~4 hours for complete frontend integration

## Next Steps After Frontend Integration

1. **Full Application Testing**
   - Test CORE workspace features
   - Test COMMUNITY workspace limits
   - Test data isolation
   - Test feature restrictions

2. **User Documentation**
   - Create user guide for COMMUNITY registration
   - Document workspace features comparison
   - Create upgrade guide (COMMUNITY → CORE)

3. **Deployment**
   - Run migration script in production
   - Monitor for any issues
   - Verify all existing users have workspace association

4. **Future Enhancements**
   - Workspace settings page
   - Billing integration for upgrades
   - Usage analytics dashboard
   - Workspace transfer functionality

---

**Status**: Ready for frontend integration
**Prerequisites**: Backend 100% complete ✅
**Next File**: App.jsx (simplest starting point)
