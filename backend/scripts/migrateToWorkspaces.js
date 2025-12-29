/**
 * Migration Script: Migrate Existing Data to Workspace Model
 * 
 * This script:
 * 1. Creates a default CORE workspace
 * 2. Assigns all existing users to the CORE workspace
 * 3. Assigns all existing tasks, teams, notifications, and changelogs to the CORE workspace
 * 4. Updates usage statistics
 * 
 * Run this script ONCE after deploying the workspace feature
 * 
 * Usage: node backend/scripts/migrateToWorkspaces.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
import User from '../models/User.js';
import Task from '../models/Task.js';
import Team from '../models/Team.js';
import Notification from '../models/Notification.js';
import ChangeLog from '../models/ChangeLog.js';
import Workspace from '../models/Workspace.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow';

async function migrateToWorkspaces() {
  try {
    console.log('🚀 Starting workspace migration...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if CORE workspace already exists
    let coreWorkspace = await Workspace.findOne({ type: 'CORE' });
    
    if (coreWorkspace) {
      console.log('⚠️  CORE workspace already exists:', coreWorkspace.name);
      console.log('   Workspace ID:', coreWorkspace._id);
      console.log('\n   Checking if migration is needed...\n');
    } else {
      // Find the first admin user to be the workspace owner
      const adminUser = await User.findOne({ role: 'admin' }).sort({ created_at: 1 });
      
      if (!adminUser) {
        console.error('❌ No admin user found. Please create an admin user first.');
        console.error('   Run: npm run seed:admin');
        process.exit(1);
      }

      console.log('👤 Found admin user:', adminUser.email);
      console.log('   Creating CORE workspace...\n');

      // Create CORE workspace
      coreWorkspace = new Workspace({
        name: process.env.COMPANY_NAME || 'TaskFlow Enterprise',
        type: 'CORE',
        owner: adminUser._id,
        isActive: true,
        // CORE workspace settings are automatically set by pre-save hook
      });

      await coreWorkspace.save();
      console.log('✅ Created CORE workspace:', coreWorkspace.name);
      console.log('   Workspace ID:', coreWorkspace._id);
      console.log('   Type:', coreWorkspace.type);
      console.log('   Features:', JSON.stringify(coreWorkspace.settings.features, null, 2));
      console.log();
    }

    const workspaceId = coreWorkspace._id;

    // Migrate Users
    console.log('👥 Migrating users...');
    const usersWithoutWorkspace = await User.countDocuments({ 
      workspaceId: { $exists: false } 
    });
    
    if (usersWithoutWorkspace > 0) {
      const userResult = await User.updateMany(
        { workspaceId: { $exists: false } },
        { $set: { workspaceId: workspaceId } }
      );
      console.log(`   ✅ Migrated ${userResult.modifiedCount} users to CORE workspace`);
    } else {
      console.log('   ℹ️  All users already have workspace assignments');
    }
    
    const totalUsers = await User.countDocuments({ workspaceId: workspaceId });
    console.log(`   📊 Total users in CORE workspace: ${totalUsers}\n`);

    // Migrate Tasks
    console.log('📋 Migrating tasks...');
    const tasksWithoutWorkspace = await Task.countDocuments({ 
      workspaceId: { $exists: false } 
    });
    
    if (tasksWithoutWorkspace > 0) {
      const taskResult = await Task.updateMany(
        { workspaceId: { $exists: false } },
        { $set: { workspaceId: workspaceId } }
      );
      console.log(`   ✅ Migrated ${taskResult.modifiedCount} tasks to CORE workspace`);
    } else {
      console.log('   ℹ️  All tasks already have workspace assignments');
    }
    
    const totalTasks = await Task.countDocuments({ workspaceId: workspaceId });
    console.log(`   📊 Total tasks in CORE workspace: ${totalTasks}\n`);

    // Migrate Teams
    console.log('👨‍👩‍👧‍👦 Migrating teams...');
    const teamsWithoutWorkspace = await Team.countDocuments({ 
      workspaceId: { $exists: false } 
    });
    
    if (teamsWithoutWorkspace > 0) {
      const teamResult = await Team.updateMany(
        { workspaceId: { $exists: false } },
        { $set: { workspaceId: workspaceId } }
      );
      console.log(`   ✅ Migrated ${teamResult.modifiedCount} teams to CORE workspace`);
    } else {
      console.log('   ℹ️  All teams already have workspace assignments');
    }
    
    const totalTeams = await Team.countDocuments({ workspaceId: workspaceId });
    console.log(`   📊 Total teams in CORE workspace: ${totalTeams}\n`);

    // Migrate Notifications
    console.log('🔔 Migrating notifications...');
    const notificationsWithoutWorkspace = await Notification.countDocuments({ 
      workspaceId: { $exists: false } 
    });
    
    if (notificationsWithoutWorkspace > 0) {
      const notificationResult = await Notification.updateMany(
        { workspaceId: { $exists: false } },
        { $set: { workspaceId: workspaceId } }
      );
      console.log(`   ✅ Migrated ${notificationResult.modifiedCount} notifications to CORE workspace`);
    } else {
      console.log('   ℹ️  All notifications already have workspace assignments');
    }
    
    const totalNotifications = await Notification.countDocuments({ workspaceId: workspaceId });
    console.log(`   📊 Total notifications in CORE workspace: ${totalNotifications}\n`);

    // Migrate ChangeLogs
    console.log('📝 Migrating audit logs (changelogs)...');
    const changeLogsWithoutWorkspace = await ChangeLog.countDocuments({ 
      workspaceId: { $exists: false } 
    });
    
    if (changeLogsWithoutWorkspace > 0) {
      const changeLogResult = await ChangeLog.updateMany(
        { workspaceId: { $exists: false } },
        { $set: { workspaceId: workspaceId } }
      );
      console.log(`   ✅ Migrated ${changeLogResult.modifiedCount} audit logs to CORE workspace`);
    } else {
      console.log('   ℹ️  All audit logs already have workspace assignments');
    }
    
    const totalChangeLogs = await ChangeLog.countDocuments({ workspaceId: workspaceId });
    console.log(`   📊 Total audit logs in CORE workspace: ${totalChangeLogs}\n`);

    // Update workspace usage statistics
    console.log('📊 Updating workspace usage statistics...');
    coreWorkspace.usage = {
      userCount: totalUsers,
      taskCount: totalTasks,
      teamCount: totalTeams,
    };
    await coreWorkspace.save();
    console.log('   ✅ Usage statistics updated\n');

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 CORE Workspace Summary:');
    console.log(`   Name: ${coreWorkspace.name}`);
    console.log(`   Type: ${coreWorkspace.type}`);
    console.log(`   Users: ${totalUsers}`);
    console.log(`   Tasks: ${totalTasks}`);
    console.log(`   Teams: ${totalTeams}`);
    console.log(`   Notifications: ${totalNotifications}`);
    console.log(`   Audit Logs: ${totalChangeLogs}`);
    console.log();
    console.log('🎉 All existing data has been migrated to the CORE workspace.');
    console.log('   Your TaskFlow instance is now multi-workspace enabled!');
    console.log();

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nError details:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

// Run migration
console.log('═══════════════════════════════════════════');
console.log('  TaskFlow Workspace Migration Script     ');
console.log('═══════════════════════════════════════════\n');

migrateToWorkspaces();
