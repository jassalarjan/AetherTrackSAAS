import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔍 Diagnosing Brevo API Issues...\n');

// Check configuration
console.log('Configuration:');
console.log(`  API Key: ${process.env.BREVO_API_KEY ? '✅ Present (***' + process.env.BREVO_API_KEY.slice(-8) + ')' : '❌ Missing'}`);
console.log(`  Sender: ${process.env.EMAIL_USER || process.env.EMAIL_FROM}\n`);

// Test 1: Try to get account info via direct HTTPS call
console.log('Test 1: Testing Brevo API connection with direct HTTPS...');

const options = {
  hostname: 'api.brevo.com',
  port: 443,
  path: '/v3/account',
  method: 'GET',
  headers: {
    'api-key': process.env.BREVO_API_KEY,
    'Content-Type': 'application/json'
  },
  // Try with less strict SSL options
  rejectUnauthorized: true
};

const req = https.request(options, (res) => {
  console.log(`✅ Connected! Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      const account = JSON.parse(data);
      console.log('\n✅ Brevo API Key is VALID!');
      console.log(`   Account Email: ${account.email}`);
      console.log(`   Company: ${account.companyName || 'N/A'}`);
      console.log(`   Plan: ${JSON.stringify(account.plan)}`);
      
      console.log('\n📝 Next Steps:');
      console.log('   1. Verify arjanwebcraft@gmail.com as a sender at: https://app.brevo.com/senders');
      console.log('   2. The API key works - SSL issue may be with the Brevo SDK library\n');
    } else if (res.statusCode === 401) {
      console.log('\n❌ API Key is INVALID or EXPIRED!');
      console.log('   Get a new key from: https://app.brevo.com/settings/keys/api\n');
    } else {
      console.log('\n⚠️  Unexpected response:');
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.log('\n❌ Connection Failed!');
  console.log(`   Error: ${error.message}`);
  
  if (error.message.includes('EPROTO') || error.message.includes('SSL')) {
    console.log('\n🔧 SSL/TLS Issue Detected:');
    console.log('   This is a known issue with Node.js v24+ and OpenSSL 3.x');
    console.log('   Workaround: Use SMTP fallback (Gmail) instead of Brevo API');
    console.log('\n📝 Action Required:');
    console.log('   1. Generate Gmail App Password for arjanwebcraft@gmail.com');
    console.log('   2. Go to: https://myaccount.google.com/apppasswords');
    console.log('   3. Update EMAIL_PASSWORD in .env file');
    console.log('   4. System will automatically use SMTP when API fails\n');
  } else {
    console.log('\n📝 Possible Solutions:');
    console.log('   1. Check your internet connection');
    console.log('   2. Check if firewall is blocking api.brevo.com');
    console.log('   3. Try using SMTP instead (update EMAIL_PASSWORD in .env)\n');
  }
});

req.end();
