import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import EmailTemplate from '../models/EmailTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genericTemplates = [
  {
    name: 'Project Update Notification',
    code: 'PROJECT_UPDATE',
    subject: 'Project Update: {{projectName}}',
    category: 'custom',
    isPredefined: false,
    variables: [
      { name: 'projectName', description: 'Name of the project', example: 'Website Redesign' },
      { name: 'recipientName', description: 'Recipient\'s name', example: 'John Doe' },
      { name: 'updateDetails', description: 'Update details', example: 'All milestones completed on time' },
      { name: 'updateDate', description: 'Date of update', example: 'February 16, 2026' }
    ],
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .content h2 { color: #3b82f6; margin-top: 0; }
    .content p { line-height: 1.6; color: #333; }
    .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Project Update</h1>
    </div>
    <div class="content">
      <h2>Hello {{recipientName}},</h2>
      <p>We have an important update regarding the project: <strong>{{projectName}}</strong></p>
      <div class="info-box">
        <strong>Update Details:</strong><br>
        {{updateDetails}}
      </div>
      <p><strong>Date:</strong> {{updateDate}}</p>
      <p>Thank you for your continued collaboration.</p>
    </div>
    <div class="footer">
      <p>© 2026 AetherTrack. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  },
  {
    name: 'Task Assignment Notification',
    code: 'TASK_ASSIGNED',
    subject: 'New Task Assigned: {{taskTitle}}',
    category: 'custom',
    isPredefined: false,
    variables: [
      { name: 'recipientName', description: 'Recipient\'s name', example: 'Sarah Smith' },
      { name: 'taskTitle', description: 'Title of the task', example: 'Update Database Schema' },
      { name: 'taskDescription', description: 'Task description', example: 'Migrate user table to new structure' },
      { name: 'dueDate', description: 'Task due date', example: 'February 25, 2026' },
      { name: 'priority', description: 'Task priority', example: 'High' },
      { name: 'assignedBy', description: 'Person who assigned the task', example: 'Project Manager' }
    ],
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .content h2 { color: #10b981; margin-top: 0; }
    .content p { line-height: 1.6; color: #333; }
    .task-box { background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .task-box h3 { margin-top: 0; color: #059669; }
    .priority-high { color: #dc2626; font-weight: bold; }
    .priority-medium { color: #f59e0b; font-weight: bold; }
    .priority-low { color: #3b82f6; font-weight: bold; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ New Task Assigned</h1>
    </div>
    <div class="content">
      <h2>Hi {{recipientName}},</h2>
      <p>You have been assigned a new task by <strong>{{assignedBy}}</strong>.</p>
      <div class="task-box">
        <h3>{{taskTitle}}</h3>
        <p><strong>Description:</strong><br>{{taskDescription}}</p>
        <p><strong>Due Date:</strong> {{dueDate}}</p>
        <p><strong>Priority:</strong> <span class="priority-{{priority}}">{{priority}}</span></p>
      </div>
      <p>Please review this task and update its status as you progress.</p>
    </div>
    <div class="footer">
      <p>© 2026 AetherTrack. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  },
  {
    name: 'Team Meeting Invitation',
    code: 'MEETING_INVITE',
    subject: 'Meeting Invitation: {{meetingTitle}}',
    category: 'custom',
    isPredefined: false,
    variables: [
      { name: 'recipientName', description: 'Recipient\'s name', example: 'Michael Brown' },
      { name: 'meetingTitle', description: 'Title of the meeting', example: 'Sprint Planning Session' },
      { name: 'meetingDate', description: 'Meeting date', example: 'February 20, 2026' },
      { name: 'meetingTime', description: 'Meeting time', example: '10:00 AM - 11:30 AM' },
      { name: 'meetingLocation', description: 'Meeting location or link', example: 'Conference Room B / Zoom Link' },
      { name: 'agenda', description: 'Meeting agenda', example: 'Review sprint goals and assign tasks' }
    ],
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .content h2 { color: #8b5cf6; margin-top: 0; }
    .content p { line-height: 1.6; color: #333; }
    .meeting-details { background: #faf5ff; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; }
    .meeting-details p { margin: 8px 0; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Meeting Invitation</h1>
    </div>
    <div class="content">
      <h2>Hello {{recipientName}},</h2>
      <p>You are invited to attend the following meeting:</p>
      <div class="meeting-details">
        <p><strong>📋 Title:</strong> {{meetingTitle}}</p>
        <p><strong>📆 Date:</strong> {{meetingDate}}</p>
        <p><strong>🕐 Time:</strong> {{meetingTime}}</p>
        <p><strong>📍 Location:</strong> {{meetingLocation}}</p>
        <p><strong>📝 Agenda:</strong> {{agenda}}</p>
      </div>
      <p>Please confirm your attendance and mark this on your calendar.</p>
    </div>
    <div class="footer">
      <p>© 2026 AetherTrack. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  },
  {
    name: 'Weekly Report Summary',
    code: 'WEEKLY_REPORT',
    subject: 'Weekly Report Summary - Week of {{weekDate}}',
    category: 'custom',
    isPredefined: false,
    variables: [
      { name: 'recipientName', description: 'Recipient\'s name', example: 'Emily Davis' },
      { name: 'weekDate', description: 'Week date range', example: 'Feb 10-16, 2026' },
      { name: 'completedTasks', description: 'Number of completed tasks', example: '15' },
      { name: 'inProgressTasks', description: 'Number of in-progress tasks', example: '8' },
      { name: 'upcomingDeadlines', description: 'Number of upcoming deadlines', example: '5' },
      { name: 'teamPerformance', description: 'Team performance summary', example: 'Excellent progress this week!' }
    ],
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .content h2 { color: #f59e0b; margin-top: 0; }
    .content p { line-height: 1.6; color: #333; }
    .stats { display: flex; justify-content: space-around; margin: 30px 0; }
    .stat-box { text-align: center; padding: 20px; background: #fffbeb; border-radius: 8px; flex: 1; margin: 0 10px; }
    .stat-box h3 { margin: 0; font-size: 32px; color: #d97706; }
    .stat-box p { margin: 10px 0 0 0; color: #92400e; }
    .summary-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📈 Weekly Report</h1>
    </div>
    <div class="content">
      <h2>Hello {{recipientName}},</h2>
      <p>Here's your weekly report summary for the week of <strong>{{weekDate}}</strong>:</p>
      <div class="stats">
        <div class="stat-box">
          <h3>{{completedTasks}}</h3>
          <p>Completed</p>
        </div>
        <div class="stat-box">
          <h3>{{inProgressTasks}}</h3>
          <p>In Progress</p>
        </div>
        <div class="stat-box">
          <h3>{{upcomingDeadlines}}</h3>
          <p>Deadlines</p>
        </div>
      </div>
      <div class="summary-box">
        <strong>Team Performance:</strong><br>
        {{teamPerformance}}
      </div>
      <p>Keep up the excellent work!</p>
    </div>
    <div class="footer">
      <p>© 2026 AetherTrack. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  },
  {
    name: 'System Maintenance Notice',
    code: 'MAINTENANCE_NOTICE',
    subject: 'Scheduled Maintenance: {{maintenanceDate}}',
    category: 'system',
    isPredefined: false,
    variables: [
      { name: 'recipientName', description: 'Recipient\'s name', example: 'Team Member' },
      { name: 'maintenanceDate', description: 'Date of maintenance', example: 'February 22, 2026' },
      { name: 'maintenanceTime', description: 'Time window', example: '2:00 AM - 4:00 AM EST' },
      { name: 'expectedDowntime', description: 'Expected downtime duration', example: '2 hours' },
      { name: 'maintenanceDetails', description: 'What will be done', example: 'Database optimization and security updates' }
    ],
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .content h2 { color: #ef4444; margin-top: 0; }
    .content p { line-height: 1.6; color: #333; }
    .warning-box { background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .warning-box h3 { margin-top: 0; color: #dc2626; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔧 Scheduled Maintenance</h1>
    </div>
    <div class="content">
      <h2>Dear {{recipientName}},</h2>
      <p>We wanted to inform you about an upcoming scheduled maintenance window.</p>
      <div class="warning-box">
        <h3>⚠️ Maintenance Details</h3>
        <p><strong>Date:</strong> {{maintenanceDate}}</p>
        <p><strong>Time:</strong> {{maintenanceTime}}</p>
        <p><strong>Expected Downtime:</strong> {{expectedDowntime}}</p>
        <p><strong>What We're Doing:</strong><br>{{maintenanceDetails}}</p>
      </div>
      <p>During this time, the system will be temporarily unavailable. We apologize for any inconvenience and appreciate your patience.</p>
      <p>If you have any questions, please contact our support team.</p>
    </div>
    <div class="footer">
      <p>© 2026 AetherTrack. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  }
];

async function addGenericEmails() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📧 Adding generic email templates...\n');

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const template of genericTemplates) {
      const existing = await EmailTemplate.findOne({ code: template.code });
      
      if (existing) {
        console.log(`⚠️  Template "${template.name}" already exists - updating...`);
        await EmailTemplate.findOneAndUpdate(
          { code: template.code },
          template,
          { new: true }
        );
        updated++;
      } else {
        await EmailTemplate.create(template);
        console.log(`✅ Added template: "${template.name}"`);
        added++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Added: ${added} templates`);
    console.log(`   🔄 Updated: ${updated} templates`);
    console.log(`   ⏭️  Skipped: ${skipped} templates`);
    console.log('\n✨ Generic email templates are ready for testing!\n');

  } catch (error) {
    console.error('❌ Error adding generic emails:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

addGenericEmails();
