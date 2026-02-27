# AetherTrackSAAS Administrator Guide

**Document Version:** 1.0  
**Last Updated:** February 2026

---

## 1. Purpose of This Document

This Administrator Guide provides comprehensive documentation for managing the AetherTrackSAAS platform at the administrative level. The document covers the responsibilities, procedures, and best practices that Workspace Administrators and System Administrators need to effectively manage users, teams, workspaces, leave, holidays, and platform security.

This guide serves as the primary reference for day-to-day administrative operations and strategic platform management. It explains not only *how* to perform administrative tasks but also *why* certain procedures exist and when to apply them.

---

## 2. Who Should Read This Document

This guide is designed for the following roles:

### Primary Audience

- **System Administrators:** Professionals responsible for platform-wide administration, including managing multiple workspaces, configuring global settings, and overseeing platform security. System Administrators have access to all workspaces and can perform actions across the entire platform.

- **Workspace Administrators:** Professionals responsible for managing a specific workspace within the platform. Workspace Administrators have full control over their assigned workspace, including user management, team configuration, and workspace settings.

### Secondary Audience

- **Community Administrators:** Professionals managing COMMUNITY tier workspaces with limited administrative capabilities. This guide explains which features are available and which are restricted for Community workspaces.

- **HR Personnel:** While not primary administrators, HR staff may benefit from understanding user management, leave management, and reporting features described in this guide.

---

## 3. High-Level Overview: Administrative Responsibilities

The AetherTrackSAAS platform assigns administrative responsibilities across six distinct roles, each with specific permissions and scope. Understanding this hierarchy is essential before performing any administrative task.

### Role Hierarchy and Scope

| Role | Scope | Primary Responsibilities |
|------|-------|--------------------------|
| System Admin | Platform-wide | All workspaces, global settings, security |
| Workspace Admin | Single CORE workspace | Full workspace control, user/team management |
| Community Admin | Single COMMUNITY workspace | Limited workspace management |
| HR | Within workspace | User management, leave approvals, reporting |
| Team Lead | Within assigned team | Task management, team performance |
| Member | Individual | Personal task management |

### Administrative Responsibilities by Tier

**System Administrators** bear the broadest responsibility, overseeing the entire platform. Their duties include creating and managing workspaces, appointing Workspace Administrators, configuring platform-wide security policies, accessing audit logs across all workspaces, and resolving escalated issues that Workspace Administrators cannot address.

**Workspace Administrators** focus on their specific workspace. They manage all users within the workspace, create and configure teams, set workspace-specific policies, configure leave types and holiday calendars, monitor workspace usage and performance, and handle day-to-day administrative requests.

**Community Administrators** perform similar duties to Workspace Administrators but within the constraints of the COMMUNITY tier. These constraints include a maximum of 10 users, 100 tasks, and 3 teams per workspace.

### Workspace Types

AetherTrackSAAS operates two workspace tiers with distinct capabilities:

**CORE Workspaces** are paid, enterprise-level workspaces designed for organizations requiring unlimited users, tasks, and teams. CORE workspaces include access to audit logs, bulk import functionality, and advanced reporting features.

**COMMUNITY Workspaces** are free tier workspaces limited to 10 users, 100 tasks, and 3 teams. COMMUNITY workspaces do not have access to audit logs or bulk import features. These limitations are enforced by the platform and cannot be overridden by administrators.

---

## 4. Detailed Administrative Sections

### 4.1 Admin Dashboard Overview

The Admin Dashboard serves as the central hub for all administrative operations. Upon logging in with administrator credentials, the dashboard provides immediate visibility into workspace health, pending approvals, and key metrics.

#### Dashboard Components

**Workspace Summary Card** displays the current workspace name, type (CORE or COMMUNITY), user count, active task count, and team count. For CORE workspaces, this card also shows storage usage and subscription status.

**Quick Actions Panel** provides one-click access to the most frequently performed administrative tasks: adding a new user, creating a team, reviewing pending leave requests, and accessing workspace settings.

