import mongoose from 'mongoose';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserWorkspace() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get email from command line argument
    const email = process.argv[2];
    
    if (!email) {
      console.log('Usage: node scripts/checkUserWorkspace.js <email>');
      process.exit(1);
    }

    const user = await User.findOne({ email })
      .populate('workspaceId', 'name type owner isActive');

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log('=== User Info ===');
    console.log(`Name: ${user.full_name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Email Verified: ${user.isEmailVerified}`);
    console.log(`\n=== Workspace Info ===`);
    
    if (user.workspaceId) {
      console.log(`Workspace ID: ${user.workspaceId._id}`);
      console.log(`Workspace Name: ${user.workspaceId.name}`);
      console.log(`Workspace Type: ${user.workspaceId.type}`);
      console.log(`Is Active: ${user.workspaceId.isActive}`);
      console.log(`Owner ID: ${user.workspaceId.owner}`);
      console.log(`Is Owner: ${user.workspaceId.owner?.toString() === user._id.toString()}`);
    } else {
      console.log('No workspace assigned');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserWorkspace();
