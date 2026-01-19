# 📡 HR MODULE API REFERENCE

Complete API documentation for the HR Dashboard module.

---

## 🔐 Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

Workspace context is automatically applied via middleware.

---

## 📅 ATTENDANCE ENDPOINTS

### GET `/api/hr/attendance`
Get attendance records (filtered by month/year/user)

**Query Parameters:**
- `month` (optional) - Month number (1-12)
- `year` (optional) - Year (e.g., 2026)
- `userId` (optional) - Filter by specific user (HR/Admin only)

**Response:**
```json
{
  "success": true,
  "records": [
    {
      "_id": "...",
      "userId": {
        "_id": "...",
        "full_name": "John Doe",
        "email": "john@example.com"
      },
      "date": "2026-01-19T00:00:00.000Z",
      "checkIn": "2026-01-19T09:00:00.000Z",
      "checkOut": "2026-01-19T17:30:00.000Z",
      "workingHours": 8.5,
      "status": "present",
      "notes": "",
      "isOverride": false
    }
  ]
}
```

**Access:** All authenticated users (members see only their own)

---

### POST `/api/hr/attendance/checkin`
Employee check-in for today

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "attendance": {
    "_id": "...",
    "userId": "...",
    "date": "2026-01-19T00:00:00.000Z",
    "checkIn": "2026-01-19T09:15:23.456Z",
    "status": "present"
  }
}
```

**Errors:**
- `400` - Already checked in today
- `401` - Unauthorized

**Access:** All authenticated users

---

### POST `/api/hr/attendance/checkout`
Employee check-out for today

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "attendance": {
    "_id": "...",
    "checkIn": "2026-01-19T09:15:23.456Z",
    "checkOut": "2026-01-19T17:30:45.789Z",
    "workingHours": 8.26,
    "status": "present"
  }
}
```

**Errors:**
- `400` - No check-in found / Already checked out
- `401` - Unauthorized

**Access:** All authenticated users

---

### PUT `/api/hr/attendance/:id`
Admin override/edit attendance record

**Request Body:**
```json
{
  "status": "present",
  "checkIn": "2026-01-19T09:00:00.000Z",
  "checkOut": "2026-01-19T17:00:00.000Z",
  "notes": "Manual adjustment by HR"
}
```

**Response:**
```json
{
  "success": true,
  "attendance": { ... }
}
```

**Access:** Admin, HR only

---

### GET `/api/hr/attendance/summary/:userId?`
Get attendance summary (monthly statistics)

**Query Parameters:**
- `month` (optional) - Default: current month
- `year` (optional) - Default: current year

**Response:**
```json
{
  "success": true,
  "summary": {
    "present": 18,
    "absent": 2,
    "halfDay": 1,
    "leave": 1,
    "totalHours": 144.5
  },
  "records": [ ... ]
}
```

**Access:** All authenticated users (members see only their own)

---

## 🎫 LEAVE MANAGEMENT ENDPOINTS

### GET `/api/hr/leaves`
Get all leave requests

