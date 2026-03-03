# Operations and Administration Guide

**AetherTrackSAAS Platform**
**Document Version:** 1.0
**Effective Date:** 2026-02-26

---

## 1. Purpose of This Document

This document serves as the single authoritative operational reference for managing, configuring, monitoring, and maintaining the AetherTrackSAAS platform in production environments.

### 1.1 Scope

This document covers all administrative operations that platform administrators and workspace administrators can perform. It defines the boundaries of administrative authority, the mechanics of user and workspace management, operational workflows, and the constraints under which the platform operates.

This document does not cover end-user features, application programming interfaces (APIs) for developer integration, or detailed technical implementation specifications. Those topics are covered in separate documentation files.

### 1.2 Audience

This document is intended for:

- **Platform Administrators (Super Admins):** Individuals responsible for system-wide configuration, multi-workspace oversight, and platform-level security policies
- **Workspace Administrators:** Individuals responsible for managing a specific CORE or COMMUNITY workspace, including user management, team configuration, and operational oversight within their assigned workspace
- **Human Resources Administrators:** Individuals who manage employee lifecycle operations including onboarding, offboarding, leave management, and compliance-related administrative tasks
- **IT Operations Staff:** Personnel responsible for monitoring system health, managing access controls, and responding to operational incidents

### 1.3 What This Document Enables Administrators to Accomplish

This document provides administrators with the operational knowledge required to:

1. Understand the precise boundaries of their authority within the platform's multi-tenant architecture
2. Execute user lifecycle operations including provisioning, deactivation, and offboarding with full awareness of consequences
3. Configure workspace settings within defined constraints
4. Assign roles and permissions with deterministic understanding of access rights
5. Monitor administrative actions through audit logs
6. Respond to operational failures and exceptional scenarios
7. Understand what the platform does and does not guarantee

---

## 2. Administrative Responsibility Model

AetherTrackSAAS implements a distributed administrative model where certain platform capabilities are managed by the platform operator, while others are delegated to workspace administrators. This section defines the boundary between platform-managed and admin-managed responsibilities.

### 2.1 Platform-Managed Responsibilities

The following capabilities are managed exclusively by the platform and cannot be modified by workspace administrators:

- **Authentication Infrastructure:** The platform manages the authentication backend, token issuance, and session management. Administrators cannot modify token expiration times, authentication algorithms, or session persistence settings.

- **Core Data Model:** The database schema, data types, and fundamental data relationships are platform-defined. Administrators cannot create custom data fields or modify existing data structures.

- **Security Infrastructure:** The platform manages encryption at rest, transport layer security, and access control enforcement. The platform does not support customer-managed encryption keys.

- **Compliance Framework:** The platform does not hold formal compliance certifications. No claims of HIPAA, SOC 2, ISO 27001, or other regulatory compliance can be made or relied upon.

- **Global Rate Limiting:** The platform enforces rate limits on authentication endpoints. These limits are non-configurable by administrators.

- **Platform Upgrade and Maintenance:** The platform operator controls deployment schedules, maintenance windows, and feature rollouts.

### 2.2 Admin-Managed Responsibilities

The following capabilities are delegated to workspace administrators within defined boundaries:

- **User Provisioning:** Administrators can invite individual users or perform bulk CSV imports to create user accounts within workspace constraints.

- **Role Assignment:** Administrators can assign roles to users within their workspace, subject to role hierarchy constraints.

- **Workspace Configuration:** Administrators can configure workspace settings including team structure, task workflows, and notification preferences.

- **Leave and Attendance Management:** HR administrators can manage leave types, approve or reject leave requests, and configure attendance policies.

- **Task Assignment:** Team leads and administrators can create, assign, and reassign tasks within their workspace.

- **Team Management:** Administrators can create teams (except the reserved "Admin" team name), modify team membership, and configure team-level settings.

### 2.3 Scope of Admin Authority

Administrative authority in AetherTrackSAAS is constrained by two factors:

1. **Workspace Boundary:** Administrators can only manage users, teams, tasks, and data within their assigned workspace(s). Cross-workspace access is not permitted unless explicitly authorized by a super_admin.

2. **Role Level:** Each role level grants specific capabilities. Administrators cannot perform actions that require a higher privilege level than their assigned role.

### 2.4 Six-Tier Role Hierarchy

AetherTrackSAAS implements a six-tier role hierarchy with ascending privilege levels. Each tier grants specific capabilities and inherits permissions from lower tiers.

| Role | Privilege Level | Scope |
|------|-----------------|-------|
| super_admin | Level 6 | System-wide across all workspaces |
| admin | Level 5 | Administrative access within assigned workspaces |
| hr | Level 4 | Human resources functions within assigned workspaces |
| team_lead | Level 3 | Team-level task assignment within assigned teams |
| member | Level 2 | Standard user access |
| community_admin | Level 1 | Community management only (COMMUNITY workspaces) |

#### 2.4.1 super_admin (Level 6)

The super_admin role has full system access across all workspaces in the platform. This role is typically limited to a small number of individuals responsible for platform-level administration.

**Capabilities:**

- Create, modify, and delete any workspace
- Assign administrators to workspaces
- Access all data across all workspaces
- Modify any user's role in any workspace
- View system-wide audit logs
- Manage platform-level configuration
- Access to all CORE and COMMUNITY workspace features
- Cannot be restricted by workspace-level permissions

**Constraints:**

- The number of super_admins should be minimal (recommended: 2-3 individuals)
- All super_admin actions are logged in the platform-wide audit trail
- super_admin accounts require additional security measures (strong passwords, MFA when available)

