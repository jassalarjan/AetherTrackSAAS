import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Team from '../models/Team.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('🔧 Starting Admin User Cleanup Migration...\n');

async function run() {
  try {
    await connectDB();

    console.log('📊 Checking admin users with team assignments...\n');

    // Find all admin users with team assignments
    const adminUsersWithTeams = await User.find({
      role: 'admin',
      team_id: { $ne: null, $exists: true }
    });

    if (adminUsersWithTeams.length === 0) {
      console.log('✅ No admin users found with team assignments. Database is clean!\n');
      process.exit(0);
    }

    console.log(`⚠️  Found ${adminUsersWithTeams.length} admin user(s) with team assignments:\n`);
    
    adminUsersWithTeams.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name} (${user.email})`);
      console.log(`   Team ID: ${user.team_id}\n`);
    });

    // Update all admin users to remove team assignments
    const result = await User.updateMany(
      { role: 'admin', team_id: { $ne: null } },
      { $set: { team_id: null, updated_at: new Date() } }
    );

    console.log(`✅ Successfully cleaned up ${result.modifiedCount} admin user(s)\n`);

    // Also check for teams named "Admin" (case-insensitive)
    console.log('📊 Checking for teams named "Admin"...\n');
    
    const adminTeams = await Team.find({
      name: { $regex: /^admin$/i }
    });

    if (adminTeams.length > 0) {
      console.log(`⚠️  Found ${adminTeams.length} team(s) with reserved name "Admin":\n`);
      adminTeams.forEach((team, index) => {
        console.log(`${index + 1}. Team: ${team.name} (ID: ${team._id})`);
      });
      console.log('\n⚠️  NOTE: Please rename these teams manually as they use a reserved name.\n');
    } else {
      console.log('✅ No teams with reserved "Admin" name found.\n');
    }

    console.log('🎉 Migration completed successfully!\n');
    console.log('Summary:');
    console.log(`  - Admin users cleaned: ${result.modifiedCount}`);
    console.log(`  - Reserved team names found: ${adminTeams.length}`);
    console.log('\n📚 See ADMIN_POLICY.md for more details on admin user policies.\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

run();
