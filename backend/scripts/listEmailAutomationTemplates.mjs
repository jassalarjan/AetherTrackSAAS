import dotenv from 'dotenv';
import mongoose from 'mongoose';
import EmailAutomationTemplate from '../models/EmailAutomationTemplate.js';
import EmailTemplate from '../models/EmailTemplate.js';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.log('MISSING_MONGODB_URI');
  process.exit(2);
}

await mongoose.connect(uri);

const templates = await EmailAutomationTemplate.find({ isActive: true })
  .sort({ updatedAt: -1 })
  .lean();

console.log(`EMAIL_AUTOMATION_TEMPLATE_COUNT=${templates.length}`);
for (const t of templates) {
  const id = t?._id ? String(t._id) : '';
  const workspace = t?.workspace ? String(t.workspace) : '';
  const category = t?.category || '';
  const name = t?.name || '';
  const subject = (t?.subject || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  console.log(`${id} | ${workspace} | ${category} | ${name} | ${subject}`);
}

const predefined = await EmailTemplate.find({ isActive: true })
  .sort({ name: 1 })
  .lean();

console.log(`EMAIL_TEMPLATE_COUNT=${predefined.length}`);
for (const t of predefined) {
  const id = t?._id ? String(t._id) : '';
  const workspace = t?.workspaceId ? String(t.workspaceId) : 'global';
  const category = t?.category || '';
  const name = t?.name || '';
  const subject = (t?.subject || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  console.log(`${id} | ${workspace} | ${category} | ${name} | ${subject}`);
}

await mongoose.disconnect();
