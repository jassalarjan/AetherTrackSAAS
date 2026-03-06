/**
 * backend/models/DeviceToken.js
 *
 * Stores FCM device tokens for push notification delivery.
 */
const mongoose = require('mongoose');

const DeviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    fcmToken: {
      type:     String,
      required: true,
    },
    platform: {
      type:    String,
      enum:    ['android', 'ios', 'web'],
      default: 'android',
    },
    deviceId: {
      type:   String,
      unique: true,   // one token per physical device
      sparse: true,
    },
    appVersion: {
      type:    String,
      default: '1.0.0',
    },
    updatedAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for fast lookup by userId
DeviceTokenSchema.index({ userId: 1, platform: 1 });

// Auto-remove stale tokens (90 day TTL)
DeviceTokenSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('DeviceToken', DeviceTokenSchema);