#### 2.4.2 admin (Level 5)

The admin role provides administrative access within assigned workspaces. Administrators can manage most aspects of their workspace but cannot access data outside their assigned workspace(s).

**Capabilities:**

- Manage users within assigned workspace(s)
- Assign roles up to and including admin level (cannot assign super_admin)
- Create and manage teams (except reserved "Admin" team)
- Configure workspace settings
- Create and manage projects
- Assign and reassign tasks
- Approve or reject leave requests
- Access workspace-specific audit logs
- Invite users and perform bulk CSV imports (CORE workspace only)

**Constraints:**

- Cannot access data in other workspaces
- Cannot assign super_admin role
- Cannot modify workspace tier (CORE to COMMUNITY or vice versa)
- Cannot override workspace user/team/task limits

#### 2.4.3 hr (Level 4)

The hr role provides human resources functions within assigned workspaces. This role is designed for HR personnel who need to manage employee lifecycle operations without full administrative access.

**Capabilities:**

- View all users in assigned workspace(s)
- Manage leave types and leave balances
- Approve or reject leave requests
- View attendance records
- Access HR reports and analytics
- Onboard new employees (create user invitations)
- Initiate offboarding processes

**Constraints:**

- Cannot delete users
- Cannot modify user roles
- Cannot access workspace configuration settings
- Cannot create or delete teams
- Cannot modify project settings

#### 2.4.4 team_lead (Level 3)

The team_lead role provides team-level task assignment and team management capabilities. This role is designed for individuals responsible for managing specific teams.

**Capabilities:**

- Create and assign tasks within their team(s)
- Reassign tasks within their team(s)
- View task status and progress for their team(s)
- Mark tasks as complete
- Manage team membership (add/remove members within team)
- Approve leave requests for team members
- Escalate task issues to admin

**Constraints:**

- Cannot access users outside their team(s)
- Cannot modify workspace settings
- Cannot view workspace-wide analytics
- Cannot manage other teams
- Cannot assign roles to users

#### 2.4.5 member (Level 2)

The member role is the standard user access level. Most end users in the platform have this role.

**Capabilities:**

- View and update assigned tasks
- Submit leave requests
- View personal leave balances
- Participate in team activities
- Access assigned projects
- View personal analytics

**Constraints:**

- Cannot create tasks for other users
- Cannot access administrative functions
- Cannot view other users' personal data
- Cannot modify team structure

#### 2.4.6 community_admin (Level 1)

The community_admin role provides limited administrative capabilities specifically for COMMUNITY workspaces. This role cannot perform most administrative functions.

**Capabilities:**

- View users in their COMMUNITY workspace
- Manage basic community settings
- Moderate community content (if applicable)

**Constraints:**

- Cannot access audit logs
- Cannot perform bulk imports
- Cannot assign admin or hr roles
- Cannot access CORE features
- Maximum 10 users in workspace (enforced by platform)

---

## 3. Workspace and Organization Management

Workspaces in AetherTrackSAAS represent isolated operational environments where teams collaborate on projects and tasks. Each workspace has specific characteristics, limits, and capabilities that define what administrators and users can accomplish within it.

### 3.1 Workspace Lifecycle

#### 3.1.1 Workspace Creation

Workspaces are created by super_admins or platform operators. When creating a workspace, the following must be specified:

- **Workspace Name:** A unique identifier for the workspace
- **Workspace Tier:** Either CORE or COMMUNITY
- **Initial Administrator:** The user who will serve as the initial workspace administrator

Once created, a workspace cannot be deleted through administrative interfaces. Workspace deletion requires platform-level intervention and may result in data loss.

#### 3.1.2 Workspace Types

AetherTrackSAAS supports two workspace tiers: CORE and COMMUNITY. The tier determines available features, operational limits, and administrative capabilities.

### 3.2 CORE Workspaces

CORE workspaces provide the full capabilities of the AetherTrackSAAS platform. They are designed for organizations that require comprehensive workforce management features.

**Capabilities:**

- Unlimited users (subject to organizational requirements)
- Unlimited tasks
- Unlimited teams
- Full audit log access (12-month retention)
- Bulk CSV user import
- Advanced reporting and analytics
- Complete API access
- All role levels available
- Custom leave types and policies
- Detailed attendance tracking
- Project and sprint management

**Constraints:**

- Requires appropriate licensing or platform authorization
- All administrative actions are logged
- Workspace administrators must be assigned by super_admin

### 3.3 COMMUNITY Workspaces

COMMUNITY workspaces are designed for small teams, community groups, or organizations with limited requirements. They provide essential task management capabilities with strict operational limits.

**Capabilities:**

- Basic task management
- Team collaboration (limited)
- Standard user roles (member, team_lead, community_admin)
- Essential reporting

**Constraints:**

- Maximum 10 users
- Maximum 100 tasks total
- Maximum 3 teams
- No audit logs (administrative actions are not logged)
- No bulk CSV import
- Cannot create more than 10 users even if some are deactivated
- Cannot upgrade to CORE without platform intervention
- community_admin is the highest role level available

### 3.4 Configuration Boundaries Per Workspace Type

| Feature | CORE | COMMUNITY |
|---------|------|-----------|
| User Limit | Unlimited | 10 |
| Task Limit | Unlimited | 100 |
| Team Limit | Unlimited | 3 |
| Audit Logs | Yes (12 months) | No |
| Bulk Import | Yes | No |
| Advanced Reporting | Yes | Basic |
| API Access | Full | Limited |
| HR Module | Yes | Limited |
| Role Assignment | All levels | community_admin, team_lead, member only |
| Custom Leave Types | Yes | No |

