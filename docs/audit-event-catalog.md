# Audit And Changelog Event Catalog

Last updated: 2026-04-04

## 1. Log Streams

### 1.1 Audit Log Stream (SystemAuditLog)
- Storage model: backend/models/SystemAuditLog.js
- API endpoint (paginated): GET /api/audit/logs
- Frontend error ingest endpoint: POST /api/audit/errors
- Primary purpose: anything that went wrong (frontend runtime errors, backend exceptions, failed API requests)

### 1.2 Changelog Stream (ChangeLog + ChangelogEntry bridge)
- Primary ingest points:
  - backend/middleware/apiAuditLogger.js
  - POST /api/changelog/client-event
- Storage model: backend/models/ChangelogEntry.js
- Legacy storage model: backend/models/ChangeLog.js
- API endpoint (paginated): GET /api/changelog
- Legacy API endpoint (paginated): GET /api/changelog/legacy
- Trigger catalog endpoint: GET /api/changelog/trigger-types
- Primary purpose: behavioral event stream (frontend clicks + requests sent to backend + tracked business actions)

## 2. Event Types Currently Logged (ChangeLog.event_type)

Canonical enum source: backend/models/ChangeLog.js

1. user_login
2. user_logout
3. user_created
4. user_updated
5. user_deleted
6. user_action
7. task_created
8. task_updated
9. task_deleted
10. task_status_changed
11. task_assigned
12. task_unassigned
13. team_created
14. team_updated
15. team_deleted
16. team_member_added
17. team_member_removed
18. report_generated
19. report_automation_triggered
20. report_downloaded
21. automation_triggered
22. email_automation_triggered
23. notification_sent
24. email_sent
25. email_failed
26. comment_added
27. comment_updated
28. comment_deleted
29. bulk_import
30. password_reset_request
31. password_reset
32. leave_action
33. leave_type_action
34. holiday_action
35. email_action
36. system_event

## 2.1 Target Types Currently Used (ChangeLog.target_type)

Primary endpoint for UI filter options: GET /api/changelog/target-types

Known target types:
1. attendance
2. auth
3. automation
4. comment
5. email
6. email_template
7. external_recipient
8. holiday
9. leave_request
10. leave_type
11. meeting
12. notification
13. project
14. reallocation
15. report
16. report_automation
17. settings
18. shift
19. sprint
20. system
21. task
22. team
23. user
24. verification

Notes:
- /api/changelog/target-types returns a merged list of known target types plus distinct types already present in persisted logs.
- For non-super-admin users, values are workspace-scoped.

## 3. Special Events Added/Guaranteed

### 3.1 Email Automation Special Events
Source: backend/services/automationRunner.js
- email_automation_triggered
- email_sent (action: EMAIL_AUTOMATION_SENT)
- email_failed (action: EMAIL_AUTOMATION_FAILED)

### 3.2 Report Automation Special Events
Source: backend/services/reportRunner.js
- report_automation_triggered
- report_generated
- email_sent (action: REPORT_EMAIL_SENT)
- email_failed (action: REPORT_EMAIL_FAILED)

### 3.3 Report/Test Email Route Event
Source: backend/routes/reportAutomations.js
- email_sent (action: REPORT_TEST_EMAIL_SENT)

### 3.4 Download/Export Events
Sources:
- backend/routes/changelog.js (CSV export)
- backend/routes/users.js (bulk-import templates)
- frontend/src/features/hr/pages/HRDashboard.jsx (client-side CSV export)
- frontend/src/features/analytics/pages/Analytics.jsx (client-side XLSX/PDF export)

Events:
- report_downloaded (CHANGELOG_EXPORT_DOWNLOADED)
- report_downloaded (USER_IMPORT_TEMPLATE_XLSX_DOWNLOADED)
- report_downloaded (USER_IMPORT_TEMPLATE_JSON_DOWNLOADED)
- report_downloaded (HR_REPORT_CSV_EXPORTED)
- report_downloaded (ANALYTICS_EXCEL_EXPORTED)
- report_downloaded (ANALYTICS_PDF_EXPORTED)

## 4. CRUD Logging Coverage (All Protected Modules)

Global middleware: backend/middleware/apiAuditLogger.js
Mounted in: backend/server.js

Covered route groups:
- /api/users
- /api/teams
- /api/tasks
- /api/projects
- /api/sprints
- /api/comments
- /api/notifications
- /api/changelog
- /api/automations
- /api/report-automations
- /api/hr/attendance
- /api/geofences
- /api/hr/leaves
- /api/hr/leave-types
- /api/hr/holidays
- /api/hr/calendar
- /api/hr/email-templates
- /api/email-hub
- /api/hr/meetings
- /api/hr/shifts
- /api/hr/reallocation
- /api/settings

For each protected API request (including failed status codes), middleware records:
- event_type
- action
- target_type, target_id, target_name
- actor (user), ip, workspaceId
- query/params/body key metadata

## 5. Automation Trigger Events (ChangelogEntry)

Source catalog: backend/constants/triggerManifest.js

Current trigger IDs:
- task.created
- task.completed
- task.status_changed
- task.deleted
- task.assigned
- project.created
- project.updated
- project.deleted
- project.milestone_reached
- member.added
- member.removed
- team.created
- team.updated
- team.deleted
- sprint.started
- sprint.completed
- attendance.check_in
- attendance.check_out
- leave.submitted
- leave.approved
- leave.rejected
- email.sent
- email.failed
- notification.sent
- user.login
- user.logout
- comment.added
- bulk.import

## 6. Data Integrity Controls

- Workspace-scoped persistence: ChangeLog.workspaceId
- Performance indexes:
  - { workspaceId, created_at }
  - { event_type }
  - { user_id }
  - { target_type, target_id }
- Duplicate control:
  - route-level audit logger marks res.locals.auditLogged
  - global middleware skips duplicate write when that flag is set
- Event type normalization safety:
  - unsupported custom event_type values are normalized to system_event instead of failing validation
  - original custom value is preserved in metadata.original_event_type
- Deletion protection:
  - /api/changelog/clear blocked unless ALLOW_AUDIT_LOG_CLEAR=true

## 7. Recent Reliability Fixes

- Settings routes are now globally audited at mount level with authentication before audit middleware.
- Special events (report/email automation lifecycle and download/export actions) are emitted at service/route execution points.
- Legacy /event-types endpoint is schema-driven, so filter options always match what the backend can persist.
- ChangeLog -> ChangelogEntry bridge now guarantees a valid entityId fallback (target_id -> user_id -> tenantId), so special events also appear in /api/changelog.

## 8. Querying Recommendations

- Compliance/audit reporting: use /api/changelog/legacy
- Automation diagnostics: use /api/changelog and /api/automations/:id/history
- Event type filter values: use /api/changelog/event-types (now schema-driven, always up-to-date)
- Target type filter values: use /api/changelog/target-types (known + persisted distinct values)

## 9. Important Scope Note

- Audit log is now failure-oriented: it stores frontend errors, backend exceptions, and failed requests.
- Changelog is now activity-oriented: frontend click telemetry and backend request activity are captured.
- Attendance-specific audit trail remains available under /api/hr/attendance/audit-log for HR workflows.
