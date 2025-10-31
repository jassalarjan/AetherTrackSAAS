import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

async function run() {
  try {
    await connectDB();
    const fullName = process.env.ADMIN_FULL_NAME || 'System Admin';
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

    let user = await User.findOne({ email });
    if (user) {
      console.log(`Admin user already exists: ${email} (role: ${user.role})`);
      process.exit(0);
    }

    user = new User({
      full_name: fullName,
      email,
      password_hash: password,
      role: 'admin',
    });

    await user.save();
    console.log('✅ Admin user created:', { id: user._id.toString(), email });
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed admin user:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

run();
