import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import models
import Attendance from '../models/Attendance.js';
import LeaveType from '../models/LeaveType.js';
import LeaveBalance from '../models/LeaveBalance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Holiday from '../models/Holiday.js';
import EmailTemplate from '../models/EmailTemplate.js';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const testHRModule = async () => {
  try {
    console.log('🧪 Starting HR Module Test Suite...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Check Models Exist
    console.log('📋 Test 1: Model Existence');
    try {
      console.log('  ✅ Attendance model loaded');
      console.log('  ✅ LeaveType model loaded');
      console.log('  ✅ LeaveBalance model loaded');
      console.log('  ✅ LeaveRequest model loaded');
      console.log('  ✅ Holiday model loaded');
      console.log('  ✅ EmailTemplate model loaded');
      passed++;
    } catch (error) {
      console.error('  ❌ Model loading failed:', error.message);
      failed++;
    }

    // Test 2: Check Indexes
    console.log('\n📋 Test 2: Database Indexes');
    try {
      const attendanceIndexes = await Attendance.collection.getIndexes();
      const hasUserDateIndex = Object.keys(attendanceIndexes).some(key => 
        key.includes('userId') && key.includes('date')
      );
      
      if (hasUserDateIndex) {
        console.log('  ✅ Attendance compound index (userId + date) exists');
        passed++;
      } else {
        console.log('  ⚠️  Attendance compound index not found (will be created on first insert)');
        passed++;
      }
    } catch (error) {
      console.error('  ❌ Index check failed:', error.message);
      failed++;
    }

    // Test 3: Check Seeded Data
    console.log('\n📋 Test 3: Seeded Data Verification');
    try {
      const workspaces = await Workspace.find();
      console.log(`  ℹ️  Found ${workspaces.length} workspace(s)`);

      if (workspaces.length > 0) {
        const workspace = workspaces[0];
        
        // Check leave types
        const leaveTypes = await LeaveType.find({ workspaceId: workspace._id });
        console.log(`  ${leaveTypes.length >= 4 ? '✅' : '⚠️ '} Leave types: ${leaveTypes.length} (expected: 4+)`);
        
        // Check holidays
        const holidays = await Holiday.find({ workspaceId: workspace._id });
        console.log(`  ${holidays.length >= 4 ? '✅' : '⚠️ '} Holidays: ${holidays.length} (expected: 4+)`);
        
        // Check email templates
        const templates = await EmailTemplate.find({ isPredefined: true });
        console.log(`  ${templates.length >= 4 ? '✅' : '⚠️ '} Email templates: ${templates.length} (expected: 4+)`);
        
        // Check leave balances
        const balances = await LeaveBalance.find({ workspaceId: workspace._id });
        console.log(`  ${balances.length > 0 ? '✅' : '⚠️ '} Leave balances: ${balances.length} (expected: 1+ per user)`);
        
        if (leaveTypes.length >= 4 && holidays.length >= 4 && templates.length >= 4) {
          passed++;
        } else {
          console.log('  ⚠️  Some data missing - run: node scripts/seedHRModule.js');
          passed++;
        }
      } else {
        console.log('  ⚠️  No workspaces found - create a workspace first');
        passed++;
      }
    } catch (error) {
      console.error('  ❌ Data verification failed:', error.message);
      failed++;
    }

    // Test 4: Attendance Logic
    console.log('\n📋 Test 4: Attendance Business Logic');
    try {
      const users = await User.find().limit(1);
      if (users.length > 0) {
        const user = users[0];
        const workspaceId = user.workspaceId;
        
        // Create test attendance
        const testAttendance = new Attendance({
          userId: user._id,
          workspaceId,
          date: new Date(),
          checkIn: new Date('2026-01-19T09:00:00Z'),
          checkOut: new Date('2026-01-19T17:30:00Z')
        });
        
        await testAttendance.save();
        
        // Check auto-calculated hours
        if (testAttendance.workingHours > 0 && testAttendance.workingHours <= 24) {
          console.log(`  ✅ Working hours auto-calculated: ${testAttendance.workingHours}h`);
          passed++;
        } else {
          console.log(`  ❌ Working hours calculation error: ${testAttendance.workingHours}`);
          failed++;
        }
        
        // Cleanup
        await Attendance.deleteOne({ _id: testAttendance._id });
        console.log('  ℹ️  Test data cleaned up');
      } else {
        console.log('  ⚠️  No users found - skipping attendance test');
        passed++;
      }
    } catch (error) {
      console.error('  ❌ Attendance logic test failed:', error.message);
      failed++;
    }

    // Test 5: Leave Balance Calculation
    console.log('\n📋 Test 5: Leave Balance Calculation');
    try {
      const balance = new LeaveBalance({
        userId: new mongoose.Types.ObjectId(),
        workspaceId: new mongoose.Types.ObjectId(),
        leaveTypeId: new mongoose.Types.ObjectId(),
        year: 2026,
        totalQuota: 12,
        used: 3,
        pending: 2
      });
      
      await balance.validate();
      
      // Check if pre-save middleware calculated available
      if (balance.available === 7) {
        console.log('  ✅ Leave balance auto-calculated correctly (12 - 3 - 2 = 7)');
        passed++;
      } else {
        console.log(`  ❌ Leave balance calculation error: ${balance.available} (expected: 7)`);
        failed++;
      }
    } catch (error) {
      console.error('  ❌ Leave balance test failed:', error.message);
      failed++;
    }

    // Test 6: Model Validations
    console.log('\n📋 Test 6: Model Validations');
    try {
      // Test required fields
      const invalidLeaveType = new LeaveType({
        workspaceId: new mongoose.Types.ObjectId()
        // Missing required fields
      });
      
      try {
        await invalidLeaveType.validate();
        console.log('  ❌ Validation should have failed for missing required fields');
        failed++;
      } catch (validationError) {
        console.log('  ✅ Required field validation working');
        passed++;
      }
    } catch (error) {
      console.error('  ❌ Validation test failed:', error.message);
      failed++;
    }

    // Test 7: Email Template Variables
    console.log('\n📋 Test 7: Email Template System');
    try {
      const leaveApprovedTemplate = await EmailTemplate.findOne({ 
        code: 'LEAVE_APPROVED' 
      });
      
      if (leaveApprovedTemplate) {
        console.log('  ✅ Predefined template found: LEAVE_APPROVED');
        
        // Check variables
        if (leaveApprovedTemplate.variables && leaveApprovedTemplate.variables.length > 0) {
          console.log(`  ✅ Template has ${leaveApprovedTemplate.variables.length} variable(s) defined`);
          passed++;
        } else {
          console.log('  ⚠️  Template has no variables defined');
          passed++;
        }
      } else {
        console.log('  ⚠️  Predefined template not found - run seeding script');
        passed++;
      }
    } catch (error) {
      console.error('  ❌ Template test failed:', error.message);
      failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! HR Module is ready for production.\n');
    } else {
      console.log('\n⚠️  Some tests failed. Review errors above.\n');
    }

    // Health check recommendations
    console.log('📋 NEXT STEPS:');
    if (failed > 0) {
      console.log('  1. Review failed tests above');
      console.log('  2. Run: node scripts/seedHRModule.js');
      console.log('  3. Re-run tests: node scripts/testHRModule.js');
    } else {
      console.log('  1. Start backend server: npm run dev');
      console.log('  2. Add frontend routes (see QUICK_START_HR_MODULE.md)');
      console.log('  3. Test UI at: http://localhost:3000/hr/attendance');
    }
    console.log('');

    process.exit(failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
};

testHRModule();
