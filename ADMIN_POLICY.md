# Admin User and Team Management Policy

## 🔐 Admin User Policy

### Admin Users are Super Users
Admin users in TaskFlow are **super users** with system-wide privileges. They operate across all teams and should not be assigned to specific teams.

### Key Rules:

1. **No Team Assignment for Admins**
   - Admin users cannot be assigned to any team
   - Admin role automatically removes team assignment
   - Admins have access to all teams and resources

2. **Reserved "Admin" Team Name**
   - The team name "Admin" is reserved and cannot be created
   - This prevents confusion about admin user organization
   - Admin users are managed separately from the team structure

3. **Admin vs HR Distinction**
   - **Admin**: Super user, manages entire system, no team assignment
   - **HR**: Manages users and teams, can be assigned to teams, team-specific operations

## 🚫 Restrictions

### Backend Validations:

#### User Creation (`POST /api/users`)
```javascript
// Admin users cannot be assigned to teams
if (role === 'admin' && team_id) {
  return res.status(400).json({ 
    message: 'Admin users cannot be assigned to teams',
    hint: 'Admin users are super users and work across all teams'
  });
}
```

#### User Update (`PUT /api/users/:id`)
```javascript
// Upgrading to admin automatically removes team assignment
if (role === 'admin') {
  updates.team_id = null;
}
```

#### Team Creation (`POST /api/teams`)
```javascript
// Cannot create team named "Admin"
if (name.toLowerCase() === 'admin') {
  return res.status(400).json({ 
    message: 'Admin team is reserved for super users only'
  });
}
```

#### Team Update (`PATCH /api/teams/:id`)
```javascript
// Cannot rename team to "Admin"
if (name && name.toLowerCase() === 'admin') {
  return res.status(400).json({ 
    message: 'Admin team name is reserved'
  });
}
```

### Model Validations:

#### Team Model
```javascript
name: {
  type: String,
  validate: {
    validator: function(value) {
      return value.toLowerCase() !== 'admin';
    },
    message: 'Team name "Admin" is reserved for super users only'
  }
}
```

## 🎨 Frontend Behavior

### User Management Page

When creating or editing a user:

1. **Role Selection = Admin**
   - Team field automatically disabled
   - Shows message: "Admin users don't need team assignment"
   - Team value automatically cleared

2. **Role Selection = Other (HR, Team Lead, Member)**
   - Team field enabled
   - User can select from available teams
   - Team assignment optional

### Visual Feedback
```jsx
{formData.role === 'admin' ? (
  <div>Admin users don't need team assignment</div>
) : (
  <select name="team_id">...</select>
)}
```

## 👥 Role Hierarchy

```
┌─────────────────────────────────────┐
│         Admin (Super User)           │
│  - System-wide access                │
│  - No team assignment                │
│  - Manages all users and teams       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│              HR                      │
│  - Manages users and teams           │
│  - Can be assigned to teams          │
│  - Cross-team operations             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│           Team Lead                  │
│  - Manages specific team             │
│  - Must be assigned to a team        │
│  - Team-level operations             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│            Member                    │
│  - Team member                       │
│  - Should be assigned to a team      │
│  - Task-level operations             │
└─────────────────────────────────────┘
```

## 📋 User Management Examples

### ✅ Valid Operations

**Creating an Admin User:**
```json
{
  "full_name": "Super Admin",
  "email": "admin@example.com",
  "password": "SecurePass123",
  "role": "admin",
  "team_id": null
}
```

**Creating an HR User:**
```json
{
  "full_name": "HR Manager",
  "email": "hr@example.com",
  "password": "SecurePass123",
  "role": "hr",
  "team_id": "optional-team-id"
}
```

**Upgrading User to Admin:**
```json
{
  "role": "admin"
  // team_id is automatically set to null
}
```

### ❌ Invalid Operations

**Trying to assign Admin to a team:**
```json
{
  "role": "admin",
  "team_id": "some-team-id"  // ❌ Error: Admins cannot be assigned to teams
}
```

**Creating team named "Admin":**
```json
{
  "name": "Admin",  // ❌ Error: Reserved team name
  "hr_id": "...",
  "lead_id": "..."
}
```

## 🔧 Migration Script

If you have existing admin users assigned to teams, run this cleanup:

```javascript
// Clean up admin users with team assignments
await User.updateMany(
  { role: 'admin', team_id: { $ne: null } },
  { $set: { team_id: null } }
);
```

## 🛡️ Security Implications

1. **Admin Independence**
   - Admins should not be tied to specific teams
   - Ensures unbiased system-wide management
   - Prevents team-level restrictions on admin operations

2. **Clear Separation of Duties**
   - Admins: System management
   - HR: People management (can span teams)
   - Team Leads: Team-specific management
   - Members: Task execution

3. **Audit Trail**
   - Admin actions are logged separately
   - Team-specific actions are attributed to team roles
   - Clear accountability for system changes

## 📝 Best Practices

### When to Use Each Role:

**Admin:**
- System administrators
- IT staff managing the platform
- Accounts that need unrestricted access
- Should be limited to 1-3 users maximum

**HR:**
- Human resources personnel
- User account managers
- Can manage multiple teams
- Ideal for onboarding/offboarding workflows

**Team Lead:**
- Project managers
- Department heads
- Team supervisors
- One per team recommended

**Member:**
- Regular employees
- Contractors
- Task executors
- Majority of users

### Team Structure:

```
Company
├── Admin Users (no teams)
├── HR Department (optional team)
├── Engineering Team
│   ├── Team Lead
│   └── Members
├── Marketing Team
│   ├── Team Lead
│   └── Members
└── Sales Team
    ├── Team Lead
    └── Members
```

## 🧪 Testing

### Test Admin Creation:
```bash
# Create admin without team
POST /api/users
{
  "full_name": "Test Admin",
  "email": "testadmin@example.com",
  "password": "Test123!",
  "role": "admin"
}
# ✅ Success

# Try to create admin with team
POST /api/users
{
  "role": "admin",
  "team_id": "some-team-id"
}
# ❌ Error: Admin users cannot be assigned to teams
```

### Test Team Creation:
```bash
# Try to create "Admin" team
POST /api/teams
{
  "name": "Admin",
  "hr_id": "...",
  "lead_id": "..."
}
# ❌ Error: Team name "Admin" is reserved
```

## 📚 Related Documentation

- `ACCESS_GUIDE.md` - Role-based access control details
- `DEBUG_USER_CREATION.md` - User creation troubleshooting
- `PROJECT_STRUCTURE.md` - Overall system architecture

---

**Last Updated:** October 31, 2025  
**Version:** 1.0.0
