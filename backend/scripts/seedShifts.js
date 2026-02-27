/**
 * Seed script for Shift Management data
 * Run with: node scripts/seedShifts.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shift from '../models/Shift.js';
import ShiftPolicy from '../models/ShiftPolicy.js';
import User from '../models/User.js';

dotenv.config();

const sampleShifts = [
  {
    shift_name: 'Morning Shift',
    shift_type: 'morning',
    start_time: '09:00',
    end_time: '17:00',
    total_hours: 8,
    grace_period_minutes: 15,
    early_exit_threshold_minutes: 30,
    min_hours_for_present: 4,
    min_hours_for_half_day: 4,
    is_night_shift: false,
    shift_color: '#3b82f6',
    break_policy: {
      break_duration_minutes: 60,
      paid_break: true,
      max_breaks: 1,
      break_after_hours: 4
    }
  },
  {
    shift_name: 'Evening Shift',
    shift_type: 'evening',
    start_time: '14:00',
    end_time: '22:00',
    total_hours: 8,
    grace_period_minutes: 15,
    early_exit_threshold_minutes: 30,
    min_hours_for_present: 4,
    min_hours_for_half_day: 4,
    is_night_shift: false,
    shift_color: '#8b5cf6',
    break_policy: {
      break_duration_minutes: 60,
      paid_break: true,
      max_breaks: 1,
      break_after_hours: 4
    }
  },
  {
    shift_name: 'Night Shift',
    shift_type: 'night',
    start_time: '22:00',
    end_time: '06:00',
    total_hours: 8,
    grace_period_minutes: 15,
    early_exit_threshold_minutes: 30,
    min_hours_for_present: 4,
    min_hours_for_half_day: 4,
    is_night_shift: true,
    shift_color: '#6366f1',
    break_policy: {
      break_duration_minutes: 45,
      paid_break: true,
      max_breaks: 1,
      break_after_hours: 4
    }
  },
  {
    shift_name: 'General Shift',
    shift_type: 'flexible',
    start_time: '10:00',
    end_time: '18:00',
    total_hours: 8,
    grace_period_minutes: 10,
    early_exit_threshold_minutes: 30,
    min_hours_for_present: 4,
    min_hours_for_half_day: 4,
    is_night_shift: false,
    shift_color: '#10b981',
    break_policy: {
      break_duration_minutes: 60,
      paid_break: true,
      max_breaks: 1,
      break_after_hours: 4
    }
  }
];

const samplePolicy = {
  policy_name: 'Default Organization Policy',
  shift_mode: 'single',
  allowed_hours: [8],
  shift_slots: [],
  overtime_enabled: true,
  overtime_threshold_hours: 8,
  overtime_rate_multiplier: 1.5,
  effective_from: new Date(),
  is_active: true
};

async function seedShifts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find an admin user to use as creator
    const adminUser = await User.findOne({ role: 'admin' }).select('_id');
    if (!adminUser) {
      console.log('No admin user found, using null for created_by');
    }
    const creatorId = adminUser ? adminUser._id : null;

    // Add created_by to each shift
    const shiftsWithCreator = sampleShifts.map(shift => ({
      ...shift,
      created_by: creatorId
    }));

    // Clear existing shifts
    await Shift.deleteMany({});
    console.log('Cleared existing shifts');

    // Create new shifts
    const createdShifts = await Shift.insertMany(shiftsWithCreator);
    console.log(`Created ${createdShifts.length} shifts`);

    // Update policy with shift slots
    const morningShift = createdShifts.find(s => s.shift_name === 'Morning Shift');
    const eveningShift = createdShifts.find(s => s.shift_name === 'Evening Shift');
    const nightShift = createdShifts.find(s => s.shift_name === 'Night Shift');
    const generalShift = createdShifts.find(s => s.shift_name === 'General Shift');

    if (morningShift) {
      await ShiftPolicy.deleteMany({});
      
      // Create policies for different shift modes
      const singlePolicy = new ShiftPolicy({
        ...samplePolicy,
        policy_name: 'Single Shift Policy',
        shift_mode: 'single',
        shift_slots: [
          { slot_label: 'A', shift_id: morningShift._id }
        ],
        created_by: creatorId
      });
      await singlePolicy.save();
      console.log('Created Single Shift Policy');

      const doublePolicy = new ShiftPolicy({
        policy_name: 'Double Shift Policy',
        shift_mode: 'double',
        allowed_hours: [8, 8],
        shift_slots: [
          { slot_label: 'A', shift_id: morningShift._id },
          { slot_label: 'B', shift_id: eveningShift._id }
        ],
        overtime_enabled: true,
        overtime_threshold_hours: 8,
        overtime_rate_multiplier: 1.5,
        effective_from: new Date(),
        is_active: false,
        created_by: creatorId
      });
      await doublePolicy.save();
      console.log('Created Double Shift Policy');

      const triplePolicy = new ShiftPolicy({
        policy_name: 'Triple Shift Policy',
        shift_mode: 'triple',
        allowed_hours: [8, 8, 8],
        shift_slots: [
          { slot_label: 'A', shift_id: morningShift._id },
          { slot_label: 'B', shift_id: eveningShift._id },
          { slot_label: 'C', shift_id: nightShift._id }
        ],
        overtime_enabled: true,
        overtime_threshold_hours: 8,
        overtime_rate_multiplier: 1.5,
        effective_from: new Date(),
        is_active: false,
        created_by: creatorId
      });
      await triplePolicy.save();
      console.log('Created Triple Shift Policy');
    }

    console.log('\n✅ Seed data created successfully!');
    console.log('\nShifts created:');
    createdShifts.forEach(s => {
      console.log(`  - ${s.shift_name} (${s.start_time} - ${s.end_time})`);
    });

  } catch (error) {
    console.error('Error seeding shifts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedShifts();
