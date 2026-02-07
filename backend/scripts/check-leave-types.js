import mongoose from 'mongoose';
import LeaveType from '../models/LeaveType.js';
import Workspace from '../models/Workspace.js';

async function checkLeaveTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const workspaces = await Workspace.find({});
    console.log(`\nFound ${workspaces.length} workspaces`);

    const leaveTypes = await LeaveType.find({}).populate('workspaceId');
    console.log(`Total leave types in database: ${leaveTypes.length}`);

    // Group by workspace and name
    const grouped = {};
    leaveTypes.forEach(lt => {
      const workspaceName = lt.workspaceId?.name || 'Unknown';
      const key = `${workspaceName} - ${lt.name}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(lt._id);
    });

    console.log('\n=== Leave Types by Workspace ===');
    Object.entries(grouped).forEach(([key, ids]) => {
      console.log(`${key}: ${ids.length} occurrence(s)`);
      if (ids.length > 1) {
        console.log(`  ⚠️  DUPLICATE IDs: ${ids.join(', ')}`);
      }
    });

    // Check for duplicates within each workspace
    const duplicates = Object.entries(grouped).filter(([_, ids]) => ids.length > 1);
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  Found duplicates! You can clean them up.');
    } else {
      console.log('\n✓ No duplicates found!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkLeaveTypes();
