import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import brevoService from './services/brevoEmailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🧪 Testing Email Send via Brevo...\n');

// Display configuration
console.log('📧 Brevo Configuration:');
console.log(`   API Key: ${process.env.BREVO_API_KEY ? '***' + process.env.BREVO_API_KEY.slice(-8) : 'NOT SET'}`);
console.log(`   Sender Email: ${process.env.EMAIL_USER || 'updates.codecatalyst@gmail.com'}`);
console.log(`   Email Host: ${process.env.EMAIL_HOST}`);
console.log(`   Email Port: ${process.env.EMAIL_PORT}`);
console.log(`   From Name: ${process.env.EMAIL_FROM_NAME || 'AetherTrack'}\n`);

const testEmail = {
  to: 'jassalarjansingh@gmail.com',
  subject: 'Test Email from AetherTrack',
  htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; padding: 30px; }
    .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px; }
    h1 { margin: 0; color: white; }
    p { line-height: 1.6; color: #333; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Test Email</h1>
    </div>
    <p>Hello,</p>
    <p>This is a test email from AetherTrack Email Center.</p>
    <p>If you're seeing this, the email system is working correctly!</p>
    <p>Time: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `,
  params: {},
  from: {
    email: process.env.EMAIL_USER || 'updates.codecatalyst@gmail.com',
    name: process.env.EMAIL_FROM_NAME || 'AetherTrack'
  },
  useLayout: false
};

console.log('📤 Sending test email...\n');

try {
  const result = await brevoService.send(testEmail);
  
  if (result.success) {
    console.log('✅ SUCCESS! Email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Provider: ${result.provider}`);
    console.log(`   Status: ${result.status}\n`);
  } else {
    console.log('❌ FAILED! Could not send email');
    console.error(`   Error: ${result.error}\n`);
    
    console.log('📝 Troubleshooting Steps:');
    console.log('   1. Verify BREVO_API_KEY is correct');
    console.log('   2. Check sender email is verified in Brevo dashboard');
    console.log('      Go to: https://app.brevo.com/senders');
    console.log('   3. Ensure you haven\'t exceeded daily limit (300 free emails/day)');
    console.log('   4. Check Brevo account status at: https://app.brevo.com/\n');
  }
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error(error);
}
