import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeaveType from '../models/LeaveType.js';
import LeaveBalance from '../models/LeaveBalance.js';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jassalarjansingh_db_user:waheguru@taskflow.rsodja4.mongodb.net/?appName=TaskFlow';

// Default leave types with generous quotas
const defaultLeaveTypes = [
  {
    name: 'Annual Leave',
    code: 'AL',
    annualQuota: 20,
    carryForward: true,
    maxCarryForward: 5,
    color: '#3b82f6',
    description: 'Annual paid leave for vacation and personal time'
  },
  {
    name: 'Sick Leave',
    code: 'SL',
    annualQuota: 12,
    carryForward: false,
    maxCarryForward: 0,
    color: '#ef4444',
    description: 'Paid leave for illness or medical appointments'
  },
  {
    name: 'Casual Leave',
    code: 'CL',
    annualQuota: 10,
    carryForward: false,
    maxCarryForward: 0,
    color: '#f59e0b',
    description: 'Casual leave for unplanned short absences'
  },
  {
    name: 'Maternity Leave',
    code: 'ML',
    annualQuota: 90,
    carryForward: false,
    maxCarryForward: 0,
    color: '#ec4899',
    description: 'Maternity leave for childbirth and recovery'
  },
  {
    name: 'Paternity Leave',
    code: 'PL',
    annualQuota: 14,
    carryForward: false,
    maxCarryForward: 0,
    color: '#8b5cf6',
    description: 'Paternity leave for new fathers'
  },
  {
    name: 'Bereavement Leave',
    code: 'BL',
    annualQuota: 5,
    carryForward: false,
    maxCarryForward: 0,
    color: '#6b7280',
    description: 'Compassionate leave for loss of family members'
  },
  {
    name: 'Study Leave',
    code: 'STL',
    annualQuota: 10,
    carryForward: true,
    maxCarryForward: 3,
    color: '#10b981',
    description: 'Leave for educational purposes and exams'
  },
  {
    name: 'Compensatory Off',
    code: 'CO',
    annualQuota: 12,
    carryForward: true,
    maxCarryForward: 6,
    color: '#06b6d4',
    description: 'Time off in lieu of working on holidays or overtime'
  }
];

async function seedLeaveTypes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all workspaces
    const workspaces = await Workspace.find({});
    console.log(`\n📊 Found ${workspaces.length} workspace(s)`);

    for (const workspace of workspaces) {
      console.log(`\n🏢 Processing workspace: ${workspace.name} (${workspace.type})`);

      // Check if leave types already exist
      const existingTypes = await LeaveType.find({ workspaceId: workspace._id });
      
      if (existingTypes.length > 0) {
        console.log(`   ℹ️  ${existingTypes.length} leave type(s) already exist, skipping...`);
        continue;
      }

      // Create leave types for this workspace
      const createdTypes = [];
      for (const typeData of defaultLeaveTypes) {
        const leaveType = new LeaveType({
          ...typeData,
          workspaceId: workspace._id,
          isActive: true
        });
        await leaveType.save();
        createdTypes.push(leaveType);
        console.log(`   ✅ Created: ${typeData.name} (${typeData.code}) - ${typeData.annualQuota} days`);
      }

      // Get all users in this workspace
      const users = await User.find({ workspaceId: workspace._id });
      console.log(`   👥 Found ${users.length} user(s) in workspace`);

      // Create leave balances for all users
      const currentYear = new Date().getFullYear();
      let balanceCount = 0;

      for (const user of users) {
        for (const leaveType of createdTypes) {
          // Check if balance already exists
          const existingBalance = await LeaveBalance.findOne({
            userId: user._id,
            leaveTypeId: leaveType._id,
            year: currentYear
          });

          if (!existingBalance) {
            await LeaveBalance.create({
              userId: user._id,
              workspaceId: workspace._id,
              leaveTypeId: leaveType._id,
              year: currentYear,
              totalQuota: leaveType.annualQuota,
              used: 0,
              pending: 0,
              available: leaveType.annualQuota
            });
            balanceCount++;
          }
        }
      }

      console.log(`   ✅ Created ${balanceCount} leave balance record(s)`);
    }

    console.log('\n✅ Leave types seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - 8 leave types per workspace');
    console.log('   - Annual Leave: 20 days (carry forward up to 5)');
    console.log('   - Sick Leave: 12 days');
    console.log('   - Casual Leave: 10 days');
    console.log('   - Maternity Leave: 90 days');
    console.log('   - Paternity Leave: 14 days');
    console.log('   - Bereavement Leave: 5 days');
    console.log('   - Study Leave: 10 days (carry forward up to 3)');
    console.log('   - Compensatory Off: 12 days (carry forward up to 6)');

  } catch (error) {
    console.error('❌ Error seeding leave types:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

seedLeaveTypes();