**Query Parameters:**
- `status` (optional) - Filter by status: pending, approved, rejected
- `userId` (optional) - Filter by user (HR/Admin only)

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "_id": "...",
      "userId": {
        "_id": "...",
        "full_name": "Jane Doe",
        "email": "jane@example.com"
      },
      "leaveTypeId": {
        "_id": "...",
        "name": "Sick Leave",
        "code": "SICK",
        "color": "#ef4444"
      },
      "startDate": "2026-01-20T00:00:00.000Z",
      "endDate": "2026-01-22T00:00:00.000Z",
      "days": 3,
      "reason": "Medical appointment",
      "status": "pending",
      "approvedBy": null,
      "createdAt": "2026-01-19T10:30:00.000Z"
    }
  ]
}
```

**Access:** All authenticated users (members see only their own)

---

### POST `/api/hr/leaves`
Create leave request

**Request Body:**
```json
{
  "leaveTypeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "startDate": "2026-01-25",
  "endDate": "2026-01-27",
  "days": 3,
  "reason": "Family vacation"
}
```

**Response:**
```json
{
  "success": true,
  "leaveRequest": { ... }
}
```

**Errors:**
- `400` - Insufficient leave balance
- `404` - Leave type not found

**Access:** All authenticated users

---

### PATCH `/api/hr/leaves/:id/status`
Approve or reject leave request

**Request Body:**
```json
{
  "status": "approved",
  "rejectionReason": "Optional reason if rejecting"
}
```

**Response:**
```json
{
  "success": true,
  "leaveRequest": { ... }
}
```

**Side Effects:**
- Approved: Deducts from leave balance, marks attendance as "leave"
- Rejected: Restores pending balance

**Access:** Admin, HR only

---

### DELETE `/api/hr/leaves/:id`
Cancel pending leave request

**Response:**
```json
{
  "success": true,
  "message": "Leave request cancelled"
}
```

**Errors:**
- `400` - Cannot cancel processed request
- `404` - Request not found

**Access:** Request owner only

---

### GET `/api/hr/leaves/balance/:userId?`
Get leave balance for a user

**Response:**
```json
{
  "success": true,
  "balances": [
    {
      "_id": "...",
      "leaveTypeId": {
        "_id": "...",
        "name": "Sick Leave",
        "code": "SICK",
        "color": "#ef4444",
        "annualQuota": 12
      },
      "year": 2026,
      "totalQuota": 12,
      "used": 3,
      "pending": 2,
      "available": 7,
      "carriedForward": 0
    }
  ]
}
```

**Access:** All authenticated users (members see only their own)

---

## 📋 LEAVE TYPE ENDPOINTS

### GET `/api/hr/leave-types`
Get all active leave types for workspace

**Response:**
```json
{
  "success": true,
  "leaveTypes": [
    {
      "_id": "...",
      "name": "Sick Leave",
      "code": "SICK",
      "annualQuota": 12,
      "carryForward": false,
      "maxCarryForward": 0,
      "color": "#ef4444",
      "description": "Medical leave for illness",
      "isActive": true
    }
  ]
}
```

**Access:** All authenticated users

---

### POST `/api/hr/leave-types`
Create new leave type

**Request Body:**
```json
{
  "name": "Paternity Leave",
  "code": "PATERNITY",
  "annualQuota": 10,
  "carryForward": false,
  "maxCarryForward": 0,
  "color": "#8b5cf6",
  "description": "Leave for new fathers"
}
```

**Side Effect:** Automatically creates leave balances for all users in workspace

**Access:** Admin, HR only

---

### PUT `/api/hr/leave-types/:id`
Update leave type

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "annualQuota": 15,
  "carryForward": true,
  "maxCarryForward": 5,
  "color": "#3b82f6"
}
```

**Access:** Admin, HR only

---

### DELETE `/api/hr/leave-types/:id`
Deactivate leave type (soft delete)

**Access:** Admin, HR only

---

## 🎉 HOLIDAY ENDPOINTS

### GET `/api/hr/holidays`
Get all holidays

**Query Parameters:**
- `year` (optional) - Filter by year

**Response:**
```json
{
  "success": true,
  "holidays": [
    {
      "_id": "...",
      "name": "New Year",
      "date": "2026-01-01T00:00:00.000Z",
      "isRecurring": true,
      "description": "New Year's Day",
      "isActive": true
    }
  ]
}
```

**Access:** All authenticated users

---

### POST `/api/hr/holidays`
Create holiday

**Request Body:**
```json
{
  "name": "Company Anniversary",
  "date": "2026-06-15",
  "isRecurring": false,
  "description": "10th anniversary celebration"
}
```

**Access:** Admin, HR only

---

### PUT `/api/hr/holidays/:id`
Update holiday

**Access:** Admin, HR only

---

### DELETE `/api/hr/holidays/:id`
Delete holiday

**Access:** Admin, HR only

---

## 📆 CALENDAR ENDPOINT

### GET `/api/hr/calendar`
Get aggregated calendar data (attendance + leaves + holidays)

