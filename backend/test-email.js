import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendCredentialEmail } from './utils/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🧪 Testing Email Configuration...\n');

// Display current configuration (hide password)
console.log('📧 Email Settings:');
console.log(`   Host: ${process.env.EMAIL_HOST}`);
console.log(`   Port: ${process.env.EMAIL_PORT}`);
console.log(`   User: ${process.env.EMAIL_USER}`);
console.log(`   Password: ${process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-4) : 'NOT SET'}`);
console.log(`   Client URL: ${process.env.CLIENT_URL}\n`);

// Validate configuration
if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error('❌ ERROR: Email configuration is incomplete!');
  console.error('Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD in your .env file\n');
  process.exit(1);
}

// Test email details
const testEmail = process.env.EMAIL_USER; // Send to yourself
const testName = 'Test User';
const testPassword = 'Test@123456';

console.log(`📤 Sending test email to: ${testEmail}\n`);

// Send test email
const result = await sendCredentialEmail(testName, testEmail, testPassword);

if (result.success) {
  console.log('\n✅ SUCCESS! Test email sent successfully!');
  console.log(`📬 Message ID: ${result.messageId}`);
  console.log(`\n📥 Check your inbox at: ${testEmail}`);
  console.log('💡 Note: Check spam folder if you don\'t see it in inbox\n');
} else {
  console.log('\n❌ FAILED! Could not send test email');
  console.error(`Error: ${result.error}\n`);
  console.log('📝 Common Solutions:');
  console.log('   1. Gmail users: Use an App Password (not your regular password)');
  console.log('      Generate at: https://myaccount.google.com/apppasswords');
  console.log('   2. Check if EMAIL_HOST and EMAIL_PORT are correct');
  console.log('   3. Verify firewall/antivirus isn\'t blocking SMTP');
  console.log('   4. Ensure 2FA is enabled for Gmail\n');
}

process.exit(result.success ? 0 : 1);
