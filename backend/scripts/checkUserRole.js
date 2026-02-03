import mongoose from 'mongoose';
import User from '../models/User.js';
import Team from '../models/Team.js';
import dotenv from 'dotenv';

dotenv.config();

const checkUserRole = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/AetherFlow');
    console.log('✅ Connected to MongoDB\n');

    // Get all users with their roles
    const users = await User.find({}).select('full_name email role team_id').populate('team_id', 'name');

    if (users.length === 0) {
      console.log('❌ No users found in database');
      console.log('\n💡 Run "node scripts/seedAdmin.js" to create an admin user');
      process.exit(0);
    }

    console.log('📊 USER ROLES SUMMARY');
    console.log('='.repeat(80));
    
    // Count by role
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 Role Distribution:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      const emoji = {
        admin: '👑',
        hr: '👔',
        team_lead: '👨‍💼',
        member: '👤'
      }[role] || '❓';
      console.log(`  ${emoji} ${role.toUpperCase().padEnd(12)} : ${count} user${count > 1 ? 's' : ''}`);
    });

    console.log('\n👥 USER DETAILS:');
    console.log('-'.repeat(80));

    users.forEach((user, index) => {
      const emoji = {
        admin: '👑',
        hr: '👔',
        team_lead: '👨‍💼',
        member: '👤'
      }[user.role] || '❓';

      console.log(`\n${index + 1}. ${emoji} ${user.full_name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔐 Role: ${user.role.toUpperCase()}`);
      console.log(`   🏢 Team: ${user.team_id ? user.team_id.name : 'No team assigned'}`);
      console.log(`   🆔 ID: ${user._id}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Total Users:', users.length);
    
    // Check if there's at least one admin
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (adminCount === 0) {
      console.log('\n⚠️  WARNING: No admin users found!');
      console.log('💡 Run "node scripts/seedAdmin.js" to create an admin user');
    } else {
      console.log(`\n✅ Found ${adminCount} admin user${adminCount > 1 ? 's' : ''}`);
    }

    // Provide login suggestions
    const adminUsers = users.filter(u => u.role === 'admin');
    if (adminUsers.length > 0) {
      console.log('\n🔑 LOGIN CREDENTIALS:');
      console.log('-'.repeat(80));
      console.log('Use one of these admin accounts to access all features:');
      adminUsers.forEach(admin => {
        console.log(`\n  👑 ${admin.full_name}`);
        console.log(`     📧 Email: ${admin.email}`);
        console.log(`     🔑 Password: (check your setup notes or run seedAdmin.js)`);
      });
    }

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkUserRole();
