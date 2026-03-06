#!/usr/bin/env node
/**
 * scripts/generate-keystore.js
 *
 * Generates a new Android release keystore (runs keytool from JDK).
 * Run ONCE before first release build. Store the .keystore file securely
 * and NEVER commit it to version control.
 *
 * Usage:  node scripts/generate-keystore.js
 */
const { execSync } = require('child_process');
const path         = require('path');
const readline     = require('readline');
const fs           = require('fs');

const KEYSTORE_PATH = path.resolve(__dirname, '../android/aethertrack.keystore');

if (fs.existsSync(KEYSTORE_PATH)) {
  console.error('Keystore already exists at', KEYSTORE_PATH);
  console.error('Delete it first if you want to regenerate (this will invalidate existing installs).');
  process.exit(1);
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
}

(async () => {
  console.log('\nAetherTrack — Android Keystore Generator\n');

  const ksPass  = await prompt('Keystore password (min 6 chars): ');
  const keyPass = await prompt('Key password (min 6 chars):      ');
  const cn      = await prompt('Your name (CN):                   ') || 'AetherTrack';
  const org     = await prompt('Organization (O):                 ') || 'AetherTrack Inc';
  const country = await prompt('Country code (C) e.g. US:         ') || 'US';

  const dname = `CN=${cn}, O=${org}, C=${country}`;

  const cmd = [
    'keytool -genkeypair',
    '-v',
    '-keystore', `"${KEYSTORE_PATH}"`,
    '-alias', 'aethertrack',
    '-keyalg', 'RSA',
    '-keysize', '2048',
    '-validity', '10000',
    `-storepass`, ksPass,
    `-keypass`,   keyPass,
    `-dname`, `"${dname}"`,
  ].join(' ');

  console.log('\nGenerating keystore...');
  execSync(cmd, { stdio: 'inherit' });

  console.log(`\n✓ Keystore created: ${KEYSTORE_PATH}`);
  console.log('\nAdd these to your .env.android (DO NOT commit this file):');
  console.log(`  KEYSTORE_PATH=android/aethertrack.keystore`);
  console.log(`  KEYSTORE_PASSWORD=${ksPass}`);
  console.log(`  KEY_ALIAS=aethertrack`);
  console.log(`  KEY_PASSWORD=${keyPass}`);
  console.log('\nBackup the keystore file somewhere safe.\n');
})();