### 3.5 Organizational Constraints

The platform enforces strict organizational constraints that administrators cannot override:

#### 3.5.1 COMMUNITY Workspace Limits

- **User Limit:** Maximum 10 active and inactive users combined. Attempts to add an 11th user will be rejected.
- **Task Limit:** Maximum 100 tasks across all teams. Attempts to create additional tasks will be rejected.
- **Team Limit:** Maximum 3 teams. Attempts to create a 4th team will be rejected.

#### 3.5.2 Email Uniqueness

Email addresses must be unique within a workspace. The platform prevents duplicate email addresses at the workspace level. This constraint applies to:

- User invitations
- Bulk CSV imports
- Manual user creation

**Consequence:** If an email address already exists in a workspace, the system will reject the creation attempt with an appropriate error message. Administrators must use a different email address or deactivate the existing user first.

#### 3.5.3 Reserved Team Names

The team name "Admin" is reserved by the platform and cannot be created in any workspace. Attempts to create a team with this name will be rejected.

**Consequence:** Administrators must choose an alternative team name. This restriction cannot be bypassed through character substitution, spacing, or other variations.

---

## 4. User Lifecycle Operations

This section describes the operations administrators perform to manage user accounts throughout their lifecycle—from creation through modification to eventual offboarding.

### 4.1 User Creation Methods

AetherTrackSAAS supports two methods for creating user accounts:

#### 4.1.1 Individual Invitation

Administrators can invite individual users by providing their email address and selecting an initial role. This method is suitable for adding one or two users at a time.

**Process:**

1. Administrator navigates to user management interface
2. Enters user's email address
3. Selects initial role (subject to role assignment constraints)
4. Submits invitation
5. System sends invitation email to the user's email address
6. User's state becomes PENDING

**Consequence:** The user receives an email with a link to complete registration. Until the user accepts the invitation and completes registration, the account remains in PENDING state with no system access.

#### 4.1.2 Bulk CSV Import

CORE workspace administrators can import multiple users simultaneously using a CSV file. This method is suitable for onboarding multiple employees at once.

**Process:**

1. Administrator prepares CSV file with required columns (email, name, role, team)
2. Administrator uploads CSV through admin interface
3. System validates CSV format and data
4. System creates PENDING users for each valid row
5. System reports success/failure for each row
6. Invitation emails are sent to all successfully created users

**Constraints:**

- Only available in CORE workspaces
- Maximum file size: 5MB
- Maximum rows per import: 500
- Email must be unique within workspace (fails row-level)
- Role must be valid (fails row-level)
- Team must exist (fails row-level)

**Consequence for COMMUNITY workspaces:** Bulk CSV import is not available. Administrators must use individual invitation only.

### 4.2 User States

Users in AetherTrackSAAS exist in one of three states. State determines what the user can and cannot do within the platform.

#### 4.2.1 ACTIVE State

Users in ACTIVE state have full system access according to their role privileges.

**Characteristics:**

- Can log in to the platform
- Can access all features permitted by their role
- Can create, modify, and complete tasks
- Can submit leave requests
- Can view and generate reports
- Appears in user directories and team rosters

**Transition to ACTIVE:** Users become ACTIVE when:
- They accept an invitation and complete registration
- An administrator reactivates an INACTIVE user

#### 4.2.2 INACTIVE State

Users in INACTIVE state have their access suspended. Their data is preserved but they cannot log in or access the platform.

**Characteristics:**

- Cannot log in to the platform
- Cannot access any platform features
- Data is preserved (tasks, leave history, attendance records)
- Appears in historical reports
- Does not appear in active user directories
- Cannot be assigned new tasks

**Transition to INACTIVE:** Users become INACTIVE when:
- An administrator deactivates the user
- A leave request is approved with status "on_notice"

**Transition from INACTIVE:** Users become ACTIVE when:
- An administrator reactivates the user

#### 4.2.3 PENDING State

Users in PENDING state have been invited but have not yet completed registration. They have no system access until they accept the invitation.

**Characteristics:**

- Cannot log in to the platform
- Cannot access any platform features
- Invitation email has been sent
- Has no password set
- Does not count against user limits until activated

**Transition from PENDING:** Users become ACTIVE when:
- They click the invitation link
- They complete the registration process
- They set their password

**Transition from PENDING:** Invitations expire after 7 days. After expiration, the user remains in PENDING state but cannot complete registration. Administrators must re-invite the user.

### 4.3 State Transitions and Their Effects

| Transition | Trigger | Effect |
|------------|---------|--------|
| PENDING → ACTIVE | Invitation accepted | Full access granted |
| PENDING → (expired) | 7 days without acceptance | Invitation link invalid |
| ACTIVE → INACTIVE | Admin deactivation | Login blocked, data preserved |
| INACTIVE → ACTIVE | Admin reactivation | Full access restored |
| ACTIVE → ON_NOTICE | Leave request approved | Login blocked at end of notice period |
| ON_NOTICE → EXITED | Notice period complete | User deactivated |

### 4.4 Role Assignment and Role Change Mechanics

#### 4.4.1 Initial Role Assignment

When a user is created (via invitation or import), an initial role must be assigned. The available roles depend on:

- Workspace tier (CORE vs COMMUNITY)
- Administrator's authority level

**Constraints:**

- Administrators cannot assign roles higher than their own level
- super_admin can only be assigned by existing super_admin
- community_admin only available in COMMUNITY workspaces

#### 4.4.2 Role Changes

Administrators can change a user's role at any time. Role changes take effect immediately for subsequent actions.