**Pending Approvals Section** lists all leave requests, task reallocation requests, and other items requiring administrative approval. This section displays the requester's name, request type, submission date, and current status. Administrators should review this section at least daily to maintain operational efficiency.

**Activity Feed** shows recent actions taken within the workspace, including user logins, task updates, team changes, and leave approvals. This feed provides real-time visibility into workspace activity and helps identify unusual patterns.

**Metrics Overview** presents key performance indicators including active users versus inactive users, tasks by status (pending, in progress, completed), leave balance utilization, and team productivity scores. These metrics update in real-time and can be filtered by date range.

#### Accessing the Dashboard

System Administrators access the dashboard through the platform's main navigation by selecting "Admin Panel" from the system menu. Workspace Administrators find the dashboard accessible from their workspace dropdown menu under "Workspace Dashboard." The dashboard URL follows the pattern `https://app.aethertrack.com/{workspace-slug}/admin` for Workspace Administrators and `https://app.aethertrack.com/system/admin` for System Administrators.

---

### 4.2 User Management

User management forms the foundation of workspace administration. Proper user management ensures appropriate access control, maintains data integrity, and supports organizational workflow.

#### Creating Individual Users

Administrators create users by navigating to the Users section within the admin panel and selecting "Add New User." The creation process requires the following fields:

**Required Information** includes email address (which serves as the unique identifier), first name, last name, and role assignment. The email address must be unique across the platform; duplicate email addresses are not permitted under any circumstances.

**Optional Information** includes phone number for notification purposes, department assignment, manager reporting line, and custom profile fields configured by the workspace.

Upon submission, the system sends an invitation email to the provided address. The invitation includes a secure link that expires after 72 hours. Users who do not receive the email can request a new invitation through the login page. The administrator can also resend invitations from the user management interface.

#### Bulk User Import (CORE Workspaces Only)

CORE workspace administrators can import multiple users simultaneously using the bulk import feature. This feature significantly reduces the time required to onboard large teams.

**Preparing Import Data:** Administrators must prepare a CSV file with the following columns: `email`, `firstName`, `lastName`, `role`, `teamId` (optional), `department` (optional). The file must use UTF-8 encoding and cannot exceed 5,000 rows per import.

**Import Process:** Navigate to Users → Bulk Import → Upload CSV. The system validates the file format and data integrity before processing. Common validation errors include invalid email format, missing required fields, and duplicate email addresses. The system displays all validation errors before any data is processed, allowing administrators to correct the file and re-upload.

**Processing and Review:** After successful validation, the system displays a preview of users to be created. Administrators review the preview and confirm the import. The system then creates all valid user accounts and sends invitation emails individually. Failed rows are logged with specific error reasons, allowing administrators to address them separately.

Bulk import is not available for COMMUNITY workspaces due to platform limitations. Administrators in COMMUNITY workspaces must create users individually.

#### User Activation and Deactivation

Users can exist in three states within the platform: Active, Inactive, and Pending.

**Active Users** have full access to the platform based on their role permissions. Active users count toward the workspace user limit.

**Inactive Users** retain their profile and historical data but cannot log in or perform any platform actions. Inactive users do not count toward the workspace user limit. Administrators should deactivate users who depart the organization or who no longer require platform access rather than deleting them, as deactivation preserves audit trail integrity.

**Pending Users** have been created but have not yet accepted their invitation. Pending users do not count toward the workspace user limit until they activate their account.

To change user status, administrators navigate to the user list, select the target user, and use the status dropdown to activate, deactivate, or resend the invitation. Status changes are logged in the audit log for CORE workspaces.

#### Deleting Users

User deletion is a permanent action that removes all associated data including tasks, comments, and leave history. The platform does not provide a mechanism to recover deleted users.

Deletion is appropriate only in extreme circumstances such as duplicate accounts created in error or data privacy compliance requirements. Before deletion, administrators should deactivate the user instead to preserve audit trail data.

To delete a user, administrators must navigate to the user's profile, select "Delete Account," and confirm the action through a secondary confirmation dialog. System Administrators can delete users from any workspace. Workspace Administrators can only delete users within their own workspace.

