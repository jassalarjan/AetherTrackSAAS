import { cloudinary } from './config/cloudinary.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing Cloudinary Configuration...\n');

// Check if credentials are set
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('📋 Credentials Check:');
console.log(`   Cloud Name: ${cloudName ? '✅ Set' : '❌ Missing'}`);
console.log(`   API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
console.log(`   API Secret: ${apiSecret ? '✅ Set' : '❌ Missing'}`);

if (!cloudName || !apiKey || !apiSecret) {
  console.log('\n❌ Error: Cloudinary credentials are not properly configured.');
  console.log('   Please update your backend/.env file with valid credentials.');
  console.log('   Get them from: https://cloudinary.com/console\n');
  process.exit(1);
}

if (cloudName === 'your_cloud_name_here' || 
    apiKey === 'your_api_key_here' || 
    apiSecret === 'your_api_secret_here') {
  console.log('\n⚠️  Warning: You are using placeholder credentials.');
  console.log('   Please replace them with your actual Cloudinary credentials.');
  console.log('   Get them from: https://cloudinary.com/console\n');
  process.exit(1);
}

// Test connection by pinging Cloudinary API
console.log('\n🔌 Testing Connection...');

try {
  const result = await cloudinary.api.ping();
  console.log('✅ Connection successful!');
  console.log(`   Status: ${result.status}\n`);
  
  // Get usage stats
  console.log('📊 Account Usage:');
  const usage = await cloudinary.api.usage();
  console.log(`   Plan: ${usage.plan || 'Free'}`);
  console.log(`   Credits Used: ${usage.credits?.used || 0} / ${usage.credits?.limit || 'N/A'}`);
  console.log(`   Bandwidth: ${((usage.bandwidth?.usage || 0) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Storage: ${((usage.storage?.usage || 0) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Resources: ${usage.resources || 0} files\n`);
  
  console.log('✨ Cloudinary is configured correctly and ready to use!');
  console.log('   You can now upload documents through the Project Details page.\n');
  
} catch (error) {
  console.log('❌ Connection failed!');
  console.log(`   Error: ${error.message}\n`);
  
  if (error.http_code === 401) {
    console.log('   This usually means:');
    console.log('   - Wrong API Key or API Secret');
    console.log('   - Cloud Name doesn\'t match the credentials\n');
  }
  
  console.log('   Please verify your credentials at: https://cloudinary.com/console\n');
  process.exit(1);
}
