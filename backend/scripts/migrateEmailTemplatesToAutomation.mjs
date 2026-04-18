import dotenv from 'dotenv';
import mongoose from 'mongoose';
import EmailTemplate from '../models/EmailTemplate.js';
import EmailAutomationTemplate from '../models/EmailAutomationTemplate.js';
import User from '../models/User.js';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MISSING_MONGODB_URI');
  process.exit(2);
}

const mapCategory = (legacyCategory) => {
  if (legacyCategory === 'onboarding') return 'onboarding';
  if (legacyCategory === 'custom') return 'custom';
  if (legacyCategory === 'system') return 'general';
  return 'custom';
};

const pickOwnerForWorkspace = (usersInWorkspace) => {
  const preferredRoles = ['admin', 'hr', 'team_lead', 'member', 'super_admin'];
  for (const role of preferredRoles) {
    const found = usersInWorkspace.find((u) => u.role === role);
    if (found) return found;
  }
  return usersInWorkspace[0] || null;
};

await mongoose.connect(uri);

const sourceTemplates = await EmailTemplate.find({ isActive: true }).lean();
if (!sourceTemplates.length) {
  console.log('SOURCE_TEMPLATE_COUNT=0');
  await mongoose.disconnect();
  process.exit(0);
}

const usersWithWorkspace = await User.find({})
  .select('_id workspaceId role full_name email')
  .lean();

const workspaceMap = new Map();
for (const user of usersWithWorkspace) {
  const workspaceRaw = user.workspaceId || user._id;
  const workspaceId = String(workspaceRaw);
  if (!workspaceMap.has(workspaceId)) workspaceMap.set(workspaceId, []);
  workspaceMap.get(workspaceId).push(user);
}

let inserted = 0;
let updated = 0;
let skipped = 0;
let workspaceCount = 0;

for (const [workspaceId, users] of workspaceMap.entries()) {
  const owner = pickOwnerForWorkspace(users);
  if (!owner) {
    skipped += sourceTemplates.length;
    continue;
  }

  workspaceCount += 1;

  for (const src of sourceTemplates) {
    const category = mapCategory(src.category);
    const variableNames = Array.isArray(src.variables)
      ? src.variables
          .map((v) => (typeof v === 'string' ? v : v?.name))
          .filter(Boolean)
      : [];

    const query = {
      workspace: new mongoose.Types.ObjectId(workspaceId),
      name: src.name,
    };

    const set = {
      userId: owner._id,
      subject: src.subject,
      body: src.htmlContent || '',
      category,
      variables: variableNames,
      isActive: true,
    };

    const existing = await EmailAutomationTemplate.findOne(query).lean();
    if (existing) {
      await EmailAutomationTemplate.updateOne({ _id: existing._id }, { $set: set });
      updated += 1;
    } else {
      await EmailAutomationTemplate.create({
        workspace: query.workspace,
        name: src.name,
        ...set,
      });
      inserted += 1;
    }
  }
}

console.log(`WORKSPACE_COUNT=${workspaceCount}`);
console.log(`SOURCE_TEMPLATE_COUNT=${sourceTemplates.length}`);
console.log(`INSERTED=${inserted}`);
console.log(`UPDATED=${updated}`);
console.log(`SKIPPED=${skipped}`);

await mongoose.disconnect();
