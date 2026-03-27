import mongoose from 'mongoose';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Script to automatically assign users to a workspace
 * Usage: 
 *   node fix-workspace-context.js                    - Auto-find/create workspace
 *   node fix-workspace-context.js <workspaceId>       - Assign to specific workspace
 * 
 * This script fixes the VerificationSettings validation error that occurs
 * when users try to access verification settings but have no workspace assigned.
 */

async function fixWorkspaceContext() {
  try {
    // Get workspaceId from command line argument
    const args = process.argv.slice(2);
    const specifiedWorkspaceId = args[0];

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find users without workspace (null workspaceId)
    const usersWithoutWorkspace = await User.find({
      workspaceId: null
    });

    if (usersWithoutWorkspace.length === 0) {
      console.log('✅ All users have workspaces assigned!');
      console.log('   No users need to be fixed.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('='.repeat(60));
    console.log('🔧 WORKSPACE ASSIGNMENT FIX');
    console.log('='.repeat(60));
    console.log(`\n⚠️  Found ${usersWithoutWorkspace.length} users without workspace:`);
    usersWithoutWorkspace.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role})`);
    });

    let workspace;

    if (specifiedWorkspaceId) {
      // Use specified workspace
      console.log(`\n📦 Using specified workspace ID: ${specifiedWorkspaceId}`);
      
      // Validate the workspace exists
      workspace = await Workspace.findById(specifiedWorkspaceId);
      
      if (!workspace) {
        console.error(`\n❌ Error: Workspace with ID ${specifiedWorkspaceId} not found!`);
        console.log('   Please provide a valid workspace ID.');
        await mongoose.disconnect();
        process.exit(1);
      }
      
      console.log(`   Workspace name: ${workspace.name}`);
    } else {
      // Auto-find or create a default workspace
      console.log('\n🔍 No workspace ID specified. Looking for existing workspace...');
      
      // Try to find an existing COMMUNITY workspace first
      workspace = await Workspace.findOne({ type: 'COMMUNITY' });
      
      if (!workspace) {
        // Try to find any active workspace
        workspace = await Workspace.findOne({ isActive: true });
      }

      if (!workspace) {
        console.log('\n📦 No existing workspace found. Creating a default workspace...');
        
        // Find first admin to be owner
        const adminUser = await User.findOne({ role: 'admin' });
        
        workspace = await Workspace.create({
          name: 'Default Workspace',
          type: 'COMMUNITY',
          owner: adminUser?._id,
          isActive: true,
          settings: {
            features: {
              auditLogs: false,
              advancedAnalytics: false,
              bulkImport: false,
              customFields: false,
              apiAccess: false
            }
          },
          limits: {
            maxUsers: 10,
            maxTeams: 3,
            maxTasks: 100,
            maxStorage: 1073741824 // 1GB
          },
          usage: {
            userCount: 0,
            teamCount: 0,
            taskCount: 0,
            storageUsed: 0
          }
        });
        
        console.log(`✅ Created new workspace: ${workspace.name} (${workspace._id})`);
      } else {
        console.log(`   Using existing workspace: ${workspace.name} (${workspace._id})`);
      }
    }

    // Assign all users to this workspace
    console.log('\n📥 Assigning users to workspace...\n');
    
    const assignedUsers = [];
    for (const user of usersWithoutWorkspace) {
      const oldWorkspaceId = user.workspaceId;
      user.workspaceId = workspace._id;
      await user.save();
      assignedUsers.push({
        email: user.email,
        name: user.full_name,
        oldWorkspaceId: oldWorkspaceId,
        newWorkspaceId: workspace._id
      });
      console.log(`   ✅ ${user.email}`);
    }

    // Update workspace usage count
    const totalUsers = await User.countDocuments({ 
      workspaceId: workspace._id 
    });
    workspace.usage.userCount = totalUsers;
    await workspace.save();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ FIX COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   • Users fixed: ${assignedUsers.length}`);
    console.log(`   • Workspace: ${workspace.name} (${workspace._id})`);
    console.log(`   • Total users in workspace: ${totalUsers}`);
    
    console.log('\n📝 Fixed users:');
    assignedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - ${user.name}`);
    });

    console.log('\n🎉 Done! Users can now access verification settings.');
    console.log('   Restart your backend server if needed.\n');
    
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixWorkspaceContext();
