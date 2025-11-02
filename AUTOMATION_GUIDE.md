# TaskFlow Automation System - Complete Guide

## 🎯 Overview

TaskFlow now includes two powerful automation features:
1. **Daily Overdue Task Reminders** - Automatic email reminders for overdue tasks
2. **Weekly Reports** - Automated Excel and PDF reports sent to admins

---

## 📧 1. Overdue Task Reminders

### Features
- Automatically checks for overdue tasks daily
- Groups overdue tasks by assigned user
- Sends personalized email reminders with:
  - List of overdue tasks
  - Priority levels
  - Days overdue count
  - Due dates
  - Direct link to tasks page

### Schedule
- **Frequency**: Daily
- **Time**: 9:00 AM (configurable)
- **Timezone**: Asia/Karachi (configurable)

### Email Content
- Beautiful HTML template with TaskFlow branding
- Red alert design for urgency
- Task table with priority, overdue days, and due dates
- Direct "View My Tasks" button
- Helpful tips for task management

### Logic
- Only sends to users with overdue tasks assigned to them
- Skips tasks already marked as "done"
- Groups multiple overdue tasks per user into one email
- Calculates days overdue automatically

---

## 📊 2. Weekly Reports

### Features
- Generates comprehensive analytics reports
- Creates both Excel (.xlsx) and PDF files
- Sends to all admin and HR users
- Includes:
  - Summary statistics
  - Status distribution
  - Priority breakdown
  - Overdue tasks section
  - Team performance
  - User metrics

### Schedule
- **Frequency**: Weekly
- **Day**: Every Monday
- **Time**: 8:00 AM (configurable)
- **Timezone**: Asia/Karachi (configurable)

### Report Contents

#### Excel Report (Multiple Sheets)
1. **Summary Sheet**
   - Total tasks, completed, in progress, overdue
   - Completion rate, overdue rate
   - Active teams and users

2. **All Tasks Sheet**
   - Complete task list with all details
   - Columns: Title, Description, Status, Priority, Assigned To, Team, Due Date, Is Overdue

3. **Overdue Tasks Sheet**
   - Critical overdue tasks
   - Days overdue calculation
   - Priority and assignment info

#### PDF Report (Professional Layout)
1. Cover with TaskFlow branding
2. Summary statistics table
3. Status distribution chart
4. Critical overdue tasks (red header)
5. Page numbers and timestamps

### Email Content
- Attractive HTML template with gradient design
- Visual statistics cards
- Key metrics summary
- Both Excel and PDF attached
- Direct link to analytics dashboard

---

## 🔧 Configuration

### Environment Variables
Ensure these are set in `backend/.env`:

```env
# Email Configuration (required for automation)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Application URLs
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### Timezone Configuration
To change the timezone, edit `backend/utils/scheduler.js`:

```javascript
cron.schedule('0 9 * * *', async () => {
  await sendOverdueReminders();
}, {
  scheduled: true,
  timezone: "YOUR_TIMEZONE" // e.g., "America/New_York", "Europe/London"
});
```

### Schedule Configuration
To change the schedule times, edit the cron expressions:

```javascript
// Daily at 9:00 AM
'0 9 * * *'

// Weekly Monday at 8:00 AM
'0 8 * * 1'

// Custom examples:
// '0 */6 * * *'     - Every 6 hours
// '0 12 * * 1-5'    - Weekdays at noon
// '30 8,17 * * *'   - Daily at 8:30 AM and 5:30 PM
```

---

## 🚀 Usage

### Automatic (Production)
Once the server starts, both automation features run automatically:

```bash
cd backend
npm start
```

You'll see:
```
🕐 Initializing task scheduler...
✅ Scheduler initialized successfully!
📅 Scheduled jobs:
   - Overdue reminders: Daily at 9:00 AM
   - Weekly reports: Every Monday at 8:00 AM
```

### Manual Testing

#### Test Both Features
```bash
cd backend
node test-automation.js
```

#### Test Only Overdue Reminders
```bash
node test-automation.js reminders
```

#### Test Only Weekly Reports
```bash
node test-automation.js reports
```

### Expected Output
```
🧪 Starting Automation Test...

📧 Testing Overdue Reminders...
🔍 Checking for overdue tasks...
📧 Found 5 overdue tasks. Sending reminders...
  ✅ Sent reminder to John Doe (3 tasks)
  ✅ Sent reminder to Jane Smith (2 tasks)
📊 Reminder Summary: 2 sent, 0 failed

─────────────────────────────────────

📊 Testing Weekly Reports...
📊 Generating weekly reports...
📝 Total tasks: 45, This week: 12
📄 Generating Excel report...
📄 Generating PDF report...
📧 Sending reports to 2 admin/HR users...
  ✅ Sent report to Admin User (admin@company.com)
  ✅ Sent report to HR Manager (hr@company.com)
📊 Report Summary: 2 sent, 0 failed

