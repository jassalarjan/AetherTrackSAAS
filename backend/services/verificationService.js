/**
 * Verification Service
 * 
 * Enterprise-grade attendance verification service handling:
 * - Photo verification with Cloudinary integration
 * - GPS/Location verification with geofence validation
 * - Reuse detection for fraud prevention
 * - Combined verification workflow
 */

import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import VerificationSettings from '../models/VerificationSettings.js';
import Attendance from '../models/Attendance.js';
import GeofenceLocation from '../models/GeofenceLocation.js';
import AttendanceAudit from '../models/AttendanceAudit.js';

class VerificationService {
  /**
   * Get verification settings for a workspace
   * @param {string} workspaceId - Workspace ID
   * @returns {Promise<Object>} Verification settings
   */
  static async getSettings(workspaceId) {
    let settings = await VerificationSettings.findOne({ workspaceId });
    
    if (!settings) {
      // Create default settings if none exist
      settings = await VerificationSettings.create({
        workspaceId,
        photoVerification: {
          enabled: false,
          mandatory: false,
          allowRetake: true,
          maxRetakes: 3
        },
        gpsVerification: {
          enabled: false,
          mandatory: false,
          accuracyThresholdMeters: 100,
          requireFreshLocation: true,
          locationFreshnessSeconds: 300
        },
        security: {
          preventPhotoReuse: true,
          captureDeviceInfo: true,
          enforceServerTimestamp: true
        }
      });
    }
    
    return settings;
  }

  /**
   * Update verification settings for a workspace
   * @param {string} workspaceId - Workspace ID
   * @param {Object} settings - Settings to update
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated settings
   */
  static async updateSettings(workspaceId, settings, userId) {
    const existingSettings = await VerificationSettings.findOne({ workspaceId });
    
    if (existingSettings) {
      // Update existing settings
      if (settings.photoVerification) {
        existingSettings.photoVerification = {
          ...existingSettings.photoVerification.toObject(),
          ...settings.photoVerification
        };
      }
      if (settings.gpsVerification) {
        existingSettings.gpsVerification = {
          ...existingSettings.gpsVerification.toObject(),
          ...settings.gpsVerification
        };
      }
      if (settings.security) {
        existingSettings.security = {
          ...existingSettings.security.toObject(),
          ...settings.security
        };
      }
      
      existingSettings.updatedBy = userId;
      await existingSettings.save();
      
      return existingSettings;
    } else {
      // Create new settings
      const newSettings = await VerificationSettings.create({
        workspaceId,
        ...settings,
        createdBy: userId,
        updatedBy: userId
      });
      
      return newSettings;
    }
  }

  // ==================== PHOTO VERIFICATION ====================

