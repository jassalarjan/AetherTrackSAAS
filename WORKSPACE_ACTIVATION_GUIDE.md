# Workspace Activation & Deactivation Guide

## 🎯 Overview

System administrators can **activate** or **deactivate** workspaces to control access. This feature is useful for:
- **Suspending** workspaces for non-payment
- **Temporarily disabling** inactive workspaces
- **Restricting access** during maintenance or investigations
- **Managing** free trial expirations

---

## 🔐 Access Control

### Who Can Activate/Deactivate Workspaces?
- ✅ **System Administrators only**
- ❌ Regular admins **cannot** deactivate their own workspace
- ❌ Community admins **cannot** access workspace management

### Permission Requirements
- Must be logged in as **System Admin** (no workspace required)
- Access to **Workspace Management** panel

---

## 📋 How to Deactivate a Workspace

### Step-by-Step Process

1. **Login as System Admin**
   - Email: `admin@taskflow.com`
   - Or your custom system admin account

2. **Navigate to Workspace Management**
   - Click **"Workspaces"** in the navigation menu
   - This menu item is only visible to system admins

3. **Find the Workspace**
   - Use the search bar to find the workspace by name
   - Or scroll through the workspace list

4. **Click Deactivate Button**
   - Click the **orange "Deactivate"** button on the workspace card
   - Confirm the action in the popup dialog

5. **Verification**
   - The workspace status badge changes to **🔴 Inactive**
   - The button changes to **green "Activate"**
   - Users in that workspace can no longer access the system

---

## 🔄 How to Reactivate a Workspace

### Step-by-Step Process

1. **Navigate to Workspace Management**
   - Login as system admin
   - Click **"Workspaces"** menu

2. **Find Inactive Workspace**
   - Look for workspaces with **🔴 Inactive** badge
   - Status is shown on each workspace card

3. **Click Activate Button**
   - Click the **green "Activate"** button
   - Confirm the action

4. **Verification**
   - Status badge changes to **🟢 Active**
   - Users can immediately access the workspace again
   - All data remains intact

---

## 👥 What Happens When a Workspace is Deactivated?

### For Workspace Users

**Immediate Effects:**
- ❌ **Cannot login** - Login is blocked with error message
- ❌ **Existing sessions terminated** - Active users are logged out
- ❌ **All features inaccessible** - No tasks, teams, or data access
- ⚠️ **Error message shown**: *"Your workspace has been deactivated. Please contact support."*

**What is NOT Affected:**
- ✅ **Data is preserved** - All tasks, users, teams remain in database
- ✅ **User accounts intact** - Passwords and profiles unchanged
- ✅ **Can be reactivated** - Instant restoration of full access

### For System Administrators

- ✅ Can still view workspace details in Workspace Management
- ✅ Can edit workspace settings while inactive
- ✅ Can reactivate at any time
- ✅ Can view statistics and usage data
- ✅ Can delete workspace (if needed)

---

## 📊 Workspace Status Indicators

### Visual Badges

| Status | Badge | Button | Color |
|--------|-------|--------|-------|
| **Active** | 🟢 Active | Deactivate | Green badge, Orange button |
| **Inactive** | 🔴 Inactive | Activate | Red badge, Green button |

### Statistics Dashboard

The **Workspace Management** dashboard shows:
- **Total Workspaces** - All workspaces count
- **Active Workspaces** - Currently accessible workspaces (green)
- **Inactive Workspaces** - Deactivated workspaces (red)
- **Workspace Types** - CORE vs COMMUNITY breakdown

---

## 🛡️ Security & Access Control

### Middleware Protection

The system uses **workspaceContext middleware** to enforce activation status:

```javascript
if (!workspace.isActive) {
  return res.status(403).json({ 
    message: 'Your workspace has been deactivated. Please contact support.',
    error: 'WORKSPACE_INACTIVE' 
  });
}
```

**Result:**
- All API requests blocked for inactive workspaces
- Frontend displays appropriate error message
- Users cannot bypass the restriction

---

## 📝 Audit Logging

### Tracked Events

All activation/deactivation actions are logged in the **ChangeLog**:

**Log Entry Includes:**
- ✅ **Event Type**: `workspace_action`
- ✅ **Action**: `status_change`
- ✅ **User**: System admin who performed the action
- ✅ **Timestamp**: Exact date and time
- ✅ **Changes**: Before and after status
- ✅ **Description**: "Activated workspace: [name]" or "Deactivated workspace: [name]"

**Example Log Entry:**
```json
{
  "event_type": "workspace_action",
  "action": "status_change",
  "description": "Deactivated workspace: Acme Corporation",
  "user": "admin@taskflow.com",
  "timestamp": "2025-12-28T10:30:00Z",
  "changes": {
    "before": { "isActive": true },
    "after": { "isActive": false }
  }
}
```

---

## 🚨 Common Scenarios

### Scenario 1: Non-Payment (COMMUNITY Upgrade)
**Use Case:** Community workspace wants to exceed limits but hasn't paid

**Steps:**
1. Deactivate the workspace
2. Contact workspace owner about payment
3. After payment received, reactivate workspace
4. Optional: Upgrade to CORE workspace type

