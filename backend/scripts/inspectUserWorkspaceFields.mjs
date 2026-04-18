import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

if (!process.env.MONGODB_URI) {
  console.log('MISSING_MONGODB_URI');
  process.exit(2);
}

await mongoose.connect(process.env.MONGODB_URI);

const users = await mongoose.connection.collection('users')
  .find({}, { projection: { email: 1, workspaceId: 1, workspace_id: 1 } })
  .limit(25)
  .toArray();

console.log(`USER_SAMPLE_COUNT=${users.length}`);
for (const u of users) {
  console.log(`${u.email || ''} | workspaceId=${u.workspaceId || ''} | workspace_id=${u.workspace_id || ''}`);
}

const countWorkspaceId = await mongoose.connection.collection('users').countDocuments({
  workspaceId: { $exists: true, $ne: null },
});
const countWorkspaceUnderscore = await mongoose.connection.collection('users').countDocuments({
  workspace_id: { $exists: true, $ne: null },
});

console.log(`COUNT_workspaceId=${countWorkspaceId}`);
console.log(`COUNT_workspace_id=${countWorkspaceUnderscore}`);

await mongoose.disconnect();
