import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { triggerOverdueReminders, triggerWeeklyReports } from './utils/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Test function
const testAutomation = async () => {
  console.log('🧪 Starting Automation Test...\n');

  // Connect to database
  await connectDB();

  const args = process.argv.slice(2);
  const testType = args[0] || 'both';

  try {
    switch (testType) {
      case 'reminders':
        console.log('📧 Testing Overdue Reminders...\n');
        await triggerOverdueReminders();
        break;
      
      case 'reports':
        console.log('📊 Testing Weekly Reports...\n');
        await triggerWeeklyReports();
        break;
      
      case 'both':
      default:
        console.log('📧 Testing Overdue Reminders...\n');
        await triggerOverdueReminders();
        console.log('\n─────────────────────────────────────\n');
        console.log('📊 Testing Weekly Reports...\n');
        await triggerWeeklyReports();
        break;
    }

    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
};

// Run test
testAutomation();