**Process:**

1. Administrator selects user from user management
2. Administrator selects new role
3. System validates the administrator's authority to assign that role
4. System updates user's role
5. Change is logged in audit trail (CORE workspaces)

**Consequence of Role Demotion:** When a user's role is demoted (e.g., from admin to member):

- **Immediate effect:** The user loses access to administrative features for new actions
- **Token invalidation:** Existing authentication tokens are NOT invalidated. The user remains logged in until their token expires naturally
- **Data access:** The user retains access to data they previously created

**Consequence of Role Promotion:** When a user's role is promoted (e.g., from member to admin):

- **Immediate effect:** The user gains access to administrative features immediately
- **Token status:** Existing tokens remain valid; new features are accessible

**Note:** Role demotion does NOT trigger automatic token invalidation. Users with demoted roles will retain session access until their tokens expire (15 minutes for access tokens, 7 days for refresh tokens). If immediate revocation is required, administrators should deactivate the user account.

### 4.5 Leave, Suspension, and Offboarding Behavior

#### 4.5.1 Leave Workflow

When a user submits a leave request with type "resignation" or "termination", the system initiates a leave workflow:

1. User submits leave request with appropriate leave type
2. HR or Admin approves the request
3. User's status changes to ON_NOTICE
4. Task reallocation process is triggered (see Section 6)
5. At the end of the notice period, user status changes to EXITED

**Consequence:** ON_NOTICE users are typically allowed to continue working during their notice period. Once the notice period ends, the user is automatically transitioned to INACTIVE state.

#### 4.5.2 User Suspension

The platform does not have a dedicated "suspension" state. However, administrators can achieve suspension equivalent by:

- **Deactivating the user:** Sets status to INACTIVE, blocks login immediately
- **Removing all roles:** Removes role assignment, but user may retain basic access

**Recommendation:** For temporary suspension, deactivate the user. Reactivate when suspension is lifted.

#### 4.5.3 Offboarding

Offboarding is the process of permanently removing a user's access when they leave the organization. The platform supports two offboarding approaches:

**Soft Offboard (Recommended):**

1. Deactivate the user (status becomes INACTIVE)
2. Data is preserved
3. Historical records remain intact
4. User can be reactivated if needed

**Hard Offboard:**

1. Delete the user (only available through database operations)
2. All data is permanently removed
3. Cannot be undone
4. Requires super_admin intervention

**Consequence:** Deleted users cannot be recovered. All associated data (tasks, leave history, attendance records) is permanently lost.

### 4.6 Deactivation vs Deletion

| Aspect | Deactivation | Deletion |
|--------|--------------|----------|
| State Change | ACTIVE → INACTIVE | Permanent removal |
| Login Access | Blocked immediately | N/A |
| Data Preservation | All data preserved | All data permanently deleted |
| Reversibility | Yes (reactivation) | No |
| Audit Trail | Preserved | Preserved (if deletion logged) |
| Email Release | No (email remains in workspace) | Yes (email can be reused) |
| Triggered By | Admin action | Database operation only |

---

## 5. Role and Permission Management

This section details the permission model, constraints on role assignment, and the operational effects of permission changes.

### 5.1 Permission Boundaries Per Role

Each role in the six-tier hierarchy has specific permissions that define what actions the role can perform. Permissions are checked at the time of action execution.

#### 5.1.1 Permission Categories

**User Management Permissions:**

- create_user: Invite or create new users
- read_user: View user information
- update_user: Modify user attributes (except role)
- delete_user: Permanently remove users
- assign_role: Change user roles
- deactivate_user: Set user to INACTIVE
- reactivate_user: Set user to ACTIVE

**Team Management Permissions:**

- create_team: Create new teams
- read_team: View team information
- update_team: Modify team settings
- delete_team: Remove teams
- manage_team_members: Add/remove team members

**Task Management Permissions:**

- create_task: Create new tasks
- read_task: View task information
- update_task: Modify task attributes
- delete_task: Remove tasks
- assign_task: Assign tasks to users
- reassign_task: Change task assignment

**Workspace Management Permissions:**

- read_workspace: View workspace settings
- update_workspace: Modify workspace settings
- manage_workspace_users: Full user management within workspace

**HR Permissions:**

- manage_leave_types: Create/modify leave types
- approve_leave: Approve/reject leave requests
- view_attendance: View attendance records
- manage_hr_reports: Access HR analytics

**Audit Permissions:**

- read_audit_logs: View audit trail
- export_audit_logs: Export audit data

#### 5.1.2 Permission Matrix

| Permission | super_admin | admin | hr | team_lead | member | community_admin |
|------------|-------------|-------|----|-----------|--------|-----------------|
| create_user | ✓ | ✓* | ✓ | ✗ | ✗ | ✗ |
| read_user | ✓ | ✓ | ✓ | Team only | Self | Workspace |
| update_user | ✓ | ✓* | Limited | ✗ | Self | ✗ |
| delete_user | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| assign_role | ✓ | ✓* | ✗ | ✗ | ✗ | ✗ |
| deactivate_user | ✓ | ✓* | ✗ | ✗ | ✗ | ✗ |
| reactivate_user | ✓ | ✓* | ✗ | ✗ | ✗ | ✗ |
| create_team | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| read_team | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| update_team | ✓ | ✓ | ✗ | Own team | ✗ | ✗ |
| delete_team | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| manage_team_members | ✓ | ✓ | ✗ | Own team | ✗ | ✗ |
| create_task | ✓ | ✓ | ✓ | Own team | ✗ | ✓ |
| read_task | ✓ | ✓ | ✓ | Own team | Assigned | ✓ |
| update_task | ✓ | ✓ | ✓ | Own team | Assigned | Assigned |
| delete_task | ✓ | ✓ | ✗ | Own team | ✗ | ✗ |
| assign_task | ✓ | ✓ | ✓ | Own team | ✗ | ✗ |
| reassign_task | ✓ | ✓ | ✓ | Own team | ✗ | ✗ |
| read_workspace | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| update_workspace | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| manage_leave_types | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| approve_leave | ✓ | ✓ | ✓ | Team | ✗ | ✗ |
| view_attendance | ✓ | ✓ | ✓ | Team | Self | Limited |
| read_audit_logs | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |

