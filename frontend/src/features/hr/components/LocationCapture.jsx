/**
 * LocationCapture.jsx
 * 
 * GPS location capture component for attendance verification.
 * Uses browser Geolocation API to capture current position.
 * 
 * Features:
 * - GPS location capture with accuracy indicator
 * - Loading state while getting location
 * - Permission denied error handling
 * - Timeout handling (default 30 seconds)
 * - Display coordinates and accuracy
 * 
 * Props:
 * - onLocationCapture: Callback when location is captured
 * - onError: Callback for error handling
 * - requiredAccuracy: Maximum acceptable accuracy in meters
 * - timeout: Timeout in milliseconds (default 30000)
 * - disabled: Whether capture is disabled
 */

import { useState, useCallback } from 'react';
import { MapPin, Navigation, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

const LocationCapture = ({
  onLocationCapture,
  onError,
  requiredAccuracy = 100,
  timeout = 30000,
  disabled = false
}) => {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const geoError = 'Geolocation is not supported by this browser';
      setError(geoError);
      if (onError) onError(geoError);
      return;
    }

    setIsLoading(true);
    setError(null);

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: timeout,
      maximumAge: 0 // Always get fresh location
    };

    const handleSuccess = (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const timestamp = position.timestamp;

      const locationData = {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date(timestamp).toISOString(),
        meetsAccuracyThreshold: accuracy <= requiredAccuracy
      };

      setLocation(locationData);
      setIsLoading(false);

      if (onLocationCapture) {
        onLocationCapture(locationData);
      }
    };

    const handleError = (err) => {
      let errorMessage = 'Failed to get location';
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'Location permission denied. Please allow location access to verify your attendance.';
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable. Please check your device settings.';
          break;
        case err.TIMEOUT:
          errorMessage = `Location request timed out after ${timeout / 1000} seconds. Please try again.`;
          break;
        default:
          errorMessage = 'An unknown error occurred while getting your location.';
      }

      setError(errorMessage);
      setIsLoading(false);
      
      if (onError) {
        onError(errorMessage, err.code);
      }
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);
  }, [onLocationCapture, onError, requiredAccuracy, timeout]);

  const retryLocation = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setLocation(null);
    setError(null);
    getLocation();
  }, [getLocation]);

  const isAccuracyGood = location?.accuracy <= requiredAccuracy;
  const isAccuracyAcceptable = location?.accuracy <= requiredAccuracy * 2;

  const formatCoordinate = (value, isLatitude) => {
    const absolute = Math.abs(value);
    const degrees = Math.floor(absolute);
    const minutesDecimal = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = ((minutesDecimal - minutes) * 60).toFixed(1);
    
    const direction = isLatitude
      ? (value >= 0 ? 'N' : 'S')
      : (value >= 0 ? 'E' : 'W');
    
    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
  };

  const getAccuracyColor = () => {
    if (!location) return 'text-gray-400';
    if (isAccuracyGood) return 'text-green-500';
    if (isAccuracyAcceptable) return 'text-amber-500';
    return 'text-red-500';
  };

  const getAccuracyLabel = () => {
    if (!location) return '';
    if (isAccuracyGood) return 'Excellent';
    if (isAccuracyAcceptable) return 'Acceptable';
    return 'Poor';
  };

  if (disabled && !location) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
        <MapPin className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Location capture is disabled
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin size={20} className="text-[#C4713A]" />
          GPS Location
        </h3>
        {location && (
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            isAccuracyGood 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
          }`}>
            {isAccuracyGood ? <CheckCircle size={12} className="mr-1" /> : <AlertTriangle size={12} className="mr-1" />}
            {getAccuracyLabel()} Accuracy
          </span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={retryLocation}
                className="mt-2 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-12 w-12 text-[#C4713A] animate-spin mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Getting your location...</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            This may take up to {timeout / 1000} seconds
          </p>
        </div>
      )}

      {/* Location Display */}
      {!isLoading && location && (
        <div className="space-y-4">
          {/* Coordinates */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Latitude</p>
                <p className="font-mono text-sm text-gray-900 dark:text-white">
                  {formatCoordinate(location.latitude, true)}
                </p>
                <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {location.latitude.toFixed(6)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Longitude</p>
                <p className="font-mono text-sm text-gray-900 dark:text-white">
                  {formatCoordinate(location.longitude, false)}
                </p>
                <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {location.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>

          {/* Accuracy Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getAccuracyColor()} bg-current/10`}>
                <Navigation size={18} className={getAccuracyColor()} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Accuracy: {Math.round(location.accuracy)}m
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Required: ≤{requiredAccuracy}m
                </p>
              </div>
            </div>
            <button
              onClick={retryLocation}
              disabled={disabled}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {/* Accuracy Warning */}
          {!isAccuracyGood && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Accuracy is above the recommended threshold. For better results, try capturing your location 
                  near a window or outdoors for better GPS signal.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Capture Button */}
      {!location && !isLoading && (
        <div className="flex flex-col items-center py-6">
          <button
            onClick={getLocation}
            disabled={disabled}
            className="flex items-center gap-2 px-6 py-3 bg-[#C4713A] text-white rounded-lg font-medium hover:bg-[#A35C28] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MapPin size={16} />
            Get My Location
          </button>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            We'll capture your current GPS coordinates
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationCapture;