#### Managing User Roles

User roles determine platform permissions. Administrators assign roles during user creation or modify them through the user's profile settings.

Role modifications take effect immediately. Users who have their role changed may lose access to certain features or gain access to features they previously could not use. Administrators should communicate role changes to affected users.

---

### 4.3 Team Management

Teams organize users into logical groups that reflect organizational structure. Effective team management enables focused task assignment, streamlined communication, and appropriate access control.

#### Creating Teams

Workspace Administrators create teams through the Teams section of the admin panel. Each team requires a unique name within the workspace and may optionally include a description and team-specific settings.

**Team Creation Process:** Navigate to Teams → Create New Team. Enter the team name (required), description (optional), and select an initial team lead. The team lead role is assigned separately from team creation; a team can exist without a lead temporarily.

Teams in COMMUNITY workspaces are limited to a maximum of 3 per workspace. This limit is enforced by the platform and cannot be exceeded. CORE workspaces have no team limit.

#### Assigning Team Leads

Each team should have a designated Team Lead who bears responsibility for team-level task management and team performance monitoring. Team Leads are assigned from among existing workspace users with appropriate permissions.

To assign a Team Lead, navigate to the team details page, select "Assign Team Lead," and choose from eligible users. A user is eligible to be a Team Lead if they hold the Team Lead, HR, Workspace Admin, or System Admin role. Team Leads can be reassigned at any time; the previous lead retains their role but loses team-level administrative permissions.

A user can serve as Team Lead for multiple teams. However, organizations should consider the administrative burden on individuals assigned to many teams.

#### Managing Team Members

Team members are users assigned to a specific team. Users can belong to multiple teams, though most organizational structures assign each user to one primary team.

**Adding Members:** Navigate to the team details page, select "Add Members," and choose users from the workspace user list. Users added to a team receive notification and can immediately see team tasks and communications.

**Removing Members:** Navigate to the team details page, select the member to remove, and choose "Remove from Team." Removed members retain their individual user account and can be added to other teams or remain unassigned. Removing a member from a team does not affect any tasks assigned to that member; those tasks remain in their queue.

**Bulk Member Operations:** Administrators can add or remove multiple team members simultaneously through the bulk operations interface. This is useful when restructuring teams or onboarding large groups.

#### Team Settings

Each team has configurable settings including default task view, notification preferences, and team-specific leave policies. These settings are accessed through the team's detail page under the "Settings" tab.

---

### 4.4 Workspace Settings

Workspace settings control the operational parameters of the workspace. These settings vary significantly between CORE and COMMUNITY workspace types.

#### Workspace Configuration (CORE Workspaces)

CORE workspace administrators have access to comprehensive configuration options:

**General Settings** include workspace name, workspace URL slug (customizable), contact email, timezone (affects all date/time displays), and language preference.

**Feature Flags** enable or disable specific platform features such as the gantt chart view, time tracking, file attachments, and custom workflows. Administrators should carefully evaluate each feature before enabling or disabling, as changes affect all workspace users.

**Branding Settings** allow workspace-specific logo upload, custom color scheme within defined constraints, and custom email footer text. These settings apply to emails sent from the workspace and to the workspace's web interface.

**Integration Settings** configure third-party integrations including calendar sync, notification webhooks, and SSO configuration. These settings require technical knowledge to configure correctly.

**Data Management** includes options for data export, backup frequency, and retention policies. Administrators should review these settings with their organization's data governance requirements.

#### Workspace Configuration (COMMUNITY Workspaces)

COMMUNITY workspaces have limited configuration options due to the free tier constraints:

**Editable Settings** include workspace name, contact email, and timezone. These mirror the CORE workspace general settings.

**Locked Settings** include feature flags (pre-configured for community usage), integration settings (disabled), and data management options (standard defaults apply). These cannot be modified by Community Administrators.

The COMMUNITY workspace type is designed to provide essential functionality without the configuration flexibility required for enterprise deployments.

#### Upgrading from COMMUNITY to CORE

Organizations that outgrow COMMUNITY workspace limits can upgrade to CORE. The upgrade process is initiated through the workspace settings page and requires confirmation from a billing administrator.

