import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Task from '../models/Task.js';

dotenv.config();

const migrateTasksForSprints = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all tasks without sprint_id field
    const tasksToUpdate = await Task.find({ sprint_id: { $exists: false } });
    console.log(`📊 Found ${tasksToUpdate.length} tasks to update`);

    if (tasksToUpdate.length === 0) {
      console.log('✨ All tasks already have sprint_id field');
      process.exit(0);
    }

    // Update tasks with sprint_id: null
    const result = await Task.updateMany(
      { sprint_id: { $exists: false } },
      { $set: { sprint_id: null } }
    );

    console.log(`✅ Updated ${result.modifiedCount} tasks with sprint_id: null`);
    console.log('✨ Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateTasksForSprints();
