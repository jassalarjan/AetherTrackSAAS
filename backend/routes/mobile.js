/**
 * backend/routes/mobile.js
 *
 * Endpoints consumed by the Capacitor Android app:
 *   POST /api/notifications/register-device  — register FCM token
 *   DELETE /api/notifications/device/:deviceId — unregister on logout
 *   POST /api/notifications/send              — send push (admin/server internal)
 *   GET  /api/mobile/latest-bundle            — OTA update check
 */
const express = require('express');
const router  = express.Router();
const admin   = require('firebase-admin');

/* ── Firebase Admin init (idempotent) ───────────────────────────────────── */
let firebaseInitialised = false;

function getFirebaseAdmin() {
  if (!firebaseInitialised) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
    firebaseInitialised = true;
  }
  return admin;
}

/* ── In-memory device store (replace with MongoDB model in production) ──── */
// Use a DeviceToken model: { userId, fcmToken, platform, deviceId, updatedAt }
const DeviceToken = require('../models/DeviceToken');

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/notifications/register-device
   Body: { userId, fcmToken, platform, deviceId }
───────────────────────────────────────────────────────────────────────── */
router.post('/notifications/register-device', async (req, res) => {
  try {
    const { userId, fcmToken, platform = 'android', deviceId } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({ error: 'userId and fcmToken are required' });
    }

    await DeviceToken.findOneAndUpdate(
      { deviceId },
      { userId, fcmToken, platform, deviceId, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[Mobile] register-device error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   DELETE /api/notifications/device/:deviceId
───────────────────────────────────────────────────────────────────────── */
router.delete('/notifications/device/:deviceId', async (req, res) => {
  try {
    await DeviceToken.deleteOne({ deviceId: req.params.deviceId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/notifications/send
   Body: { userIds?, topic?, title, body, data, deepLink? }
   - If userIds provided: fan-out to all registered devices for those users
   - If topic provided:   FCM topic message (e.g. 'all-users')
───────────────────────────────────────────────────────────────────────── */
router.post('/notifications/send', async (req, res) => {
  try {
    const { userIds, topic, title, body, data = {}, deepLink } = req.body;
    const firebase = getFirebaseAdmin();
    const messaging = firebase.messaging();

    const payload = {
      notification: { title, body },
      data: {
        ...data,
        ...(deepLink ? { deepLink } : {}),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'aethertrack_default',
          color:     '#D4905A',
          sound:     'default',
        },
      },
    };

    if (topic) {
      const result = await messaging.send({ ...payload, topic });
      return res.json({ success: true, messageId: result });
    }

    if (userIds && userIds.length > 0) {
      // Fetch FCM tokens for users
      const tokens = await DeviceToken.find(
        { userId: { $in: userIds }, platform: 'android' },
        'fcmToken'
      ).lean();

      if (!tokens.length) return res.json({ success: true, sent: 0 });

      const tokenStrings = tokens.map(t => t.fcmToken);

      // Batch into groups of 500 (FCM limit)
      const BATCH_SIZE = 500;
      const batches = [];
      for (let i = 0; i < tokenStrings.length; i += BATCH_SIZE) {
        batches.push(tokenStrings.slice(i, i + BATCH_SIZE));
      }

      let successCount = 0, failureCount = 0;
      for (const batch of batches) {
        const response = await messaging.sendEachForMulticast({ ...payload, tokens: batch });
        successCount += response.successCount;
        failureCount += response.failureCount;

        // Remove invalid tokens
        response.responses.forEach((r, i) => {
          if (!r.success && (
            r.error?.code === 'messaging/invalid-registration-token' ||
            r.error?.code === 'messaging/registration-token-not-registered'
          )) {
            DeviceToken.deleteOne({ fcmToken: batch[i] }).catch(() => {});
          }
        });
      }

      return res.json({ success: true, sent: successCount, failed: failureCount });
    }

    res.status(400).json({ error: 'Provide userIds or topic' });
  } catch (err) {
    console.error('[Mobile] send-notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/mobile/latest-bundle
   Returns the latest OTA bundle info for the requesting app version.
   Header: X-App-Version: 1.0.0
───────────────────────────────────────────────────────────────────────── */
router.get('/mobile/latest-bundle', async (req, res) => {
  try {
    const appVersion = req.headers['x-app-version'] || '1.0.0';

    // ── Option A: Self-hosted ──────────────────────────────────────────────
    // Store bundle metadata in DB or a bundles.json file.
    // Replace this with real DB lookup in production.
    const latestBundle = {
      version:  process.env.LATEST_BUNDLE_VERSION || '1.0.0',
      url:      process.env.LATEST_BUNDLE_URL     || null,   // CDN URL to the zip
      checksum: process.env.LATEST_BUNDLE_CHECKSUM || null,  // SHA-256
    };

    if (!latestBundle.url) {
      return res.json({ version: null });  // No update available
    }

    // Only send update if server version is newer than client version
    if (isNewerVersion(latestBundle.version, appVersion)) {
      return res.json(latestBundle);
    }

    res.json({ version: null });
  } catch (err) {
    console.error('[Mobile] latest-bundle error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function isNewerVersion(serverVersion, clientVersion) {
  const parse = v => v.split('.').map(Number);
  const s = parse(serverVersion);
  const c = parse(clientVersion);
  for (let i = 0; i < 3; i++) {
    if ((s[i] || 0) > (c[i] || 0)) return true;
    if ((s[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

module.exports = router;