Upon upgrade, all workspace limits are immediately removed. Previously hidden features become available, and administrators gain access to audit logs and bulk import functionality. Existing data is preserved during the upgrade process.

---

### 4.5 Leave Management

Leave management enables administrators to configure leave types, manage leave balances, and process leave requests. This system supports organizational leave policies and ensures compliance with employment requirements.

#### Configuring Leave Types

Leave types define the categories of leave available within the workspace. Administrators create leave types to reflect their organization's leave policies.

**Creating Leave Types:** Navigate to Leave Management → Leave Types → Add New Leave Type. Required fields include leave type name (e.g., Annual Leave, Sick Leave, Personal Leave), accrual frequency (annual, monthly, or one-time allocation), and whether the leave type requires approval.

**Leave Type Configuration Options** include whether unused balance carries forward to the next period, maximum balance limit, whether the leave can be partially used, and whether manager approval is required in addition to admin approval.

Administrators can create an unlimited number of leave types in CORE workspaces. COMMUNITY workspaces are limited to 5 leave types.

#### Configuring Leave Balances

Leave balances represent the amount of leave available to each user for each leave type. Balances are managed through the Leave Balances section.

**Manual Balance Adjustment:** Administrators can manually adjust a user's leave balance for any leave type. Navigate to the user's profile, select Leave Balances, choose the leave type, and enter the adjustment amount (positive to add, negative to deduct). Each manual adjustment requires a reason that is recorded in the audit log.

**Automatic Accrual:** If leave types are configured with accrual, the system automatically adds to user balances based on the configured schedule. Accrual calculations run nightly; new balances are visible the following day.

#### Approving and Rejecting Leave Requests

Leave requests submitted by users require administrative approval before the leave is officially scheduled. Administrators review pending requests through the Leave Management dashboard.

**Approval Process:** Navigate to Leave Management → Pending Requests. Review each request's details including leave dates, leave type, and any notes provided by the requester. Select "Approve" or "Reject" and optionally add an administrative note. Approved requests immediately update the user's leave balance and appear on the team calendar.

**Rejection Process:** When rejecting a request, administrators must provide a reason. Common rejection reasons include insufficient leave balance, business operational requirements, or conflicts with already-approved leave. The rejection reason is visible to the requester.

**Batch Processing:** For organizations with high leave request volumes, administrators can approve or reject multiple requests simultaneously through the batch operations interface. This is accessible through the checkbox interface on the pending requests page.

#### Leave Request Policies

Administrators configure leave request policies to enforce organizational requirements:

**Advance Notice Requirement** specifies how far in advance users must submit leave requests. The system prevents submission of requests that do not meet the advance notice threshold.

**Blackout Periods** define dates when leave cannot be taken, such as mandatory office closure days or critical project periods. Blackout periods apply workspace-wide.

**Minimum Duration** specifies the shortest leave period acceptable for each leave type. This prevents users from taking leave for very short periods that may disrupt operations.

---

### 4.6 Holiday Management

Holiday management allows administrators to define company holidays that affect the leave calculation system. Properly configured holidays ensure accurate leave balances and employee awareness of office closures.

#### Creating Holidays

**Holiday Creation Process:** Navigate to Holiday Management → Add Holiday. Required fields include holiday name, date, and whether it recurs annually. Optional fields include description and whether the holiday affects all teams or specific teams.

**Recurring Holidays** automatically appear on the calendar each year without requiring manual recreation. Administrators should review recurring holidays annually to ensure accuracy.

**Team-Specific Holidays** allow organizations with diverse geographic locations to configure holidays relevant to specific teams. A holiday marked as team-specific does not affect users outside those teams.

#### Holiday Effects on Leave

Holidays affect the leave system in the following ways:

**Leave Deduction:** If a user has approved leave that includes a holiday date, the holiday is not deducted from their leave balance. The system automatically detects holiday conflicts and adjusts deduction calculations.

**Weekend Detection:** The system considers weekends when calculating leave duration. Leave that spans a weekend counts only working days against the user's balance.