*Limited to assigned workspace(s)

### 5.2 Role Assignment Constraints

Role assignment is subject to the following constraints:

#### 5.2.1 Hierarchical Constraints

- Administrators cannot assign roles at or above their own privilege level
- A Level 3 (team_lead) cannot assign admin or hr roles
- A Level 4 (hr) cannot assign admin or super_admin roles
- Only super_admin (Level 6) can assign super_admin role

#### 5.2.2 Workspace Constraints

- Administrators can only assign roles within their assigned workspace(s)
- A user assigned to Workspace A cannot be given a role in Workspace B by Workspace A's admin
- Cross-workspace role assignment requires super_admin intervention

#### 5.2.3 Workspace Tier Constraints

In COMMUNITY workspaces:

- community_admin is the highest assignable role
- admin, hr, and super_admin roles cannot be assigned
- Maximum of 10 users (active + inactive) in the workspace

### 5.3 Effects of Permission Changes

When an administrator modifies a user's role, the following effects occur:

#### 5.3.1 Immediate Effect on Access

Permission changes take effect immediately upon save. The user's new permissions are enforced for all subsequent actions.

**Example:** If an admin demotes a user from admin to member:

- Immediately: User cannot access admin-only functions
- Immediately: User cannot view admin-only menus
- Immediately: User cannot perform admin-only actions

#### 5.3.2 Token Invalidation Behavior

**Critical:** Role demotion does NOT invalidate existing authentication tokens.

**What this means:**

- Access tokens (15-minute expiry) remain valid until natural expiration
- Refresh tokens (7-day expiry) remain valid until natural expiration
- Users with demoted roles can continue using existing sessions

**Operational implication:** If immediate revocation is required:

- Deactivate the user account (this blocks login)
- Or wait for tokens to expire naturally

**What this does NOT mean:**

- Role promotion does not require any special token handling (new permissions are available immediately)
- The system does not provide a "force logout" feature for specific users

### 5.4 Privilege Escalation Prevention

The platform prevents unauthorized privilege escalation through:

1. **Server-side validation:** All role assignments are validated against the assigner's permissions
2. **Audit logging:** All role changes are logged (CORE workspaces)
3. **No self-assignment:** Users cannot modify their own roles
4. **No cross-workspace assignment:** Admins cannot assign roles outside their workspace

---

## 6. Operational Workflows

This section describes the standard operational workflows that administrators and team leads perform, including task management, escalation procedures, and handling of administrative unavailability.

### 6.1 Task Ownership and Reassignment Mechanics

#### 6.1.1 Task Creation

Tasks can be created by administrators, team leads, and members (depending on role and workspace configuration).

**Task Creation Process:**

1. Creator specifies task title, description, and attributes
2. Creator assigns task to a user or team
3. System validates creator's permissions
4. Task is created with assigned owner(s)
5. Task appears in assignee's task list

#### 6.1.2 Task Reassignment

Tasks can be reassigned by administrators, team leads, or the current assignee (depending on workspace configuration).

**Manual Reassignment:**

1. Administrator or team lead selects task
2. Administrator or team lead chooses new assignee
3. System validates permission to reassign
4. Task assignment is updated
5. Notification sent to new assignee

#### 6.1.3 Automatic Task Reallocation

When a user enters the leave workflow (leave request approved with resignation/termination type), the system triggers automatic task reallocation.

**Trigger Conditions:**

- Leave request approved with leave type "resignation" or "termination"
- User status changes to ON_NOTICE

**Reallocation Priority:**

The system follows this escalation order to find a new task owner:

1. **Project Team Lead:** The team lead of the project to which the task belongs
2. **Project Creator:** The user who created the project
3. **User's Team Lead:** The team lead of the team to which the departing user belongs
4. **Any Team Lead:** Any available team lead in the workspace

**Team Lead Actions:**

When a team lead receives a reallocation request, they can:

- **Accept:** Take ownership of the task
- **Reject:** Refuse ownership with a required reason
- **Redistribute:** Assign to another team member (if permitted)

**No Available Team Lead:**

If no team lead can be found at any priority level:

1. The task is skipped (remains unassigned)
2. HR and/or Administrator is notified
3. Task remains in system with warning indicator

**Consequence:** Unassigned tasks due to reallocation failure require manual administrative intervention.

### 6.2 Escalation Paths

#### 6.2.1 Primary Assignee Unavailable

When the primary task assignee is unavailable (absent, on leave, or deactivated):

**Recommended Actions:**

1. Team lead or administrator identifies unassigned or stalled tasks
2. Reassigns task to another available team member
3. Or escalates to project-level team lead

**Automatic Handling:**

- If user is deactivated, automatic reallocation process triggers
- If user is on short-term leave, tasks remain assigned but may need manual reassignment

#### 6.2.2 Admin Unavailability

When the workspace administrator is unavailable (absent, on leave, or no longer with the organization):