**Query Parameters:**
- `month` (required) - Month number (1-12)
- `year` (required) - Year (e.g., 2026)
- `userId` (optional) - Filter by user

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "type": "attendance",
      "date": "2026-01-19T00:00:00.000Z",
      "status": "present",
      "workingHours": 8.5,
      "userId": "...",
      "userName": "John Doe",
      "checkIn": "2026-01-19T09:00:00.000Z",
      "checkOut": "2026-01-19T17:30:00.000Z"
    },
    {
      "type": "leave",
      "date": "2026-01-20T00:00:00.000Z",
      "leaveType": "Sick Leave",
      "leaveCode": "SICK",
      "color": "#ef4444",
      "userId": "...",
      "userName": "Jane Doe",
      "reason": "Doctor appointment"
    },
    {
      "type": "holiday",
      "date": "2026-01-01T00:00:00.000Z",
      "name": "New Year",
      "description": "New Year's Day"
    }
  ],
  "holidays": [ ... ],
  "attendance": [ ... ],
  "leaves": [ ... ]
}
```

**Access:** All authenticated users (members see only their own + holidays)

---

## 📧 EMAIL TEMPLATE ENDPOINTS

### GET `/api/hr/email-templates`
Get all email templates (predefined + custom)

**Query Parameters:**
- `category` (optional) - Filter by category: leave, attendance, system, custom

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "_id": "...",
      "name": "Leave Request Submitted",
      "code": "LEAVE_REQUEST_SUBMITTED",
      "subject": "New Leave Request",
      "htmlContent": "<h2>...</h2>",
      "variables": [
        {
          "name": "employeeName",
          "description": "Name of employee",
          "example": "John Doe"
        }
      ],
      "category": "leave",
      "isActive": true,
      "isPredefined": true
    }
  ]
}
```

**Access:** Admin, HR only

---

### POST `/api/hr/email-templates`
Create custom email template

**Request Body:**
```json
{
  "name": "Custom Welcome Email",
  "code": "CUSTOM_WELCOME",
  "subject": "Welcome {{employeeName}}!",
  "htmlContent": "<h1>Welcome {{employeeName}} to {{companyName}}!</h1>",
  "variables": [
    { "name": "employeeName", "description": "Employee name" },
    { "name": "companyName", "description": "Company name" }
  ],
  "category": "custom"
}
```

**Note:** Predefined templates cannot be created (code conflict)

**Access:** Admin, HR only

---

### PUT `/api/hr/email-templates/:id`
Update custom email template

**Note:** Predefined templates cannot be edited

**Access:** Admin, HR only

---

### DELETE `/api/hr/email-templates/:id`
Delete custom email template

**Note:** Predefined templates cannot be deleted

**Access:** Admin, HR only

---

## 🔄 EMAIL TEMPLATE VARIABLES

### Predefined Template Variables

**LEAVE_REQUEST_SUBMITTED:**
- `employeeName` - Name of employee requesting leave
- `leaveType` - Type of leave
- `startDate` - Leave start date
- `endDate` - Leave end date
- `days` - Number of days
- `reason` - Reason for leave

**LEAVE_APPROVED:**
- `employeeName` - Name of employee
- `leaveType` - Type of leave
- `startDate` - Leave start date
- `endDate` - Leave end date
- `days` - Number of days

**LEAVE_REJECTED:**
- `employeeName` - Name of employee
- `leaveType` - Type of leave
- `startDate` - Leave start date
- `endDate` - Leave end date
- `days` - Number of days
- `rejectionReason` - Reason for rejection

**ATTENDANCE_REMINDER:**
- `employeeName` - Name of employee
- `date` - Date of missing attendance

---

## ⚠️ ERROR RESPONSES

All endpoints return consistent error format:

```json
{
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication failed)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🔍 Query Examples

### Get current month attendance
```
GET /api/hr/attendance?month=1&year=2026
```

### Get pending leave requests (HR view)
```
GET /api/hr/leaves?status=pending
```

### Get user's leave balance
```
GET /api/hr/leaves/balance/64a1b2c3d4e5f6g7h8i9j0k1
```

### Get calendar for specific user
```
GET /api/hr/calendar?month=1&year=2026&userId=64a1b2c3d4e5f6g7h8i9j0k1
```

---

## 📊 Rate Limits & Best Practices

**Recommendations:**
- Cache leave types and holidays (change infrequently)
- Use aggregated calendar endpoint instead of separate calls
- Implement pagination for large attendance datasets (add `limit` and `skip` params)
- Use WebSockets for real-time leave approval notifications

**Performance:**
- Calendar endpoint executes 3 queries but returns single response
- Indexes optimize queries on userId + date combinations
- Lean queries return plain objects for read operations

---

**API Version:** 1.0  
**Last Updated:** January 19, 2026  
**Base URL:** `http://localhost:5000/api` (development)