✅ Test completed successfully!
```

---

## 📁 File Structure

```
backend/
├── utils/
│   ├── emailService.js       # Email templates and sending logic
│   ├── reportGenerator.js    # Excel & PDF generation
│   └── scheduler.js          # Cron job definitions
├── models/
│   ├── Task.js              # Task model with due dates
│   └── User.js              # User model with emails
├── server.js                # Scheduler initialization
└── test-automation.js       # Manual testing script
```

---

## 🎨 Email Templates

### Overdue Reminder Email
- **Subject**: `⚠️ You have X overdue task(s) - Action Required`
- **Design**: Red gradient header with alert styling
- **CTA Button**: "View My Tasks"
- **Logo**: TaskFlow branding

### Weekly Report Email
- **Subject**: `📊 Weekly TaskFlow Report - [Date Range]`
- **Design**: Purple gradient header with professional layout
- **Attachments**: Excel & PDF reports
- **CTA Button**: "View Full Analytics"
- **Statistics Cards**: Visual metrics display

---

## 🔍 How It Works

### Overdue Reminders Flow
1. **Scheduler triggers** at 9:00 AM daily
2. **Query database** for tasks where `due_date < now` and `status != 'done'`
3. **Group tasks** by assigned users
4. **Calculate** days overdue for each task
5. **Send email** to each user with their overdue tasks
6. **Log results** (success/failure counts)

### Weekly Reports Flow
1. **Scheduler triggers** every Monday at 8:00 AM
2. **Fetch all tasks** from database
3. **Calculate analytics**:
   - Total, completed, in progress, overdue counts
   - Completion rates
   - Active teams and users
   - Status and priority distributions
4. **Generate Excel report** with multiple sheets
5. **Generate PDF report** with charts and tables
6. **Query admins/HR** users from database
7. **Send emails** with attachments to each admin
8. **Log results** (success/failure counts)

---

## 🛠️ Troubleshooting

### Emails Not Sending
1. Check email credentials in `.env`
2. Verify Gmail App Password (not regular password)
3. Test with `node test-email.js`
4. Check console for error messages

### Scheduler Not Running
1. Verify server started successfully
2. Look for "Scheduler initialized" message
3. Check timezone configuration
4. Ensure MongoDB connection is active

### No Overdue Tasks Found
- This is normal if all tasks are on time
- Create test overdue tasks for testing
- Check task due dates in database

### Reports Empty
- Ensure tasks exist in database
- Check task model has required fields
- Verify user assignments and teams

### Testing Timezone Issues
- Use manual test: `node test-automation.js`
- Adjust timezone in scheduler.js
- Restart server after changes

---

## 📊 Database Requirements

### Task Model Requirements
```javascript
{
  title: String,
  description: String,
  status: String, // 'todo', 'in_progress', 'review', 'done'
  priority: String, // 'low', 'medium', 'high', 'urgent'
  due_date: Date,
  assigned_to: [{ type: ObjectId, ref: 'User' }],
  team_id: { type: ObjectId, ref: 'Team' },
  created_at: Date
}
```

### User Model Requirements
```javascript
{
  full_name: String,
  email: String,
  role: String, // 'admin', 'hr', 'team_lead', 'member'
}
```

---

## 🎯 Best Practices

### For Development
- Test manually before going to production
- Use test mode to verify email templates
- Check spam folders initially
- Monitor console logs

### For Production
- Set correct timezone for your region
- Use production email service (not Gmail for high volume)
- Monitor scheduled job logs
- Set up error alerting
- Adjust schedules based on team preferences

### Performance Tips
- Limit PDF to first 20 overdue tasks (already implemented)
- Excel reports handle all tasks efficiently
- Database queries use indexes (ensure indexed fields)
- Email sending is async and doesn't block server

---

## 🔐 Security Considerations

1. **Email Credentials**
   - Use environment variables
   - Never commit `.env` to git
   - Use app-specific passwords
   - Rotate credentials regularly

2. **Report Data**
   - Only sent to admin/HR roles
   - Emails contain sensitive task info
   - Use secure email transmission
   - Consider encrypting attachments for high-security needs

3. **Automation Access**
   - Manual triggers could be restricted to admins
   - Log all automation activity
   - Monitor for abuse

---

## 📈 Future Enhancements

Potential improvements:
- Custom report filters (by team, user, date range)
- Configurable schedule via admin panel
- SMS reminders for critical overdue tasks
- Slack/Teams integration
- Dashboard for automation logs
- User preferences (opt-in/opt-out)
- Digest emails (combine multiple notifications)
- Report history and archiving

---

## 📞 Support

### Testing Commands
```bash
# Test everything
node test-automation.js

# Test reminders only
node test-automation.js reminders

# Test reports only  
node test-automation.js reports

# Test basic email
node test-email.js

# Check scheduler logs
# (Run server and check console output)
```

### Log Files
- Console output shows all automation activity
- Each job logs start, progress, and completion
- Errors are logged with details
- Success/failure counts provided

---

## ✅ Checklist for Deployment

- [ ] Email credentials configured in `.env`
- [ ] Timezone set correctly in `scheduler.js`
- [ ] Test with `node test-automation.js`
- [ ] Verify emails received (check spam)
- [ ] Create test overdue tasks
- [ ] Ensure admin users have valid emails
- [ ] Start server and verify scheduler initialization
- [ ] Monitor first automated run
- [ ] Set up logging/monitoring
- [ ] Document schedule for team

---

## 🎉 Summary

Your TaskFlow application now has:
- ✅ **Daily overdue task reminders** at 9:00 AM
- ✅ **Weekly reports** every Monday at 8:00 AM
- ✅ **Beautiful HTML email templates**
- ✅ **Excel and PDF report generation**
- ✅ **Manual testing capabilities**
- ✅ **Comprehensive logging**
- ✅ **Production-ready automation**

The system runs automatically once the server starts. No additional setup required after configuration!

---

**Last Updated**: November 2, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
