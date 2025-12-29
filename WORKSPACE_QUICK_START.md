# Workspace Quick Start Guide

## 🎯 Overview

TaskFlow supports multiple isolated workspaces, allowing you to run a multi-tenant task management system with two workspace types:

- **CORE Workspace** - Enterprise unlimited features
- **COMMUNITY Workspace** - Free tier with usage limits

---

## 🆓 Community Workspace Registration

### What's Included (FREE)
- ✅ Up to **10 users**
- ✅ Up to **100 tasks**
- ✅ Up to **3 teams**
- ✅ Full task management (create, assign, track, kanban)
- ✅ Real-time updates & notifications
- ✅ Mobile PWA support
- ✅ Analytics & reports
- ✅ Team collaboration

### Role & Limitations
As the workspace creator, you'll have the **Community Admin** role with:
- ✅ User management (create/edit users)
- ✅ Team creation and management
- ✅ Full task management capabilities
- ✅ Analytics and reports
- ❌ **No bulk user import**
- ❌ **No audit logs access**
- ❌ **No advanced automation**

### How to Create a Community Workspace

1. **Navigate to Registration**
   - Go to `http://localhost:3000`
   - Click **"Create Community Workspace"** on login page

2. **Fill Registration Form**
   ```
   Workspace Name: Your Company/Team Name
   Your Full Name: John Doe
   Email: john@example.com
   Password: ••••••••
   ```

3. **Instant Access**
   - Your workspace is created immediately
   - You're logged in as **Community Admin** (limited admin role)
   - Start inviting team members right away

---

## 👨‍💼 System Administrator

### What is a System Admin?

A **System Administrator** is a special admin account **without a workspace** that has:
- ✅ Full access to **ALL workspaces**
- ✅ Workspace management interface
- ✅ Cross-workspace data visibility
- ✅ Ability to create/edit/delete workspaces
- ✅ Global statistics dashboard

### Default System Admin Account

Created automatically with `npm run seed:admin`:
- **Email**: `admin@taskflow.com`
- **Password**: `Admin@123`
- **Type**: System Admin (no workspace)

⚠️ **Change this password immediately after first login!**

### System Admin Capabilities

**Workspace Management:**
- View all workspaces in the system
- Create new CORE or COMMUNITY workspaces
- Edit workspace settings and limits
- **Activate or deactivate workspaces** (restrict access)
- Delete empty workspaces
- Monitor usage statistics
- Assign workspace owners

**Access Pattern:**
- Login → See "Workspaces" menu item
- Click "Workspaces" to access management interface
- View/Create/Edit/Delete workspaces
- Toggle workspace activation status
- See real-time statistics for all workspaces

**Important:** Deactivating a workspace blocks all users from accessing it. See [Workspace Activation Guide](./WORKSPACE_ACTIVATION_GUIDE.md) for details.

---

## 🏢 Workspace Admin

### What is a Workspace Admin?

A **Workspace Administrator** is an admin **with a workspace assignment** that has:
- ✅ Full control over **their workspace only**
- ✅ User management within their workspace
- ✅ Team and task management
- ✅ Analytics and reports for their workspace
- ✅ Audit log access (CORE workspaces only)
- ❌ Cannot see other workspaces
- ❌ Cannot access workspace management interface

### Creating Workspace Admins

**Option 1: System Admin Creates Workspace**
```
System Admin → Workspaces → Create Workspace
- Set workspace name and type
- Optionally assign existing user as owner
- User becomes workspace admin
```

**Option 2: Community Registration**
```
User → Register Community Workspace
- Automatically becomes admin of new workspace
```

**Option 3: Promote Existing User**
```
Workspace Admin → User Management → Edit User
- Change role to "admin"
- User gains admin privileges in that workspace
```

---

## 🆚 Workspace Types Comparison

| Feature | COMMUNITY (Free) | CORE (Enterprise) |
|---------|------------------|-------------------|
| **Users** | Up to 10 | Unlimited |
| **Tasks** | Up to 100 | Unlimited |
| **Teams** | Up to 3 | Unlimited |
| **Task Management** | ✅ Full | ✅ Full |
| **Kanban Board** | ✅ | ✅ |
| **Calendar View** | ✅ | ✅ |
| **Analytics & Reports** | ❌ Limited | ✅ Full |
| **Bulk User Import** | ❌ | ✅ |
| **Audit Logs** | ❌ | ✅ |
| **Email Automation** | ❌ | ✅ |
| **Advanced Automation** | ❌ | ✅ |

