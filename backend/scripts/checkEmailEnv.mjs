import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const keys = ['BREVO_API_KEY', 'BREVO_LOGIN_EMAIL', 'EMAIL_FROM', 'EMAIL_FROM_NAME'];
console.log(`KEY_COUNT=${keys.length}`);
let idx = 0;
for (const key of keys) {
  idx += 1;
  const val = process.env[key];
  console.log(`${idx}:${key}=${val && String(val).trim() ? 'SET' : 'MISSING'}`);
}
