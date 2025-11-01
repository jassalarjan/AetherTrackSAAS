# Analytics & Dashboard - Role-Based Permissions

This document outlines the role-based access control implemented in the Analytics and Dashboard pages.

## Permission Tiers

> **Note:** These permissions apply to both Analytics and Dashboard pages for consistency.

### 1. Admin & HR (Full Access)
**Access Level:** Complete analytics dashboard with all features

**Available Features:**
- ✅ Export Reports (Excel & PDF) - **Analytics & Dashboard**
- ✅ All Filters (Status, Priority, Date Range, Team, User) - **Analytics**
- ✅ Basic Filters (Status, Priority, Date Range) - **Dashboard**
- ✅ All Key Metrics Cards
- ✅ All Charts:
  - Status Distribution (Pie Chart)
  - Priority Distribution (Bar Chart)
  - Overdue Tasks by Priority (Bar Chart) - **Analytics only**
  - Task Completion Trend (Area Chart) - **Analytics only**
  - User Performance (Bar Chart) - **Analytics only**
  - Tasks by Team (Bar Chart)
  - Progress Over Time (Line Chart) - **Dashboard only**
- ✅ Tasks by Team Numerical Stats - **Both pages**
- ✅ Filtered Tasks Table
- ✅ View all team data and user data

**Use Case:** Complete organizational oversight and reporting capabilities

---

### 2. Team Lead (Minimal Analytics)
**Access Level:** Limited analytics focused on essential metrics

**Available Features:**
- ✅ Basic Filters:
  - **Analytics:** Status, Priority, Date Range, Team, User
  - **Dashboard:** Status, Priority (Date Range hidden)
- ✅ Key Metrics Cards (Total, Overdue, Completed, In Progress)
- ✅ Basic Charts:
  - Status Distribution (Pie Chart)
  - Priority Distribution (Bar Chart)
- ✅ Filtered Tasks Table (all tasks visible)
- ✅ View their team's data

**Restricted Features:**
- ❌ Export Reports (No Excel/PDF export buttons) - **Both pages**
- ❌ Advanced Charts:
  - No Overdue Tasks by Priority - **Analytics**
  - No Task Completion Trend - **Analytics**
  - No User Performance - **Analytics**
  - No Tasks by Team - **Both pages**
  - No Progress Over Time - **Dashboard**
- ❌ Tasks by Team Numerical Stats (hidden) - **Both pages**
- ❌ Date Range filter (hidden on Dashboard only)

**Use Case:** Monitor team performance without detailed analytics or export capabilities

---

### 3. Member (Personal Data Only)
**Access Level:** Personal task statistics only

**Available Features:**
- ✅ Basic Filters (Status, Priority ONLY) - **Both pages**
- ✅ Key Metrics Cards (showing only their assigned tasks)
- ✅ Filtered Tasks Table (only tasks assigned to them)

**Restricted Features:**
- ❌ Export Reports (No Excel/PDF export buttons) - **Both pages**
- ❌ All Charts (completely hidden) - **Both pages**
- ❌ Tasks by Team Stats (hidden) - **Both pages**
- ❌ Advanced Filters (No Date Range, Team, or User filters) - **Both pages**
- ❌ Cannot view other users' tasks

**Automatic Filtering:**
- System automatically filters to show ONLY tasks assigned to the logged-in member - **Both pages**
- **Additional Team Restriction:** Members can only see tasks that are BOTH assigned to them AND belong to their team
- Members cannot bypass this filter to see others' tasks or tasks from other teams

**Use Case:** View personal task workload with basic filtering by status and priority

---

## Implementation Details

### Filter Restrictions

**Analytics Page:**
```javascript
// Members see only 2 filters (Status, Priority)
// Team leads see 5 filters (Status, Priority, Date Range, Team, User)
// Admin/HR see 5 filters (Status, Priority, Date Range, Team, User)
```

**Dashboard Page:**
```javascript
// Members see only 2 filters (Status, Priority)
// Team leads see 2 filters (Status, Priority) - Date Range hidden
// Admin/HR see 3 filters (Status, Priority, Date Range)
```

