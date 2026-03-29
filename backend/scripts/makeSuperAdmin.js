import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const email = process.argv[2] || 'jassalarjansingh@gmail.com';
const password = process.argv[3] || 'waheguru';

async function makeSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/AetherTrack');
    console.log('Connected to MongoDB');

    let user = await User.findOne({ email });

    if (!user) {
      console.log(`User not found. Creating new super admin user...`);
      
      // Hash the password
      const password_hash = await bcrypt.hash(password, 10);
      
      // Create new super admin user
      user = new User({
        full_name: 'Super Admin',
        email: email,
        password_hash: password_hash,
        role: 'super_admin',
        workspaceId: null,  // System admins have no workspace
        team_id: null,      // System admins are not in teams
        isEmailVerified: true,
        employmentStatus: 'ACTIVE'
      });
      
      await user.save();
      
      console.log('\n✅ New Super Admin user created:');
      console.log({
        email: user.email,
        name: user.full_name,
        role: user.role,
        workspaceId: user.workspaceId,
        team_id: user.team_id,
        isSystemAdmin: true
      });
    } else {
      console.log('Found user:', { 
        email: user.email, 
        name: user.full_name, 
        currentRole: user.role,
        currentWorkspaceId: user.workspaceId 
      });

      // Update to super admin
      user.role = 'super_admin';
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
    }

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