  /**
   * Validate photo upload data
   * @param {string} photoData - Base64 encoded photo data
   * @param {string} workspaceId - Workspace ID
   * @returns {Object} Validation result
   */
  static validatePhoto(photoData, workspaceId) {
    const errors = [];
    
    if (!photoData) {
      errors.push('Photo data is required');
      return { valid: false, errors };
    }
    
    // Check if it's a valid base64 data URL
    const base64Pattern = /^data:image\/\w+;base64,/;
    if (!base64Pattern.test(photoData)) {
      errors.push('Invalid photo format. Expected base64 encoded image');
      return { valid: false, errors };
    }
    
    // Extract base64 content and check size (max 10MB)
    const base64Content = photoData.replace(base64Pattern, '');
    const sizeInBytes = (base64Content.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    if (sizeInMB > 10) {
      errors.push('Photo size exceeds 10MB limit');
      return { valid: false, errors };
    }
    
    return { valid: true, errors: [], sizeInMB };
  }

  /**
   * Calculate SHA256 hash for photo reuse detection
   * @param {string} base64Data - Base64 encoded photo data
   * @returns {string} SHA256 hash
   */
  static calculatePhotoHash(base64Data) {
    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
    
    // Create hash from the base64 content
    const hash = crypto
      .createHash('sha256')
      .update(base64Content)
      .digest('hex');
    
    return hash;
  }

  /**
   * Check if photo has been used before (reuse detection)
   * @param {string} photoHash - SHA256 hash of the photo
   * @param {string} workspaceId - Workspace ID
   * @returns {Promise<Object>} Reuse check result
   */
  static async checkPhotoReuse(photoHash, workspaceId) {
    const existingAttendance = await Attendance.findOne({
      workspaceId,
      'verification.photoHash': photoHash
    }).sort({ createdAt: -1 });
    
    if (existingAttendance) {
      return {
        reused: true,
        previousAttendance: {
          id: existingAttendance._id,
          userId: existingAttendance.userId,
          date: existingAttendance.date,
          checkIn: existingAttendance.checkIn
        }
      };
    }
    
    return { reused: false, previousAttendance: null };
  }

  /**
   * Upload photo to Cloudinary with transformations
   * @param {string} base64Data - Base64 encoded photo data
   * @param {string} userId - User ID
   * @param {string} workspaceId - Workspace ID
   * @returns {Promise<Object>} Upload result
   */
  static async uploadPhoto(base64Data, userId, workspaceId) {
    try {
      // Extract the base64 content
      const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Content, 'base64');
      
      // Generate public ID
      const timestamp = Date.now();
      const publicId = `attendance/${workspaceId}/${userId}/${timestamp}`;
      
      // Upload to Cloudinary with transformations
      const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Content}`, {
        public_id: publicId,
        folder: `aethertrack/${workspaceId}/attendance`,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      });
      
      return {
        success: true,
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      };
    } catch (error) {
      console.error('Error uploading photo to Cloudinary:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
  }

  /**
   * Delete photo from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} Deletion result
   */
  static async deletePhoto(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true
      });
      
      return {
        success: result.result === 'ok',
        result
      };
    } catch (error) {
      console.error('Error deleting photo from Cloudinary:', error);
      throw new Error(`Failed to delete photo: ${error.message}`);
    }
  }

  // ==================== GPS VERIFICATION ====================

  /**
   * Validate GPS data
   * @param {Object} gpsData - GPS data object
   * @param {string} workspaceId - Workspace ID
   * @returns {Object} Validation result
   */
  static async validateGPS(gpsData, workspaceId) {
    const errors = [];
    const warnings = [];
    
    // Get verification settings
    const settings = await this.getSettings(workspaceId);
    const gpsSettings = settings.gpsVerification;
    
    if (!gpsData) {
      if (gpsSettings.mandatory) {
        errors.push('GPS data is mandatory for this workspace');
      }
      return { valid: !gpsSettings.mandatory, errors, warnings, gpsData: null };
    }
    
    // Validate coordinates
    const { latitude, longitude, accuracy, timestamp } = gpsData;
    
    if (latitude === undefined || longitude === undefined) {
      errors.push('Latitude and longitude are required');
      return { valid: false, errors, warnings };
    }
    
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      errors.push('Latitude and longitude must be numbers');
      return { valid: false, errors, warnings };
    }
    
    if (latitude < -90 || latitude > 90) {
      errors.push('Latitude must be between -90 and 90');
    }
    
    if (longitude < -180 || longitude > 180) {
      errors.push('Longitude must be between -180 and 180');
    }
    
    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }
    
    // Check accuracy threshold
    const accuracyCheck = this.checkAccuracyThreshold(
      accuracy,
      gpsSettings.accuracyThresholdMeters
    );
    
    if (!accuracyCheck.valid) {
      if (gpsSettings.mandatory) {
        errors.push(accuracyCheck.error);
      } else {
        warnings.push(accuracyCheck.error);
      }
    }
    
    // Check location freshness
    if (gpsSettings.requireFreshLocation && timestamp) {
      const freshnessCheck = this.checkLocationFreshness(
        timestamp,
        gpsSettings.locationFreshnessSeconds
      );
      
      if (!freshnessCheck.valid) {
        if (gpsSettings.mandatory) {
          errors.push(freshnessCheck.error);
        } else {
          warnings.push(freshnessCheck.error);
        }
      }
    }
    
    // Validate against geofences if enabled
    const geofenceResult = await this.validateAgainstGeofences(
      latitude,
      longitude,
      workspaceId
    );
    
    if (!geofenceResult.valid) {
      if (gpsSettings.mandatory) {
        errors.push(geofenceResult.error);
      } else {
        warnings.push(geofenceResult.error);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      gpsData: {
        latitude,
        longitude,
        accuracy,
        timestamp,
        validated: true
      },
      geofenceMatch: geofenceResult
    };
  }

  /**
   * Check if GPS accuracy meets threshold
   * @param {number} accuracy - GPS accuracy in meters
   * @param {number} threshold - Required accuracy threshold in meters
   * @returns {Object} Accuracy check result
   */
  static checkAccuracyThreshold(accuracy, threshold) {
    if (accuracy === undefined || accuracy === null) {
      return {
        valid: false,
        error: 'GPS accuracy is not available'
      };
    }
    
    if (accuracy > threshold) {
      return {
        valid: false,
        error: `GPS accuracy (${accuracy}m) exceeds threshold (${threshold}m)`
      };
    }
    
    return { valid: true };
  }

  /**
   * Check if location timestamp is fresh enough
   * @param {string|Date} timestamp - Location timestamp
   * @param {number} maxAgeSeconds - Maximum age in seconds
   * @returns {Object} Freshness check result
   */
  static checkLocationFreshness(timestamp, maxAgeSeconds) {
    const locationTime = new Date(timestamp);
    const now = new Date();
    const ageSeconds = (now - locationTime) / 1000;
    
    if (ageSeconds > maxAgeSeconds) {
      return {
        valid: false,
        error: `Location is too old (${Math.round(ageSeconds)}s old, max ${maxAgeSeconds}s)`,
        ageSeconds
      };
    }
    
    return { valid: true, ageSeconds };
  }

  /**
   * Validate location against workspace geofences
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {string} workspaceId - Workspace ID
   * @returns {Object} Geofence validation result
   */
  static async validateAgainstGeofences(latitude, longitude, workspaceId) {
    // Get active geofences for the workspace
    const geofences = await GeofenceLocation.find({
      workspaceId,
      isActive: true
    });
    
    if (geofences.length === 0) {
      // No geofences configured - allow any location
      return {
        valid: true,
        message: 'No geofences configured - location allowed',
        matchedGeofence: null
      };
    }
    
    // Check if location is within any geofence
    for (const geofence of geofences) {
      const result = geofence.isWithinGeofence(longitude, latitude);
      
      if (result.within) {
        return {
          valid: true,
          message: `Location is within geofence: ${geofence.name}`,
          matchedGeofence: {
            id: geofence._id,
            name: geofence.name,
            distance: result.distance
          }
        };
      }
    }
    
    return {
      valid: false,
      error: 'Location is outside all configured geofences',
      matchedGeofence: null
    };
  }

  /**
   * Reverse geocode coordinates to get address (optional feature)
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Promise<string|null>} Address string or null
   */
  static async reverseGeocode(latitude, longitude) {
    // This would typically use a geocoding service like Google Maps, OpenStreetMap, etc.
    // For now, return null as it requires external API configuration
    // Example implementation would call an external geocoding API
    
    try {
      // Check if geocoding API is configured
      if (!process.env.GEOCODING_API_KEY) {
        return null;
      }
      
      // Implementation would go here for the specific geocoding service
      // For example, using Nominatim (OpenStreetMap):
      // const response = await fetch(
      //   `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      // );
      // const data = await response.json();
      // return data.display_name;
      
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // ==================== COMBINED VERIFICATION ====================

  /**
   * Get verification requirements for a user
   * @param {string} userId - User ID
   * @param {string} workspaceId - Workspace ID
   * @returns {Object} Verification requirements
   */
  static async getVerificationRequirements(userId, workspaceId) {
    const settings = await this.getSettings(workspaceId);
    
    return {
      photo: {
        required: settings.photoVerification?.enabled && settings.photoVerification?.mandatory,
        enabled: settings.photoVerification?.enabled || false,
        allowRetake: settings.photoVerification?.allowRetake,
        maxRetakes: settings.photoVerification?.maxRetakes
      },
      gps: {
        required: settings.gpsVerification?.enabled && settings.gpsVerification?.mandatory,
        enabled: settings.gpsVerification?.enabled || false,
        accuracyThreshold: settings.gpsVerification?.accuracyThresholdMeters,
        requireFreshLocation: settings.gpsVerification?.requireFreshLocation,
        locationFreshnessSeconds: settings.gpsVerification?.locationFreshnessSeconds
      },
      security: {
        preventPhotoReuse: settings.security?.preventPhotoReuse,
        captureDeviceInfo: settings.security?.captureDeviceInfo,
        enforceServerTimestamp: settings.security?.enforceServerTimestamp
      }
    };
  }

  /**
   * Full verification for check-in
   * @param {string} userId - User ID
   * @param {string} workspaceId - Workspace ID
   * @param {string} photoData - Base64 encoded photo
   * @param {Object} gpsData - GPS data object
   * @param {Object} deviceInfo - Device information
   * @returns {Promise<Object>} Verification result
   */
  static async verifyCheckIn(userId, workspaceId, photoData, gpsData, deviceInfo = {}) {
    const flags = [];
    const errors = [];
    const warnings = [];
    
    // Get verification settings
    const settings = await this.getSettings(workspaceId);
    const requirements = await this.getVerificationRequirements(userId, workspaceId);
    
    // Process photo verification
    let photoResult = null;
    if (photoData || requirements.photo.required) {
      // Validate photo data
      const photoValidation = this.validatePhoto(photoData, workspaceId);
      
      if (!photoValidation.valid) {
        if (requirements.photo.required) {
          errors.push(...photoValidation.errors.map(e => `Photo: ${e}`));
          flags.push('PHOTO_MANDATORY');
        }
      } else {
        // Calculate hash
        const photoHash = this.calculatePhotoHash(photoData);
        
        // Check for reuse if enabled
        if (requirements.security.preventPhotoReuse) {
          const reuseCheck = await this.checkPhotoReuse(photoHash, workspaceId);
          
          if (reuseCheck.reused) {
            flags.push('PHOTO_REUSE_DETECTED');
            warnings.push('Photo appears to have been used previously');
          }
        }
        
        // Upload photo to Cloudinary
        try {
          const uploadResult = await this.uploadPhoto(photoData, userId, workspaceId);
          
          photoResult = {
            hash: photoHash,
            publicId: uploadResult.publicId,
            url: uploadResult.url
          };
        } catch (uploadError) {
          errors.push(`Photo upload failed: ${uploadError.message}`);
        }
      }
    }
    
    // Process GPS verification
    let gpsResult = null;
    if (gpsData || requirements.gps.required) {
      const gpsValidation = await this.validateGPS(gpsData, workspaceId);
      
      if (!gpsValidation.valid) {
        if (requirements.gps.required) {
          errors.push(...gpsValidation.errors.map(e => `GPS: ${e}`));
          flags.push('GPS_MANDATORY');
        } else {
          warnings.push(...gpsValidation.warnings.map(e => `GPS: ${e}`));
        }
      } else {
        gpsResult = gpsValidation.gpsData;
        
        if (gpsValidation.geofenceMatch && !gpsValidation.geofenceMatch.valid) {
          flags.push('LOCATION_OUTSIDE_GEOFENCE');
        }
      }
    }
    
    // Check for GPS inaccuracy flag
    if (gpsData && gpsData.accuracy > requirements.gps.accuracyThreshold) {
      flags.push('GPS_INACCURATE');
    }
    
    // Determine overall verification status
    const isVerified = errors.length === 0;
    const verificationStatus = isVerified ? 'auto_approved' : 'pending';
    
    return {
      success: isVerified,
      status: verificationStatus,
      flags,
      errors,
      warnings,
      data: {
        photo: photoResult,
        gps: gpsResult,
        deviceInfo: requirements.security.captureDeviceInfo ? deviceInfo : null,
        serverTimestamp: requirements.security.enforceServerTimestamp ? new Date() : null
      },
      requirements
    };
  }
}

export default VerificationService;