### Data Filtering
```javascript
// For members - Automatic filter applied in applyFilters() on BOTH pages:
if (user?.role === 'member') {
  filtered = filtered.filter(task => {
    // Check if task is assigned to the member
    const isAssignedToUser = task.assigned_to && 
      task.assigned_to.some(assignedUser => 
        assignedUser._id === user.id || assignedUser === user.id
      );
    
    // Check if task belongs to member's team
    const belongsToUserTeam = user.team_id && task.team_id && 
      (task.team_id._id === user.team_id || task.team_id === user.team_id);
    
    // Task must be both assigned to user AND in their team
    return isAssignedToUser && belongsToUserTeam;
  });
}
```

**Note:** This dual-filter approach (user assignment + team membership) applies to:
- Dashboard page
- Analytics page
- Tasks page (when "My Tasks Only" is enabled)
- Kanban page (when "My Tasks Only" is enabled)

### Chart Visibility

**Analytics Page:**
```javascript
// Members: No charts
// Team leads: Status + Priority charts only
// Admin/HR: All charts including advanced analytics
```

**Dashboard Page:**
```javascript
// Members: No charts
// Team leads: Status + Priority charts only
// Admin/HR: All charts including Tasks by Team and Progress Over Time
```

### Export Button Visibility
```javascript
// Only visible to admin and hr roles on BOTH pages:
{['admin', 'hr'].includes(user?.role) && (
  <ExportButtons />
)}
```

---

## Security Considerations

1. **Frontend Enforcement:** All restrictions are enforced in the React component
2. **Backend Validation:** Backend should also validate role-based permissions on API endpoints
3. **Data Leakage Prevention:** Members cannot access team-wide or other users' data
4. **Export Control:** Only admin/hr can generate reports to prevent data extraction

---

## User Experience

### Page Descriptions

**Analytics Page:**
- **Admin/HR:** "Advanced task analytics and filtering"
- **Team Lead:** "Overview of your team performance"
- **Member:** "View your personal task statistics"

**Dashboard Page:**
- Same description for all roles: "Task Management Dashboard"

### Empty States
- Each role sees appropriate messaging when no data is available
- Members see a simplified interface focused on their tasks only on both pages

---

## Future Enhancements

Potential improvements for consideration:

1. **Team Lead Exports:** Allow team leads to export data for their team only
2. **Member Charts:** Add simple personal charts (own task status/priority pie charts)
3. **Granular Permissions:** Per-user custom permissions beyond role-based
4. **Audit Logging:** Track who exports reports and when
5. **Team Lead Scope:** Restrict team leads to see only their team's data (currently can see all teams in filters)

---

## Testing Checklist

### Analytics Page
- [ ] Admin can see all charts and export buttons
- [ ] HR can see all charts and export buttons
- [ ] Team lead sees only 2 charts (Status, Priority)
- [ ] Team lead CANNOT see export buttons
- [ ] Team lead has all 5 filters
- [ ] Member sees NO charts
- [ ] Member sees ONLY status and priority filters
- [ ] Member sees ONLY tasks assigned to them
- [ ] Filtered tasks table respects role permissions
- [ ] Key metrics reflect correct filtered data for each role

### Dashboard Page
- [ ] Admin can see all charts and export buttons
- [ ] HR can see all charts and export buttons
- [ ] Team lead sees only 2 charts (Status, Priority)
- [ ] Team lead CANNOT see export buttons
- [ ] Team lead CANNOT see Date Range filter
- [ ] Member sees NO charts
- [ ] Member sees ONLY status and priority filters
- [ ] Member sees ONLY tasks assigned to them
- [ ] Tasks by Team section hidden for team leads and members
- [ ] Progress Over Time chart hidden for team leads and members
- [ ] Key metrics reflect correct filtered data for each role

### Both Pages
- [ ] Export buttons only visible to admin/hr
- [ ] Members automatically see only their assigned tasks
- [ ] Filter changes update displayed data correctly
- [ ] No console errors for any role