**Planned Absence (Leave):**

- Administrator should ensure backup admin is designated
- Or elevate at least one user to admin role before leave
- super_admin can re-assign admin roles if needed

**Unexpected Absence (Emergency):**

- super_admin can access any workspace
- super_admin can assign emergency admin role to another user
- No automatic admin backup exists

**Consequence:** If no administrator is available:

- User creation/role changes are blocked
- Leave approvals are delayed
- Task reassignments requiring admin authority are blocked
- Team lead-level actions continue normally

### 6.3 System Fallback Behavior

The platform has limited automatic fallback capabilities. Administrators should understand the following behaviors:

#### 6.3.1 Authentication Failures

- After 5 failed login attempts within 15 minutes, the account is temporarily locked
- Lockout duration: 15 minutes
- User can use "forgot password" to reset (limited to 3 requests per 15 minutes)

#### 6.3.2 Token Expiration

- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Users must re-authenticate after expiration
- No automatic re-authentication

#### 6.3.3 Rate Limiting

- API requests exceeding rate limits receive 429 (Too Many Requests) response
- Rate limits are not configurable by administrators
- Current limits:
  - Login: 5 attempts per 15 minutes
  - Token refresh: 20 requests per hour
  - Forgot password: 3 requests per 15 minutes

### 6.4 Team Lead Responsibilities

Team leads have specific operational responsibilities within their team(s):

#### 6.4.1 Task Management

- Create tasks for team members
- Review and approve task completion
- Reassign tasks within the team
- Escalate task issues to admin

#### 6.4.2 Leave Management

- Approve or reject leave requests for team members (within policy)
- Manage team coverage during absences

#### 6.4.3 Team Administration

- Add/remove members from their team(s)
- View team performance metrics
- Ensure team compliance with policies

#### 6.4.4 Limitations

Team leads CANNOT:

- Create or delete teams
- Access workspace configuration
- Modify users outside their team
- View financial or sensitive HR data

---

## 7. Monitoring and Audit Operations

This section describes the auditing capabilities available to administrators, what's logged, and the differences between CORE and COMMUNITY workspace audit capabilities.

### 7.1 Audit Logs and What They Capture

AetherTrackSAAS maintains an audit trail of administrative and significant user actions. The audit system captures:

#### 7.1.1 Logged Information

Each audit log entry contains:

| Field | Description |
|-------|-------------|
| user_id | Unique identifier of the user who performed the action |
| user_email | Email address of the user who performed the action |
| user_ip | IP address from which the action was initiated |
| target_type | Type of object being acted upon (User, Task, Team, etc.) |
| target_id | Unique identifier of the target object |
| target_name | Display name of the target object |
| action | The action performed (create, update, delete, login, etc.) |
| description | Human-readable description of the action |
| metadata | Additional structured data about the action |
| changes | Before/after values for modifications |
| timestamp | Date and time when the action occurred (UTC) |

#### 7.1.2 Actions That Are Logged

The following categories of actions are logged:

**Authentication Events:**

- Successful login
- Failed login attempt
- Logout
- Password change
- Password reset

**User Management Events:**

- User creation
- User invitation
- User activation
- User deactivation
- User deletion
- Role changes
- Profile updates

**Team Management Events:**

- Team creation
- Team modification
- Team deletion
- Team member added
- Team member removed

**Task Management Events:**

- Task creation
- Task assignment
- Task reassignment
- Task completion
- Task deletion

**Leave Management Events:**

- Leave request submission
- Leave request approval
- Leave request rejection
- Leave balance adjustments

**Workspace Events:**

- Workspace configuration changes
- Integration changes

### 7.2 Administrative Traceability

Audit logs provide administrative traceability by enabling:

1. **Action Accountability:** Every administrative action can be traced to a specific user
2. **Temporal Analysis:** Actions can be reviewed chronologically
3. **Target Tracking:** All actions on a specific object can be traced
4. **User Activity Review:** All actions by a specific user can be reviewed

### 7.3 Retention and Visibility Limitations

#### 7.3.1 Retention Period

- **CORE workspaces:** 12 months
- **COMMUNITY workspaces:** Not available

Audit logs older than the retention period are automatically purged. There is no mechanism to restore purged logs.

#### 7.3.2 Query Limitations

- **Maximum date range:** 90 days per query
- Administrators cannot query beyond 90 days even if data exists
- This limitation applies even to super_admin

#### 7.3.3 Access Restrictions

- **CORE workspaces:** Administrators can view workspace-specific logs
- **COMMUNITY workspaces:** No audit logs available
- Only super_admin can view cross-workspace audit data

### 7.4 What CORE Workspaces Get vs COMMUNITY Workspaces

| Audit Feature | CORE | COMMUNITY |
|---------------|------|-----------|
| Audit Logging | Yes | No |
| Retention Period | 12 months | N/A |
| Log Access | Admin+ | N/A |
| Cross-Workspace View | super_admin only | N/A |
| Export Capability | Yes | No |
| Query Date Range | 90 days max | N/A |

**Consequence for COMMUNITY workspaces:** There is no administrative traceability. Administrators cannot determine who performed specific actions, when actions occurred, or review user activity. This represents a significant operational limitation.

---

## 8. Failure and Exceptional Scenarios

This section describes how the platform handles failure conditions, what happens when things go wrong, and what administrators can and cannot do in exceptional circumstances.

### 8.1 Partial System Unavailability Handling

#### 8.1.1 Authentication Service Unavailable

If the authentication service is unavailable:

