import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

dotenv.config();

const SAMPLE_NOTIFICATIONS = [
  {
    type: 'success',
    title: 'Action Completed',
    message: 'Your recent action completed successfully.',
    link: '/dashboard'
  },
  {
    type: 'error',
    title: 'Action Failed',
    message: 'We could not complete a recent request. Please retry.',
    link: '/dashboard'
  },
  {
    type: 'warning',
    title: 'Review Recommended',
    message: 'A task requires attention before the deadline.',
    link: '/tasks'
  },
  {
    type: 'info',
    title: 'FYI Update',
    message: 'A new update is available in your workspace.',
    link: '/dashboard'
  },
  {
    type: 'task_assigned',
    title: 'Task Assigned',
    message: 'A new task has been assigned to you.',
    link: '/tasks'
  },
  {
    type: 'task_updated',
    title: 'Task Updated',
    message: 'One of your tasks was updated by a teammate.',
    link: '/tasks'
  },
  {
    type: 'task_completed',
    title: 'Task Completed',
    message: 'A tracked task has been marked as completed.',
    link: '/tasks'
  },
  {
    type: 'task_overdue',
    title: 'Task Overdue',
    message: 'A task is now overdue and needs action.',
    link: '/tasks'
  },
  {
    type: 'comment_added',
    title: 'New Comment',
    message: 'A new comment was added on your task.',
    link: '/tasks'
  },
  {
    type: 'status_changed',
    title: 'Status Changed',
    message: 'A task status changed and needs review.',
    link: '/tasks'
  },
  {
    type: 'task_due',
    title: 'Task Due Soon',
    message: 'A task is approaching its due date.',
    link: '/tasks'
  },
  {
    type: 'meeting_created',
    title: 'Meeting Created',
    message: 'A new meeting has been scheduled.',
    link: '/hr/meetings'
  },
  {
    type: 'meeting_updated',
    title: 'Meeting Updated',
    message: 'A meeting was updated with new details.',
    link: '/hr/meetings'
  },
  {
    type: 'meeting_cancelled',
    title: 'Meeting Cancelled',
    message: 'A meeting was cancelled.',
    link: '/hr/meetings'
  },
  {
    type: 'leave_approved',
    title: 'Leave Approved',
    message: 'A leave request has been approved.',
    link: '/hr/leaves'
  },
  {
    type: 'leave_rejected',
    title: 'Leave Rejected',
    message: 'A leave request has been rejected.',
    link: '/hr/leaves'
  },
  {
    type: 'leave_pending',
    title: 'Leave Pending',
    message: 'A leave request is waiting for review.',
    link: '/hr/leaves'
  },
  {
    type: 'task_reallocated',
    title: 'Task Reallocated',
    message: 'A task was reallocated because of availability changes.',
    link: '/tasks'
  },
  {
    type: 'reallocation_pending',
    title: 'Reallocation Pending',
    message: 'A task reallocation is pending your action.',
    link: '/tasks'
  },
  {
    type: 'reallocation_accepted',
    title: 'Reallocation Accepted',
    message: 'A task reallocation has been accepted.',
    link: '/tasks'
  },
  {
    type: 'reallocation_rejected',
    title: 'Reallocation Rejected',
    message: 'A task reallocation has been rejected.',
    link: '/tasks'
  },
  {
    type: 'reallocation_redistributed',
    title: 'Task Redistributed',
    message: 'A reallocated task has been redistributed to another assignee.',
    link: '/tasks'
  }
];

function getFlagValue(flagName) {
  const args = process.argv.slice(2);
  const withEquals = args.find((arg) => arg.startsWith(`${flagName}=`));
  if (withEquals) {
    return withEquals.slice(flagName.length + 1);
  }

  const index = args.indexOf(flagName);
  if (index === -1 || !args[index + 1]) {
    return null;
  }

  return args[index + 1];
}

async function resolveTargetUser() {
  const userId = getFlagValue('--userId');
  const email = getFlagValue('--email');

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const userById = await User.findById(userId).select('_id full_name email employmentStatus workspaceId');
    if (userById) return userById;
  }

  if (email) {
    const userByEmail = await User.findOne({ email: String(email).trim().toLowerCase() })
      .select('_id full_name email employmentStatus workspaceId');
    if (userByEmail) return userByEmail;
  }

  return User.findOne({ employmentStatus: 'ACTIVE' })
    .sort({ created_at: 1 })
    .select('_id full_name email employmentStatus workspaceId');
}

async function run() {
  try {
    await connectDB();

    const targetUser = await resolveTargetUser();
    if (!targetUser) {
      console.error('No target user found. Provide --email or --userId, or create an ACTIVE user first.');
      process.exit(1);
    }

    const allUnread = process.argv.slice(2).includes('--all-unread');
    const now = Date.now();

    const docs = SAMPLE_NOTIFICATIONS.map((entry, index) => {
      const createdAt = new Date(now - index * 5 * 60 * 1000);
      const isRead = allUnread ? false : index % 6 === 0;

      return {
        user_id: targetUser._id,
        type: entry.type,
        title: entry.title,
        message: entry.message,
        link: entry.link,
        read_at: isRead ? new Date(createdAt.getTime() + 60 * 1000) : null,
        created_at: createdAt,
        payload: {
          title: entry.title,
          message: entry.message,
          link: entry.link,
          generatedBy: 'scripts/create-sample-notifications.js'
        }
      };
    });

    const inserted = await Notification.insertMany(docs, { ordered: true });

    console.log('Sample notifications created successfully.');
    console.log(`Target user: ${targetUser.full_name} <${targetUser.email}> (${targetUser._id.toString()})`);
    console.log(`Created: ${inserted.length}`);

    const counts = inserted.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    Object.entries(counts).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Failed to create sample notifications:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

run();