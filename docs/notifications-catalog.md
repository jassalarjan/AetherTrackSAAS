# In-App Notification Catalog

This catalog lists every notification type currently allowed by the backend notification API/model, where it is generated, and whether it is actively auto-generated today.

## Delivery Channels

- REST fetch: `GET /api/notifications`
- Real-time socket events: `notification` and `notification:new`
- Manual send API: `POST /api/notifications/send`
- Native bridge (frontend): `window` event `aether:notification` (normalized as `info` by default)

## Notification Types

| Type | Category | Current Source | Auto-Generated Today | Notes |
| --- | --- | --- | --- | --- |
| `success` | UI generic | Manual send API, frontend local toasts | No (backend) | Generic severity notification type |
| `error` | UI generic | Manual send API, frontend local toasts | No (backend) | Generic severity notification type |
| `warning` | UI generic | Manual send API, frontend local toasts | No (backend) | Generic severity notification type |
| `info` | UI generic | Manual send API, native push bridge, frontend local toasts | Partial | Native bridge defaults to `info` when no type is provided |
| `task_assigned` | Task workflow | Task create/update assignment flows, reallocation redistribute flow | Yes | Primary assignment notification |
| `task_updated` | Task workflow | Task status update flow (stored notification record) | Yes | Persisted task update notification |
| `task_completed` | Task workflow | Allowed type only | No | Reserved for future/explicit producer usage |
| `task_overdue` | Task workflow | Allowed type only | No | Reserved for future/explicit producer usage |
| `comment_added` | Task collaboration | Task comments route | Yes | Sent to assigned users except the commenter |
| `status_changed` | Task workflow | Task update socket payloads | Partial | Real-time payload type; persisted record currently uses `task_updated` |
| `task_due` | Task workflow | Allowed type only | No | Reserved for future due-date notifier |
| `meeting_created` | Meetings | Meeting participant notifier | Yes | Delivered to users/teams/org scope recipients |
| `meeting_updated` | Meetings | Meeting update notifier | Yes | Emitted on meeting edits |
| `meeting_cancelled` | Meetings | Meeting update/cancel notifier | Yes | Emitted on cancellation |
| `leave_approved` | Leave | Allowed type only | No | Leave approval currently triggers HR email/event flows, not in-app notification records |
| `leave_rejected` | Leave | Allowed type only | No | Leave rejection currently triggers HR email/event flows, not in-app notification records |
| `leave_pending` | Leave | Allowed type only | No | Reserved for future workflow alerts |
| `task_reallocated` | Reallocation | Allowed type only | No | Reserved umbrella type |
| `reallocation_pending` | Reallocation | Task reallocation service | Yes | Sent to team lead for action |
| `reallocation_accepted` | Reallocation | Task reallocation service | Yes | Sent to absent employee when lead accepts |
| `reallocation_rejected` | Reallocation | Task reallocation service | Yes | Sent to HR/Admin when lead rejects |
| `reallocation_redistributed` | Reallocation | Task reallocation service | Yes | Sent to absent employee when redistributed |

## Sample Data Seeder

Use the backend script below to create one sample notification for each type:

```bash
cd backend
npm run seed:notifications
```

Optional targeting:

```bash
node scripts/create-sample-notifications.js --email someone@company.com
node scripts/create-sample-notifications.js --userId 64f0d8e9aa1b2c3d4e5f6789
node scripts/create-sample-notifications.js --all-unread
```

If no target is provided, the script picks the oldest `ACTIVE` user.