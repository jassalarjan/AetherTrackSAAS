#!/usr/bin/env node
/**
 * scripts/sign-apk.js
 *
 * Aligns and signs the release APK using zipalign + apksigner.
 * Run after: cd android && ./gradlew assembleRelease
 *
 * Env vars required (also in .env.android):
 *   KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD
 *   ANDROID_BUILD_TOOLS_VERSION  (default: 34.0.0)
 */
const { execSync } = require('child_process');
const path         = require('path');
const fs           = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.android') });

// ─── Paths ────────────────────────────────────────────────────────────────
const ANDROID_HOME       = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const BUILD_TOOLS_VER    = process.env.ANDROID_BUILD_TOOLS_VERSION || '34.0.0';
const BUILD_TOOLS_DIR    = path.join(ANDROID_HOME, 'build-tools', BUILD_TOOLS_VER);

const UNSIGNED_APK       = path.resolve(__dirname, '../android/app/build/outputs/apk/release/app-release-unsigned.apk');
const ALIGNED_APK        = path.resolve(__dirname, '../android/app/build/outputs/apk/release/app-release-aligned.apk');
const SIGNED_APK         = path.resolve(__dirname, '../android/app/build/outputs/apk/release/app-release-signed.apk');

const KEYSTORE_PATH      = path.resolve(process.env.KEYSTORE_PATH || 'android/aethertrack.keystore');
const KEYSTORE_PASSWORD  = process.env.KEYSTORE_PASSWORD;
const KEY_ALIAS          = process.env.KEY_ALIAS          || 'aethertrack';
const KEY_PASSWORD       = process.env.KEY_PASSWORD;

// ─── Validate ─────────────────────────────────────────────────────────────
if (!ANDROID_HOME)      die('ANDROID_HOME is not set');
if (!KEYSTORE_PASSWORD) die('KEYSTORE_PASSWORD is not set');
if (!KEY_PASSWORD)      die('KEY_PASSWORD is not set');
if (!fs.existsSync(UNSIGNED_APK)) die(`Unsigned APK not found: ${UNSIGNED_APK}\nRun: cd android && ./gradlew assembleRelease`);
if (!fs.existsSync(KEYSTORE_PATH)) die(`Keystore not found: ${KEYSTORE_PATH}`);

// ─── Step 1: Zipalign ──────────────────────────────────────────────────────
console.log('→ Zipaligning...');
run(`"${path.join(BUILD_TOOLS_DIR, 'zipalign')}" -v -p 4 "${UNSIGNED_APK}" "${ALIGNED_APK}"`);

// ─── Step 2: Sign ──────────────────────────────────────────────────────────
console.log('→ Signing...');
run(
  `"${path.join(BUILD_TOOLS_DIR, 'apksigner')}" sign ` +
  `--ks "${KEYSTORE_PATH}" ` +
  `--ks-pass pass:${KEYSTORE_PASSWORD} ` +
  `--key-pass pass:${KEY_PASSWORD} ` +
  `--ks-key-alias ${KEY_ALIAS} ` +
  `--out "${SIGNED_APK}" ` +
  `"${ALIGNED_APK}"`
);

// ─── Step 3: Verify ────────────────────────────────────────────────────────
console.log('→ Verifying...');
run(`"${path.join(BUILD_TOOLS_DIR, 'apksigner')}" verify --verbose "${SIGNED_APK}"`);

// ─── Cleanup ───────────────────────────────────────────────────────────────
fs.unlinkSync(ALIGNED_APK);

const stats = fs.statSync(SIGNED_APK);
console.log(`\n✓ Signed APK ready: ${SIGNED_APK}`);
console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

// ─── Helpers ──────────────────────────────────────────────────────────────
function run(cmd) {
  try { execSync(cmd, { stdio: 'inherit' }); }
  catch (err) { die(`Command failed: ${cmd}\n${err.message}`); }
}

function die(msg) { console.error('\n✗', msg); process.exit(1); }