- Users cannot log in
- Existing sessions may continue to work until token expiration
- Administrators cannot perform user management actions
- The system does not provide offline access

#### 8.1.2 Database Unavailability

If the database becomes unavailable:

- All read operations fail
- All write operations fail
- Users see error messages
- The system does not cache data for offline access

**Recovery:** Service recovers when database connection is restored. No data corruption occurs during temporary unavailability.

#### 8.1.3 Email Service Unavailable

If the email service is unavailable:

- User invitations cannot be sent
- Password reset emails cannot be sent
- Notification emails are queued or failed
- Administrative actions complete but notifications fail silently

**Recovery:** Email delivery resumes when service is restored. Failed emails are not automatically retried.

### 8.2 Misconfiguration Impact

#### 8.2.1 Invalid Workspace Settings

If workspace settings are misconfigured:

- Invalid settings are typically ignored rather than causing errors
- System uses default values for undefined settings
- Administrators should review settings after any changes

#### 8.2.2 Invalid Role Assignments

If an invalid role is assigned:

- Server-side validation rejects the request
- Error message indicates the constraint violation
- No partial assignment occurs

#### 8.2.3 Exceeding Workspace Limits

In COMMUNITY workspaces, attempting to exceed limits:

- User creation fails when limit is reached
- Task creation fails when limit is reached
- Team creation fails when limit is reached
- Error message clearly indicates the limit

### 8.3 Invalid or Blocked Admin Actions

#### 8.3.1 Actions That Are Prevented by Design

The platform prevents the following administrative actions:

1. **Self-role modification:** Users cannot change their own role
2. **Cross-workspace access:** Admins cannot access other workspaces
3. **Reserved names:** "Admin" team name cannot be used
4. **Duplicate emails:** Same email cannot exist in workspace
5. **Role escalation:** Cannot assign roles above own privilege level
6. **Unauthorized deletions:** Cannot delete users without appropriate permissions

#### 8.3.2 Error Messages

When admin actions are blocked, the system returns appropriate error messages. Common error scenarios:

| Scenario | Error Message | Resolution |
|----------|---------------|------------|
| Exceeded user limit | "Workspace user limit exceeded" | Upgrade to CORE or remove users |
| Reserved team name | "Team name 'Admin' is reserved" | Choose different name |
| Duplicate email | "Email already exists in workspace" | Use different email |
| Insufficient permissions | "You do not have permission to perform this action" | Request elevated role |
| Invalid role | "Role not available for this workspace tier" | Select valid role |

### 8.4 Error Handling for Common Admin Operations

#### 8.4.1 Bulk Import Failures

When bulk CSV import encounters errors:

- Valid rows are processed
- Invalid rows are skipped with error descriptions
- Summary report shows success/failure for each row
- Administrator must correct errors and re-import failed rows

#### 8.4.2 Task Reallocation Failures

When automatic task reallocation fails:

- Task remains with original assignee (if available)
- If assignee is deactivated, task may become unassigned
- Administrator is notified
- Manual reassignment required

#### 8.4.3 Leave Balance Errors

Leave balances cannot go negative. If an operation would result in negative balance:

- Operation is rejected
- Error message indicates insufficient balance
- User must request different leave type or wait for balance to accrue

### 8.5 Data Isolation Mechanisms

The platform implements data isolation through:

1. **Workspace-based isolation:** Data is isolated at the workspace level
2. **Role-based access:** Users can only access data permitted by their role
3. **Team-based isolation:** Team leads can only access their team's data
4. **Query-level filtering:** Database queries automatically filter by workspace

**Consequence:** There is no mechanism for administrators to bypass workspace isolation. Cross-workspace access requires super_admin privileges.

---

## 9. Operational Assumptions and Constraints

This section documents the technical and organizational constraints that administrators must operate within, including what's NOT guaranteed by the platform.

### 9.1 Technical Constraints

#### 9.1.1 Token Expiration

- **Access Token:** 15 minutes expiration
- **Refresh Token:** 7 days expiration

**Implication:** Users must re-authenticate after 15 minutes of inactivity. Long-running operations should handle token expiration.

#### 9.1.2 Rate Limits

The platform enforces rate limits that cannot be modified by administrators:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Token Refresh | 20 requests | 1 hour |
| Forgot Password | 3 requests | 15 minutes |

**Implication:** Automated systems must respect these limits or will be blocked.

#### 9.1.3 API Limitations

- Bulk operations are limited to 500 records per request
- Query results are paginated
- Real-time data is not guaranteed

### 9.2 Organizational Constraints

#### 9.2.1 Workspace Limits

**COMMUNITY workspaces:**

- Maximum 10 users (active + inactive)
- Maximum 100 tasks
- Maximum 3 teams

**CORE workspaces:**

- No hard limits, but subject to licensing

#### 9.2.2 Email Constraints

- Email addresses must be unique within a workspace
- Email addresses must be valid format
- Email domains are not validated

#### 9.2.3 Leave Constraints

- Leave balances cannot go negative
- Leave types are workspace-specific
- Leave policies cannot exceed available balance

### 9.3 Security-Related Constraints

#### 9.3.1 Encryption

- **Data at rest:** Platform-managed encryption is applied
- **Data in transit:** TLS/SSL is enforced
- **End-to-end encryption:** NOT available

**Implication:** The platform operator has access to unencrypted data. Sensitive data requiring end-to-end encryption should not be stored in the platform.

#### 9.3.2 Key Management

- **Customer-managed keys:** NOT available
- **Platform-managed keys:** Used for all encryption

**Implication:** Key management is entirely the platform operator's responsibility.

#### 9.3.3 Data Residency

