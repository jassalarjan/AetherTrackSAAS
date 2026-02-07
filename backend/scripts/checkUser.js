import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'jassalarjansingh@gmail.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.log('❌ User not found');
    } else {
      console.log('✅ User found:');
      console.log({
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        workspaceId: user.workspaceId,
        team_id: user.team_id,
        isEmailVerified: user.isEmailVerified,
        employmentStatus: user.employmentStatus,
        hasPasswordHash: !!user.password_hash
      });
      
      // Test password
      const testPassword = 'waheguru';
      const isMatch = await user.comparePassword(testPassword);
      console.log('\n🔑 Password test with "waheguru":', isMatch ? '✅ MATCH' : '❌ NO MATCH');
      
      if (!isMatch) {
        console.log('\n⚠️  Password does not match. Resetting password...');
        user.password_hash = testPassword; // Will be hashed by pre-save hook
        await user.save();
        console.log('✅ Password reset to "waheguru"');
        
        // Test again
        const user2 = await User.findOne({ email });
        const isMatch2 = await user2.comparePassword(testPassword);
        console.log('🔑 Password test after reset:', isMatch2 ? '✅ MATCH' : '❌ NO MATCH');
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUser();