**Calendar Integration:** Holidays sync with the user's calendar application if calendar integration is enabled, ensuring users see office closures in their personal schedules.

---

### 4.7 Audit Logs and Security

Audit logs provide a comprehensive record of all platform activities. This information is essential for security monitoring, compliance requirements, and troubleshooting.

#### Audit Log Access (CORE Workspaces Only)

Audit logs are available exclusively for CORE workspaces. COMMUNITY workspaces do not have access to audit log functionality.

System Administrators can access audit logs across all workspaces through the system admin panel. Workspace Administrators can access audit logs for their workspace only.

#### Log Contents

Each audit log entry records the following information:

**Timestamp:** The exact date and time when the action occurred, in the workspace's configured timezone.

**User:** The email address and user ID of the person who performed the action. System actions performed automatically are marked as "System."

**Action Type:** The category of action performed, such as User Created, Task Updated, Leave Approved, or Settings Changed.

**Target:** The specific resource affected by the action, including the resource type and identifier.

**Details:** A JSON object containing all relevant change details, such as old and new values for modified fields.

**IP Address:** The IP address from which the action was performed, useful for security investigation.

#### Common Audit Log Actions

The system records the following categories of actions:

**User Management:** User creation, activation, deactivation, deletion, role changes, and password resets.

**Team Management:** Team creation, modification, deletion, member additions and removals, and team lead assignments.

**Task Management:** Task creation, assignment changes, status updates, and deletions.

**Leave Management:** Leave request submissions, approvals, rejections, and balance adjustments.

**Workspace Settings:** Configuration changes, feature flag modifications, and branding updates.

#### Searching and Filtering Logs

The audit log interface supports filtering by date range, user, action type, and resource. Administrators can export filtered results to CSV for external analysis.

**Date Range Filters** allow investigation of specific time periods. The maximum date range for a single query is 90 days. For longer periods, administrators must run multiple queries.

**User Filters** show all actions performed by a specific user. This is useful when investigating the activities of a specific account.

**Action Type Filters** isolate specific categories of actions, such as viewing only user management activities.

#### Security Best Practices

Administrators should implement the following security practices:

**Role Assignment Principle:** Assign users the minimum role required to perform their job functions. Avoid assigning System Admin or Workspace Admin roles unless absolutely necessary.

**Regular Access Review:** Conduct quarterly reviews of user accounts and role assignments. Remove access for users who no longer require it.

**Audit Log Monitoring:** Establish a routine for reviewing audit logs, focusing on privileged actions such as role changes, user deletions, and settings modifications.

**Password Policy:** Enforce strong password requirements through workspace settings. Consider requiring password changes every 90 days for administrative accounts.

---

### 4.8 Reports and Analytics for Admins

Reporting and analytics provide administrators with data-driven insights into workspace performance, user productivity, and resource utilization.

#### Available Reports

**User Activity Report** shows login frequency, feature usage, and task completion rates for all workspace users. This report helps identify users who may need additional training or support.

**Leave Utilization Report** displays leave balances, usage patterns, and trends across the workspace. Administrators can identify teams with high leave usage or individuals approaching balance limits.

**Task Analytics** provides metrics on task creation, completion, and reallocation. This includes average task duration, tasks per team, and bottleneck identification.

**Team Performance Report** aggregates team-level metrics including task completion rates, on-time delivery percentages, and team member productivity comparisons.

#### Generating Reports

Navigate to Reports → Generate Report. Select the report type, date range, and any filters specific to the report. Click "Generate" to produce the report. Large reports may take several minutes to generate; the system notifies administrators when the report is ready for download.

#### Report Export

All reports can be exported in PDF, CSV, or Excel formats. PDF reports include charts and visualizations suitable for executive presentations. CSV and Excel exports contain raw data for further analysis.

#### Scheduling Recurring Reports

CORE workspace administrators can schedule reports to run automatically on a recurring basis. Scheduled reports are sent to the administrator's email or to designated recipients. This feature is useful for ongoing monitoring of key metrics.

---

## 5. Edge Cases, Assumptions, and Constraints

