# Automation Workflow Instructions

This guide explains how email automations work in AetherTrack and how to debug common issues.

## 1. High-Level Architecture

- Frontend UI:
  - Email hub page: frontend/src/features/email-automation/pages/EmailAutomationHub.jsx
  - Automation builder and lists: frontend/src/features/email-automation/components/AutomationPane.jsx
- Backend API:
  - Automation routes: backend/routes/automations.js
  - Automation execution engine: backend/services/automationRunner.js
- Templates:
  - Automation template model: backend/models/EmailAutomationTemplate.js
  - HR/system email templates: backend/models/EmailTemplate.js and backend/routes/emailTemplates.js
- Delivery:
  - Email transport + render helper: backend/services/brevoEmailService.js

## 2. Event Automation Workflow (Changelog Trigger)

1. User clicks New Automation in AutomationPane.
2. Frontend opens event builder drawer and captures:
   - Name, trigger type, trigger id, filters/conditions
   - Action (send_email), template id, recipient type
3. Frontend saves via POST /automations.
4. Backend stores automation in EmailAutomation collection.
5. When changelog entries are created, backend matches trigger ids and rules.
6. Matching automation executes:
   - Resolves recipients
   - Loads template
   - Applies variable bindings from context payload
   - Sends emails
   - Records execution history

## 3. Scheduled Automation Workflow

1. User creates automation with trigger.type = schedule.
2. Backend computes nextRun.
3. Cron runner checks due automations.
4. Due automations execute through same email action pipeline.
5. Backend updates runCount, lastRun, and nextRun.

## 4. Report Automation Workflow

1. User clicks New Report Automation.
2. Frontend captures schedule, report config, recipients, email config.
3. Backend stores report automation.
4. Scheduler or manual send generates report data.
5. Email renderer injects report tokens and sends email.

## 5. Template Variable Resolution

Current behavior (important):

- Frontend HR flow now resolves blank variable inputs using template examples.
- Backend email send/test flow now resolves missing values using:
  - Provided variables
  - Recipient aliases (recipientName, fullName, name, email)
  - System defaults (workspaceName, appUrl, currentDate)
  - Template variable examples
- Placeholder matching supports both {{key}} and {{ key }}.

This prevents empty outputs such as:
- Dear ,
- Date:
- Time:
- Expected Downtime:

## 6. Common Errors and Meaning

### A) Minified React error #130 from site-blocker.*.js

- This is typically from a browser extension script, not app bundle code.
- Validate by opening the app in:
  - Incognito with extensions disabled, or
  - A different browser profile.

### B) content-script.js TypeError / runtime.lastError

- These are extension content-script runtime errors.
- They do not indicate frontend app code failure by themselves.

### C) 401 on /api/notifications

- Usually caused by expired or missing auth token during bell polling.
- Mitigation in app now:
  - Notification polling request is marked as optional background auth.
  - It will not force global logout redirect on transient refresh failures.

## 7. Debug Checklist for Automation Drawer Not Opening

1. Verify click path:
   - New Automation button on AutomationPane triggers setShowEventBuilder(true).
2. Verify no auth reset loop:
   - Confirm user remains authenticated.
3. Check for extension interference:
   - Disable extensions and retest.
4. Confirm overlay render:
   - Drawer should be portal-rendered with fixed full-screen overlay.

## 8. Files to Inspect First During Incidents

- frontend/src/features/email-automation/components/AutomationPane.jsx
- frontend/src/features/email-automation/pages/EmailAutomationHub.jsx
- frontend/src/shared/services/axios.js
- frontend/src/shared/components/layout/AppHeader.jsx
- backend/routes/automations.js
- backend/services/automationRunner.js
- backend/routes/emailTemplates.js
- backend/services/brevoEmailService.js

## 9. Quick Operational Steps

- Create automation -> Test draft -> Activate.
- Use history panel to verify success/failure runs.
- If content is blank, inspect variable list and resolved payload values.
- If UI closes unexpectedly, verify auth stability and extension noise first.