### Scenario 2: Trial Expiration
**Use Case:** Trial period ended, workspace needs review

**Steps:**
1. Deactivate workspace when trial expires
2. Send notification to workspace owner
3. Reactivate if they subscribe
4. Or delete workspace after grace period

### Scenario 3: Policy Violation
**Use Case:** Workspace violates terms of service

**Steps:**
1. Immediately deactivate workspace
2. Investigate the violation
3. Contact workspace owner
4. Reactivate if issue resolved, or delete if necessary

### Scenario 4: Temporary Maintenance
**Use Case:** Need to perform maintenance on specific workspace

**Steps:**
1. Notify workspace users of maintenance window
2. Deactivate workspace before maintenance
3. Perform necessary updates
4. Reactivate workspace when complete

---

## 🔧 API Endpoints

### Toggle Workspace Status

**Endpoint:** `PATCH /api/workspaces/:id/toggle-status`

**Authentication:** System Admin only

**Request:**
```http
PATCH /api/workspaces/507f1f77bcf86cd799439011/toggle-status
Authorization: Bearer <system-admin-jwt-token>
```

**Response (Success):**
```json
{
  "message": "Workspace deactivated successfully",
  "workspace": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Acme Corporation",
    "isActive": false,
    // ... other fields
  }
}
```

**Response (Error - Not System Admin):**
```json
{
  "message": "Access denied. System administrator privileges required."
}
```

---

## ⚠️ Important Considerations

### Before Deactivating

✅ **Check:**
- How many users will be affected?
- Are there critical tasks in progress?
- Have you notified the workspace owner?
- Is there a reactivation plan?

### Data Retention

- 🔒 **Inactive workspaces retain all data**
- 🗄️ **Database is not affected** by activation status
- ⏰ **No automatic deletion** occurs
- 💾 **Can be archived** before deletion (manual process)

### User Communication

**Best Practices:**
1. Notify workspace owner before deactivation (when possible)
2. Provide clear reason for deactivation
3. Explain reactivation process
4. Set expectations for timeline
5. Provide support contact information

---

## 📞 Support & Escalation

### For Users with Deactivated Workspaces

**Error Message:**
> "Your workspace has been deactivated. Please contact support."

**What to Do:**
1. Contact your **workspace administrator** first
2. If workspace admin is unavailable, contact **system support**
3. Provide:
   - Your email address
   - Workspace name
   - Reason for access needed
   - Urgency level

### For System Administrators

**Need Help?**
- Check audit logs for deactivation history
- Review workspace statistics for context
- Document reason for status change
- Maintain communication log with workspace owner

---

## 🎯 Best Practices

### For System Administrators

1. **Document Everything**
   - Record reason for deactivation
   - Log communication with workspace owner
   - Set reminders for follow-up

2. **Communicate Clearly**
   - Send advance notice when possible
   - Explain consequences of deactivation
   - Provide clear reactivation criteria

3. **Monitor Status**
   - Regularly review inactive workspaces
   - Check if reactivation conditions are met
   - Clean up long-term inactive workspaces

4. **Use Audit Logs**
   - Review ChangeLog for activation history
   - Track who made changes and when
   - Maintain compliance records

---

## 📈 Monitoring & Reporting

### Dashboard Metrics

**Workspace Management Dashboard Shows:**
- Total active vs inactive workspaces
- CORE vs COMMUNITY breakdown
- User count across all workspaces
- Task and team statistics

### Recommended Monitoring

**Weekly Review:**
- Count of inactive workspaces
- Duration of inactivity
- Pending reactivation requests
- Workspaces approaching limits

**Monthly Audit:**
- Deactivation/reactivation patterns
- Average inactive duration
- Reasons for deactivation (manual tracking)
- User impact assessment

---

## 🆘 Troubleshooting

### Problem: Cannot Deactivate Workspace

**Possible Causes:**
- Not logged in as system admin
- Network connection issue
- Backend server error

**Solution:**
1. Verify system admin role (check Navbar for "Workspaces" menu)
2. Check browser console for errors
3. Refresh page and try again
4. Check backend logs for errors

### Problem: Users Still Have Access After Deactivation

**Possible Causes:**
- Active sessions not expired yet
- Browser cache issue
- Middleware not applied to route

**Solution:**
1. Wait for session timeout (users will be logged out)
2. Or restart backend server to force session cleanup
3. Users must refresh page or re-login
4. Check middleware is applied to all protected routes

### Problem: Workspace Shows Inactive but Users Can Access

**Possible Causes:**
- Database update didn't save
- Caching issue
- Bug in middleware

**Solution:**
1. Check database directly: `db.workspaces.findOne({ _id: ObjectId("...") })`
2. Verify `isActive` field is `false`
3. Restart backend server
4. Clear Redis cache if using caching layer

---

## 🔄 Related Features

- **[Workspace Management](./WORKSPACE_QUICK_START.md)** - Full workspace administration guide
- **[System Administrator Guide](./SYSTEM_ADMIN_ACCESS.md)** - System admin capabilities
- **[Audit Logging](./README.md#-audit-logging)** - Track all system changes
- **[User Management](./README.md#-user-management)** - User account administration

---

**Last Updated:** December 28, 2025  
**Feature Status:** ✅ Fully Implemented