---

## 🔄 Workspace Workflows

### Scenario 1: New Startup Team
```
1. Team Lead visits login page
2. Clicks "Create Community Workspace"
3. Enters company name and personal details
4. Gets FREE workspace with 10 user limit
5. Invites team members via User Management
6. Start managing tasks immediately
```

### Scenario 2: Enterprise Deployment
```
1. IT Admin runs: npm run seed:admin
2. System Admin logs in with default credentials
3. Goes to Workspaces → Create Workspace
4. Creates CORE workspace for company
5. Assigns department head as workspace admin
6. Department head invites their team
7. Repeat for multiple departments
```

### Scenario 3: Multi-Tenant SaaS
```
1. System Admin manages platform
2. Multiple companies register Community workspaces
3. Each workspace is completely isolated
4. System Admin monitors usage via Workspace Management
5. Upgrade COMMUNITY → CORE as needed
```

---

## 🔒 Data Isolation

### How It Works

- Every task, user, team, notification is tied to a `workspaceId`
- All database queries automatically filter by workspace
- Users can only see data from their workspace
- System Admins can see across all workspaces

### Security Guarantees

✅ **Workspace A users** cannot see **Workspace B data**  
✅ **Workspace Admins** cannot access other workspaces  
✅ **Only System Admins** have cross-workspace visibility  
✅ **API routes** enforce workspace scoping  
✅ **Frontend** prevents unauthorized navigation  

---

## 📊 Usage Monitoring

### For Workspace Admins

Check your workspace limits:
- Dashboard shows current usage
- Warning when approaching limits (70%, 90%)
- Contact System Admin for upgrades

### For System Admins

Monitor all workspaces:
- Workspaces page shows all usage stats
- Real-time user/task/team counts
- Usage percentage for COMMUNITY workspaces
- Completion rates and activity levels

---

## 🚀 Common Tasks

### Create a New Community Workspace
```
1. Visit: http://localhost:3000
2. Click: "Create Community Workspace"
3. Fill form and submit
4. Auto-login as admin
```

### Create a CORE Workspace (System Admin)
```
1. Login as System Admin
2. Navigate to: Workspaces
3. Click: "Create Workspace"
4. Select: CORE
5. Enter workspace name
6. Optional: Assign owner email
7. Click: "Create"
```

### Upgrade COMMUNITY to CORE (System Admin)
```
1. Navigate to: Workspaces
2. Find workspace in list
3. Click: "Edit"
4. Change type: COMMUNITY → CORE
5. Click: "Save Changes"
6. Limits automatically become unlimited
```

### Assign New Workspace Admin
```
1. Login to workspace
2. Go to: User Management
3. Create new user OR find existing user
4. Set role: "admin"
5. Save changes
6. User now has admin privileges
```

### Delete a Workspace (System Admin)
```
1. Navigate to: Workspaces
2. Find workspace to delete
3. Click: "Delete"
4. Confirm deletion
Note: Workspace must have 0 users to delete
```

---

## 🆘 Troubleshooting

### "Your account is not associated with any workspace"
- **For regular users**: Contact your workspace admin
- **For admins**: This is normal if you're a system admin without workspace

### Cannot see "Workspaces" menu
- Only visible to System Admins (admins without workspace)
- Workspace admins don't see this menu
- Check if your account has `workspaceId: null`

### Reached workspace limits
- COMMUNITY workspaces have fixed limits
- Contact System Admin to upgrade to CORE
- Or remove unused users/tasks to free space

### Cannot create more users/tasks/teams
- Check your workspace type and limits
- COMMUNITY: 10 users, 100 tasks, 3 teams
- CORE: Unlimited
- Dashboard shows current usage

---

## 📞 Support

For workspace management questions:
- **Community Users**: Contact your workspace admin
- **Workspace Admins**: Contact System Administrator
- **System Admins**: Check documentation or contact technical support

---

**Built with ❤️ for scalable team collaboration**
