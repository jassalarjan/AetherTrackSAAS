/**
 * useVerification.js
 * 
 * Custom hook for managing attendance verification settings and requirements.
 * Provides functions to check verification requirements and get settings.
 * 
 * Features:
 * - Fetch verification settings on mount
 * - Check if photo is required
 * - Check if GPS is required
 * - Get accuracy threshold
 * - Check if geofencing is enabled
 * - Handle loading and error states
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/shared/services/axios';

const BASE_URL = '/hr/attendance';

export default function useVerification() {
  // State
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch verification settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  /**
   * Fetch verification settings from the backend
   */
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to fetch settings - may fail if user doesn't have permission
      // or if no settings exist yet
      const response = await api.get(`${BASE_URL}/verification-settings`);
      setSettings(response.data.settings);
      return response.data.settings;
    } catch (err) {
      // If 403/404, use default settings
      if (err.response?.status === 403 || err.response?.status === 404) {
        const defaultSettings = getDefaultSettings();
        setSettings(defaultSettings);
        return defaultSettings;
      }
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load verification settings';
      setError(errorMessage);
      
      // Return default settings on error
      const defaultSettings = getDefaultSettings();
      setSettings(defaultSettings);
      return defaultSettings;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get default verification settings
   */
  const getDefaultSettings = () => ({
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

  /**
   * Check if photo verification is required
   */
  const isPhotoRequired = useCallback(() => {
    if (!settings) return false;
    return settings.photoVerification?.enabled && settings.photoVerification?.mandatory;
  }, [settings]);

  /**
   * Check if photo verification is enabled (optional)
   */
  const isPhotoEnabled = useCallback(() => {
    if (!settings) return false;
    return settings.photoVerification?.enabled === true;
  }, [settings]);

  /**
   * Check if GPS verification is required
   */
  const isGPSRequired = useCallback(() => {
    if (!settings) return false;
    return settings.gpsVerification?.enabled && settings.gpsVerification?.mandatory;
  }, [settings]);

  /**
   * Check if GPS verification is enabled (optional)
   */
  const isGPSEnabled = useCallback(() => {
    if (!settings) return false;
    return settings.gpsVerification?.enabled === true;
  }, [settings]);

  /**
   * Get the GPS accuracy threshold in meters
   */
  const getAccuracyThreshold = useCallback(() => {
    if (!settings) return 100;
    return settings.gpsVerification?.accuracyThresholdMeters || 100;
  }, [settings]);

  /**
   * Check if geofencing is enabled
   */
  const isGeofencingEnabled = useCallback(() => {
    if (!settings) return false;
    // Geofencing is enabled when GPS verification is enabled
    return settings.gpsVerification?.enabled === true;
  }, [settings]);

  /**
   * Get max retakes allowed for photo
   */
  const getMaxRetakes = useCallback(() => {
    if (!settings) return 3;
    return settings.photoVerification?.maxRetakes || 3;
  }, [settings]);

  /**
   * Check if retakes are allowed
   */
  const isRetakeAllowed = useCallback(() => {
    if (!settings) return true;
    return settings.photoVerification?.allowRetake !== false;
  }, [settings]);

  /**
   * Get all verification requirements
   */
  const getRequirements = useCallback(() => {
    if (!settings) {
      return {
        photoRequired: false,
        photoEnabled: false,
        gpsRequired: false,
        gpsEnabled: false,
        accuracyThreshold: 100,
        maxRetakes: 3,
        retakeAllowed: true,
        geofencingEnabled: false
      };
    }

    return {
      photoRequired: isPhotoRequired(),
      photoEnabled: isPhotoEnabled(),
      gpsRequired: isGPSRequired(),
      gpsEnabled: isGPSEnabled(),
      accuracyThreshold: getAccuracyThreshold(),
      maxRetakes: getMaxRetakes(),
      retakeAllowed: isRetakeAllowed(),
      geofencingEnabled: isGeofencingEnabled()
    };
  }, [settings, isPhotoRequired, isPhotoEnabled, isGPSRequired, isGPSEnabled, getAccuracyThreshold, getMaxRetakes, isRetakeAllowed, isGeofencingEnabled]);

  /**
   * Check if all mandatory verifications are complete
   */
  const isVerificationComplete = useCallback((verificationData) => {
    const requirements = getRequirements();
    
    if (requirements.photoRequired && !verificationData?.photo) {
      return false;
    }
    
    if (requirements.gpsRequired && !verificationData?.location) {
      return false;
    }
    
    if (requirements.gpsRequired && verificationData?.location) {
      const meetsAccuracy = verificationData.location.accuracy <= requirements.accuracyThreshold;
      if (!meetsAccuracy) {
        return false;
      }
    }
    
    return true;
  }, [getRequirements]);

  /**
   * Get error message for missing verifications
   */
  const getVerificationError = useCallback((verificationData) => {
    const requirements = getRequirements();
    
    if (requirements.photoRequired && !verificationData?.photo) {
      return 'Photo verification is required for check-in';
    }
    
    if (requirements.gpsRequired && !verificationData?.location) {
      return 'GPS location verification is required for check-in';
    }
    
    if (requirements.gpsRequired && verificationData?.location) {
      const meetsAccuracy = verificationData.location.accuracy <= requirements.accuracyThreshold;
      if (!meetsAccuracy) {
        return `GPS accuracy (${Math.round(verificationData.location.accuracy)}m) does not meet the required threshold (${requirements.accuracyThreshold}m)`;
      }
    }
    
    return null;
  }, [getRequirements]);

  return {
    // State
    settings,
    loading,
    error,
    
    // Actions
    fetchSettings,
    
    // Helpers
    isPhotoRequired,
    isPhotoEnabled,
    isGPSRequired,
    isGPSEnabled,
    getAccuracyThreshold,
    isGeofencingEnabled,
    getMaxRetakes,
    isRetakeAllowed,
    getRequirements,
    isVerificationComplete,
    getVerificationError
  };
}
