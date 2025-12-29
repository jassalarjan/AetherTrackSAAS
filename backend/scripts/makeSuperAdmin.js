import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const email = process.argv[2] || 'jassalarjansingh@gmail.com';

async function makeSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow');
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log('Found user:', { 
      email: user.email, 
      name: user.full_name, 
      currentRole: user.role,
      currentWorkspaceId: user.workspaceId 
    });

    // Update to system admin
    user.role = 'admin';
    user.workspaceId = null;  // System admins have no workspace
    user.team_id = null;      // System admins are not in teams
    await user.save();

    console.log('\n✅ User updated to System Admin (Super Admin):');
    console.log({
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
      team_id: user.team_id,
      isSystemAdmin: true
    });
    console.log('\n🔑 This user now has full access to:');
    console.log('  - All workspaces');
    console.log('  - Workspace management');
    console.log('  - All users across all workspaces');
    console.log('  - All teams across all workspaces');
    console.log('  - System-wide audit logs');
    console.log('  - All settings and configurations');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

makeSuperAdmin();
