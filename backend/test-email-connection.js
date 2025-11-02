import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('═══════════════════════════════════════════════════');
console.log('   EMAIL CONNECTION TEST');
console.log('═══════════════════════════════════════════════════\n');

// Display configuration (masking password)
console.log('📋 Current Configuration:');
console.log('   EMAIL_HOST:', process.env.EMAIL_HOST || '❌ NOT SET');
console.log('   EMAIL_PORT:', process.env.EMAIL_PORT || '❌ NOT SET');
console.log('   EMAIL_SECURE:', process.env.EMAIL_SECURE || '❌ NOT SET');
console.log('   EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('');

// Check if all required variables are set
if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error('❌ ERROR: Missing required email configuration!');
  console.error('   Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD in .env file\n');
  process.exit(1);
}

// Test different configurations
const configurations = [
  {
    name: 'Configuration 1: Port 587 (TLS/STARTTLS)',
    config: {
      host: process.env.EMAIL_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      }
    }
  },
  {
    name: 'Configuration 2: Port 465 (SSL)',
    config: {
      host: process.env.EMAIL_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      tls: {
        rejectUnauthorized: false
      }
    }
  },
  {
    name: 'Configuration 3: Port 587 with strict TLS',
    config: {
      host: process.env.EMAIL_HOST,
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000
    }
  }
];

async function testConnection(configObj) {
  console.log(`\n🧪 Testing: ${configObj.name}`);
  console.log('   Host:', configObj.config.host);
  console.log('   Port:', configObj.config.port);
  console.log('   Secure:', configObj.config.secure);
  console.log('');

  const transporter = nodemailer.createTransport(configObj.config);

  try {
    console.log('   ⏳ Verifying connection...');
    await transporter.verify();
    console.log('   ✅ SUCCESS! Connection verified successfully!\n');
    return true;
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    console.log('   Error Code:', error.code);
    if (error.code === 'ETIMEDOUT') {
      console.log('   💡 Tip: Connection timeout - Check firewall or try different port');
    } else if (error.code === 'EAUTH') {
      console.log('   💡 Tip: Authentication failed - Check email and app password');
    } else if (error.code === 'ECONNECTION') {
      console.log('   💡 Tip: Cannot connect - Check host and port settings');
    }
    console.log('');
    return false;
  }
}

async function testSendEmail(configObj, testEmail) {
  console.log(`\n📧 Attempting to send test email to: ${testEmail}`);
  
  const transporter = nodemailer.createTransport(configObj.config);

  const mailOptions = {
    from: {
      name: 'TaskFlow Test',
      address: process.env.EMAIL_USER
    },
    to: testEmail,
    subject: '✅ TaskFlow Email Test - SUCCESS',
    text: 'This is a test email from TaskFlow. If you received this, the email service is working correctly!',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4;">
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #667eea;">✅ TaskFlow Email Test</h2>
          <p>This is a test email from TaskFlow.</p>
          <p><strong>If you received this, the email service is working correctly!</strong></p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `
  };

  try {
    console.log('   ⏳ Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('   ✅ SUCCESS! Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    return true;
  } catch (error) {
    console.log('   ❌ FAILED to send email:', error.message);
    console.log('   Error Code:', error.code);
    return false;
  }
}

async function runTests() {
  console.log('🔍 Testing all configurations...\n');
  
  let successfulConfig = null;
  
  for (const config of configurations) {
    const success = await testConnection(config);
    if (success) {
      successfulConfig = config;
      break; // Stop at first successful configuration
    }
  }

  if (successfulConfig) {
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ SUCCESSFUL CONFIGURATION FOUND!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   ${successfulConfig.name}`);
    console.log(`   Port: ${successfulConfig.config.port}`);
    console.log(`   Secure: ${successfulConfig.config.secure}`);
    console.log('');
    
    // Ask if user wants to send test email
    console.log('💡 Recommendation for .env file:');
    console.log(`   EMAIL_PORT=${successfulConfig.config.port}`);
    console.log(`   EMAIL_SECURE=${successfulConfig.config.secure}`);
    console.log('');
    
    // Try to send a test email
    const testEmail = process.argv[2] || process.env.EMAIL_USER;
    console.log(`\n📬 Would you like to send a test email to ${testEmail}?`);
    console.log('   (Run with: node test-email-connection.js your-email@example.com)\n');
    
    if (process.argv[2]) {
      await testSendEmail(successfulConfig, testEmail);
    }
  } else {
    console.log('═══════════════════════════════════════════════════');
    console.log('❌ ALL CONFIGURATIONS FAILED');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('   1. Verify your Gmail App Password is correct');
    console.log('      → Go to: https://myaccount.google.com/apppasswords');
    console.log('   2. Check your firewall/antivirus settings');
    console.log('   3. Try from a different network');
    console.log('   4. Verify 2FA is enabled on your Gmail account');
    console.log('   5. Make sure "Less secure app access" is NOT required');
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('   TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
}

runTests().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