This section addresses uncommon scenarios and platform limitations that administrators may encounter.

### Edge Cases

**Duplicate Email Addresses:** The platform does not allow duplicate email addresses under any circumstances. If an organization needs to rehire a former employee, the previous account must be fully deleted (not merely deactivated) before creating a new account with the same email address. This deletion is irreversible.

**User Migration Between Workspaces:** Users cannot be transferred directly between workspaces. To move a user, the administrator must deactivate the user in the source workspace and create a new account in the destination workspace. All historical data remains in the source workspace.

**Leave Balance After Role Change:** When a user's role changes, their existing leave balances remain intact. If the new role has different leave type configurations, some leave types may no longer be accessible. Administrators should review leave balances after role changes.

**Team Lead Departure:** If a Team Lead leaves the organization or their role changes, their team becomes temporarily unmanaged. The workspace administrator should promptly assign a new Team Lead to maintain team operations.

**Bulk Import Failures:** If a bulk import encounters errors after partial processing, the system rolls back the entire import to prevent data inconsistency. Administrators must correct all errors in the CSV file and re-attempt the import.

### Assumptions

This guide assumes that administrators have appropriate credentials and permissions to perform the described actions. It assumes that the workspace has been properly configured and that users have completed initial onboarding.

This guide assumes administrators are familiar with basic web application navigation and understand their organization's policies regarding user management, leave, and security.

### Constraints

**COMMUNITY Workspace Limits:** COMMUNITY workspaces are strictly limited to 10 users, 100 tasks, and 3 teams. These limits are enforced by the platform and cannot be exceeded. Administrators attempting to exceed these limits receive clear error messages.

**Audit Log Availability:** Audit logs are available only for CORE workspaces. COMMUNITY workspace administrators cannot access audit log functionality regardless of their role.

**Bulk Import Availability:** Bulk user import is available only for CORE workspaces. COMMUNITY workspace administrators must create users individually.

**Leave Type Limits:** COMMUNITY workspaces are limited to 5 leave types. CORE workspaces have no limit.

**API Rate Limits:** The platform implements rate limiting on administrative actions to prevent abuse. Normal administrative usage will not encounter rate limits, but automated scripts may be throttled.

**Data Retention:** Audit logs are retained for 12 months for CORE workspaces. COMMUNITY workspaces do not retain audit logs. Administrators who require longer retention should export logs regularly.

---

## 6. Summary

The AetherTrackSAAS platform provides comprehensive administrative capabilities through a role-based access control system. System Administrators oversee the entire platform, while Workspace Administrators manage individual workspaces. Community Administrators operate within the constraints of the free COMMUNITY tier.

Key administrative responsibilities include:

**User Management** encompasses creating, activating, deactivating, and deleting user accounts. CORE workspaces additionally support bulk user import for efficient onboarding of large teams.

**Team Management** involves creating teams, assigning Team Leads, and managing team membership. Teams provide organizational structure and enable focused task management.

**Workspace Settings** allow configuration of workspace parameters, features, and branding. CORE workspaces offer extensive configuration options, while COMMUNITY workspaces have limited settings.

**Leave Management** enables administrators to configure leave types, manage balances, and process leave requests. This system supports organizational leave policies and ensures accurate leave tracking.

**Holiday Management** defines company holidays that integrate with the leave system to automatically adjust leave calculations.

**Audit Logs** provide comprehensive activity tracking for security, compliance, and troubleshooting purposes. Audit logs are available exclusively for CORE workspaces.

**Reports and Analytics** deliver data-driven insights into workspace performance, user productivity, and resource utilization.

Administrators should regularly review pending approvals, monitor workspace metrics, and conduct access reviews to maintain operational efficiency and security. For COMMUNITY workspace administrators, understanding tier limitations is essential for planning organizational growth and determining when an upgrade to CORE may be necessary.

For additional assistance, consult the End User Guide for feature-specific documentation or contact platform support through the designated channels.

---

*This document is part of the AetherTrackSAAS documentation suite. For the latest version and additional resources, visit the platform documentation portal.*
