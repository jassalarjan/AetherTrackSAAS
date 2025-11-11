import cron from 'node-cron';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import { sendOverdueTaskReminder, sendWeeklyReport } from './emailService.js';
import { generateExcelReport, generatePDFReport, isTaskOverdue, calculateDaysUntilDue } from './reportGenerator.js';
import { logChange } from './changeLogService.js';

// Initialize all scheduled jobs
export const initializeScheduler = () => {
  // Daily Overdue Task Reminders - Every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    await sendOverdueReminders();
  }, {
    scheduled: true,
    timezone: "Asia/Karachi" // Adjust to your timezone
  });

  // Weekly Reports - Every Monday at 8:00 AM
  cron.schedule('0 8 * * 1', async () => {
    await sendWeeklyReports();
  }, {
    scheduled: true,
    timezone: "Asia/Karachi" // Adjust to your timezone
  });
};

// Send overdue task reminders to users
const sendOverdueReminders = async () => {
  try {
    console.log('🔔 Starting overdue reminders automation...');
    
    // Log automation trigger
    await logChange({
      event_type: 'automation_triggered',
      action: 'Overdue task reminders automation',
      description: 'System triggered automatic overdue task reminder emails',
      target_type: 'automation',
      metadata: {
        automation_type: 'overdue_reminders',
        triggered_at: new Date().toISOString()
      }
    });

    // Get all tasks that are overdue
    const tasks = await Task.find({
      due_date: { $lt: new Date() },
      status: { $ne: 'done' }
    })
    .populate('assigned_to', 'full_name email')
    .populate('team_id', 'name');

    if (tasks.length === 0) {
      return;
    }

    // Group tasks by user
    const userTasksMap = new Map();
    
    tasks.forEach(task => {
      if (task.assigned_to && task.assigned_to.length > 0) {
        task.assigned_to.forEach(user => {
          if (user.email) {
            if (!userTasksMap.has(user.email)) {
              userTasksMap.set(user.email, {
                fullName: user.full_name,
                email: user.email,
                tasks: []
              });
            }
            
            const daysOverdue = Math.abs(calculateDaysUntilDue(task.due_date));
            userTasksMap.get(user.email).tasks.push({
              title: task.title,
              priority: task.priority,
              due_date: task.due_date,
              daysOverdue: daysOverdue
            });
          }
        });
      }
    });

    // Send email to each user with their overdue tasks
    let successCount = 0;
    let failCount = 0;

    for (const [email, userData] of userTasksMap.entries()) {
      try {
        const result = await sendOverdueTaskReminder(
          userData.fullName,
          userData.email,
          userData.tasks
        );
        
        if (result.success) {
          successCount++;
          console.log(`  ✅ Sent reminder to ${userData.fullName} (${userData.tasks.length} tasks)`);
        } else {
          failCount++;
          console.log(`  ❌ Failed to send to ${userData.fullName}: ${result.error}`);
        }
      } catch (error) {
        failCount++;
        console.error(`  ❌ Error sending to ${email}:`, error.message);
      }
    }

    console.log(`📊 Reminder Summary: ${successCount} sent, ${failCount} failed`);
    
    // Log automation completion
    await logChange({
      event_type: 'automation_triggered',
      action: 'Overdue reminders completed',
      description: `Overdue reminder automation completed: ${successCount} emails sent successfully, ${failCount} failed`,
      target_type: 'automation',
      metadata: {
        automation_type: 'overdue_reminders',
        success_count: successCount,
        fail_count: failCount,
        total_tasks: tasks.length,
        completed_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error in sendOverdueReminders:', error);
    
    // Log automation error
    await logChange({
      event_type: 'automation_triggered',
      action: 'Overdue reminders failed',
      description: `Overdue reminder automation failed: ${error.message}`,
      target_type: 'automation',
      metadata: {
        automation_type: 'overdue_reminders',
        error: error.message,
        failed_at: new Date().toISOString()
      }
    });
  }
};

// Generate and send weekly reports to admins
const sendWeeklyReports = async () => {
  try {
    console.log('📊 Generating weekly reports...');
    
    // Log automation trigger
    await logChange({
      event_type: 'automation_triggered',
      action: 'Weekly reports automation',
      description: 'System triggered automatic weekly report generation and distribution',
      target_type: 'automation',
      metadata: {
        automation_type: 'weekly_reports',
        triggered_at: new Date().toISOString()
      }
    });
    
    // Get all tasks from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const allTasks = await Task.find()
      .populate('assigned_to', 'full_name email')
      .populate('team_id', 'name')
      .populate('created_by', 'full_name');

    const weekTasks = allTasks.filter(task => 
      new Date(task.created_at) >= sevenDaysAgo
    );

    console.log(`📝 Total tasks: ${allTasks.length}, This week: ${weekTasks.length}`);

    // Calculate analytics
    const overdueTasks = allTasks.filter(isTaskOverdue);
    const completedTasks = allTasks.filter(task => task.status === 'done');
    const inProgressTasks = allTasks.filter(task => task.status === 'in_progress');

    // Get unique teams and users
    const uniqueTeams = new Set(allTasks.map(t => t.team_id?.name).filter(Boolean));
    const uniqueUsers = new Set();
    allTasks.forEach(task => {
      if (task.assigned_to) {
        task.assigned_to.forEach(user => uniqueUsers.add(user._id.toString()));
      }
    });

    const analytics = {
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      overdueTasks: overdueTasks.length,
      activeTeams: uniqueTeams.size,
      activeUsers: uniqueUsers.size,
      statusDistribution: [
        { name: 'Todo', value: allTasks.filter(t => t.status === 'todo').length },
        { name: 'In Progress', value: inProgressTasks.length },
        { name: 'Review', value: allTasks.filter(t => t.status === 'review').length },
        { name: 'Done', value: completedTasks.length },
      ]
    };

    const completionRate = analytics.totalTasks > 0 
      ? ((analytics.completedTasks / analytics.totalTasks) * 100).toFixed(1)
      : '0.0';

    // Generate reports
    console.log('📄 Generating Excel report...');
    const excelBuffer = await generateExcelReport(allTasks, analytics);
    
    console.log('📄 Generating PDF report...');
    const pdfBuffer = generatePDFReport(allTasks, analytics);

    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekRange = `${weekStart.toLocaleDateString()} - ${now.toLocaleDateString()}`;

    // Prepare report data for email
    const reportData = {
      weekRange,
      totalTasks: analytics.totalTasks,
      completedTasks: analytics.completedTasks,
      inProgressTasks: analytics.inProgressTasks,
      overdueTasks: analytics.overdueTasks,
      completionRate: completionRate,
      activeTeams: analytics.activeTeams,
      activeUsers: analytics.activeUsers,
    };

    // Prepare attachments
    const timestamp = now.toISOString().slice(0, 10);
    const attachments = [
      {
        filename: `TaskFlow_Report_${timestamp}.xlsx`,
        content: Buffer.from(excelBuffer),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      {
        filename: `TaskFlow_Report_${timestamp}.pdf`,
        content: Buffer.from(pdfBuffer),
        contentType: 'application/pdf'
      }
    ];

    // Get all admin and HR users
    const admins = await User.find({
      role: { $in: ['admin', 'hr'] },
      email: { $exists: true, $ne: '' }
    });

    console.log(`📧 Sending reports to ${admins.length} admin/HR users...`);

    // Send email to each admin
    let successCount = 0;
    let failCount = 0;

    for (const admin of admins) {
      try {
        const result = await sendWeeklyReport(
          admin.full_name,
          admin.email,
          reportData,
          attachments
        );
        
        if (result.success) {
          successCount++;
          console.log(`  ✅ Sent report to ${admin.full_name} (${admin.email})`);
        } else {
          failCount++;
          console.log(`  ❌ Failed to send to ${admin.full_name}: ${result.error}`);
        }
      } catch (error) {
        failCount++;
        console.error(`  ❌ Error sending to ${admin.email}:`, error.message);
      }
    }

    console.log(`📊 Report Summary: ${successCount} sent, ${failCount} failed`);
    
    // Log report generation and distribution
    await logChange({
      event_type: 'report_generated',
      action: 'Weekly reports generated and sent',
      description: `Weekly reports generated and distributed: ${successCount} recipients received reports, ${failCount} failed`,
      target_type: 'report',
      metadata: {
        report_type: 'weekly_summary',
        success_count: successCount,
        fail_count: failCount,
        total_tasks: allTasks.length,
        completed_tasks: analytics.completedTasks,
        completion_rate: completionRate,
        week_range: weekRange,
        completed_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error in sendWeeklyReports:', error);
    
    // Log report generation error
    await logChange({
      event_type: 'automation_triggered',
      action: 'Weekly reports failed',
      description: `Weekly report generation failed: ${error.message}`,
      target_type: 'automation',
      metadata: {
        automation_type: 'weekly_reports',
        error: error.message,
        failed_at: new Date().toISOString()
      }
    });
  }
};

// Manual trigger functions (for testing)
export const triggerOverdueReminders = async () => {
  console.log('🔧 Manually triggering overdue reminders...');
  await sendOverdueReminders();
};

export const triggerWeeklyReports = async () => {
  console.log('🔧 Manually triggering weekly reports...');
  await sendWeeklyReports();
};

export default {
  initializeScheduler,
  triggerOverdueReminders,
  triggerWeeklyReports
};
