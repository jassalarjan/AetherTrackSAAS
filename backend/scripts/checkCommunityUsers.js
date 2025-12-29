import mongoose from 'mongoose';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkCommunityUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow');
    console.log('Connected to MongoDB\n');

    // Get all community admins
    const communityAdmins = await User.find({ role: 'community_admin' }).populate('workspaceId');
    
    console.log('=== Community Admins ===');
    if (communityAdmins.length === 0) {
      console.log('No community admins found');
    } else {
      communityAdmins.forEach(u => {
        console.log(`
Email: ${u.email}
Name: ${u.full_name}
Workspace: ${u.workspaceId?.name || 'NO WORKSPACE'}
Workspace ID: ${u.workspaceId?._id || 'N/A'}
Workspace Active: ${u.workspaceId?.isActive ?? 'N/A'}
---`);
      });
    }

    // Get all workspaces
    console.log('\n=== All Workspaces ===');
    const workspaces = await Workspace.find();
    workspaces.forEach(ws => {
      console.log(`
Name: ${ws.name}
Type: ${ws.type}
Active: ${ws.isActive}
ID: ${ws._id}
---`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkCommunityUsers();