- **Data residency guarantees:** NOT available
- **Data location:** Not guaranteed to remain in specific geographic region

**Implication:** Data may be stored in any data center at the platform operator's discretion.

#### 9.3.4 Compliance

- **Compliance certifications:** NONE held or claimed
- **HIPAA:** NOT compliant
- **SOC 2:** NOT certified
- **ISO 27001:** NOT certified

**Implication:** Organizations with compliance requirements must evaluate whether the platform meets their needs. The platform makes no compliance guarantees.

### 9.4 Data Isolation Mechanisms

The platform provides data isolation through:

1. **Workspace-level isolation:** Each workspace's data is logically separated
2. **Role-based access control (RBAC):** Access is controlled by role privileges
3. **Team-level scoping:** Team leads only access their team's data
4. **Query filtering:** All database queries include workspace filters

**What isolation DOES provide:**

- Users in Workspace A cannot access Workspace B's data
- Members cannot access admin functions
- Team leads cannot access other teams' data

**What isolation DOES NOT provide:**

- Cross-workspace reporting or aggregation
- Data export across workspaces
- Platform-wide search

### 9.5 What Is NOT Guaranteed by the Platform

Administrators should understand the following guarantees are NOT made:

| Aspect | Guarantee Status |
|--------|------------------|
| Data availability | No uptime SLA |
| Data durability | No explicit durability guarantee |
| Performance | No performance SLA |
| Data retention beyond limit | Data may be purged |
| Cross-workspace access | Not supported |
| End-to-end encryption | Not available |
| Customer-managed keys | Not available |
| Specific data residency | Not guaranteed |
| Compliance certifications | None claimed |
| Token persistence after demotion | Tokens remain valid |
| Immediate role changes | Effective immediately, but sessions persist |
| Audit log availability | 12 months max (CORE only) |
| Offline functionality | Not available |
| Mobile app support | Not guaranteed |

---

## 10. Summary

This section provides a concise summary of the key points administrators should understand about operating AetherTrackSAAS.

### 10.1 What Administrators Should Clearly Understand

1. **Authority is scoped:** Administrators can only manage within their assigned workspace(s). Cross-workspace access requires super_admin intervention.

2. **Role hierarchy matters:** The six-tier role system (super_admin → admin → hr → team_lead → member → community_admin) determines what actions administrators can perform. Higher roles cannot be assigned without appropriate authority.

3. **State changes have consequences:** User state changes (ACTIVE → INACTIVE → ACTIVE) have specific effects on access and data. Deactivation blocks login but preserves data; deletion removes data permanently.

4. **Workspace type determines capability:** CORE workspaces offer full functionality with audit logging; COMMUNITY workspaces have strict limits and no audit capability.

5. **Token behavior is deterministic:** Role changes take effect immediately, but existing tokens are NOT invalidated. If immediate revocation is required, deactivate the account.

### 10.2 Key Responsibilities

Administrators are responsible for:

1. **User lifecycle management:** Creating, managing, and offboarding users within workspace constraints

2. **Role assignment:** Assigning appropriate roles to users based on job function, respecting role hierarchy constraints

3. **Workspace configuration:** Managing workspace settings within platform-defined boundaries

4. **Compliance with limits:** Operating within COMMUNITY workspace limits (10 users, 100 tasks, 3 teams)

5. **Audit review:** Reviewing audit logs to maintain accountability (CORE workspaces only)

6. **Task oversight:** Ensuring tasks are assigned and completed, including handling reallocation when users leave

### 10.3 Actions That Should Be Taken with Caution

The following actions require careful consideration:

1. **User deactivation:** Blocks login immediately but preserves data. Consider if reactivation may be needed.

2. **Role demotion:** Takes effect immediately but does NOT invalidate existing tokens. User sessions continue until token expiration.

3. **Bulk operations:** Affect multiple users. Validate data before import; understand partial failure scenarios.

4. **Leave approvals with resignation type:** Triggers automatic task reallocation and user deactivation workflow.

5. **Cross-workspace actions:** Require super_admin; should be rare and carefully considered.

6. **Team deletion:** Removes all team associations; tasks may be affected.

### 10.4 Critical Operational Boundaries

Administrators MUST NOT assume the following capabilities exist:

| Boundary | Description |
|----------|-------------|
| No end-to-end encryption | Platform can access unencrypted data |
| No customer-managed keys | Encryption is platform-managed only |
| No compliance certifications | No HIPAA, SOC 2, ISO 27001, etc. |
| No data residency guarantees | Data may be stored anywhere |
| No token invalidation on role change | Must deactivate for immediate revocation |
| No cross-workspace access | Workspace isolation is enforced |
| No offline capability | Always requires network connectivity |
| No audit in COMMUNITY | No administrative traceability |

### 10.5 Final Operational Guidance

To operate AetherTrackSAAS effectively:

1. **Understand your role level:** Know what your role permits and prohibits

2. **Plan for contingencies:** Designate backup administrators; understand escalation paths

3. **Monitor audit logs:** Regularly review administrative actions (CORE workspaces)

4. **Respect constraints:** Operate within workspace limits; do not assume limits can be bypassed

5. **Document changes:** Maintain internal records of significant administrative actions

6. **Test workflows:** Validate task reallocation, leave workflows, and user state changes in non-production first

7. **Plan for emergencies:** Know how to contact super_admin; understand what happens if admin is unavailable

This document represents the authoritative operational reference. Administrators should consult this document when planning or executing administrative actions to ensure predictable outcomes.

---

 deterministic,**Document End**

*Last Updated: 2026-02-26*
