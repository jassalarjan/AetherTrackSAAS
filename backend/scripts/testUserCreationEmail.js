// Quick test script to create a user and trigger email
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { sendCredentialEmail } from '../utils/emailService.js';

dotenv.config();

const testUserCreationEmail = async () => {
  console.log('🧪 Testing User Creation Email Flow\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test data
    const testUser = {
      full_name: 'Test User Creation',
      email: process.env.EMAIL_USER, // Send to yourself
      password: 'TestPassword123!'
    };

    console.log('📧 Simulating user creation...');
    console.log('   Name:', testUser.full_name);
    console.log('   Email:', testUser.email);
    console.log('   Password:', testUser.password);
    console.log('');

    // Try to send email
    console.log('📤 Calling sendCredentialEmail function...');
    const emailResult = await sendCredentialEmail(
      testUser.full_name,
      testUser.email,
      testUser.password
    );

    console.log('');
    if (emailResult.success) {
      console.log('✅ SUCCESS! Email sent successfully!');
      console.log('   Message ID:', emailResult.messageId);
      console.log('');
      console.log('📬 Check your inbox at:', testUser.email);
    } else {
      console.log('❌ FAILED! Email was not sent');
      console.log('   Error:', emailResult.error);
      console.log('');
      console.log('Possible causes:');
      console.log('  1. Invalid email credentials');
      console.log('  2. Network/firewall blocking SMTP');
      console.log('  3. Email service configuration issue');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
};

testUserCreationEmail();
