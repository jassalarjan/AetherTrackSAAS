/**
 * PhotoCapture.jsx
 * 
 * Camera-only photo capture component for attendance verification.
 * Provides live video preview and captures photos as base64 for upload.
 * 
 * Features:
 * - Live camera preview
 * - Capture and retake functionality with maxRetakes limit
 * - Loading states and error handling
 * - No fallback to file upload (camera only)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

const PhotoCapture = ({
  onCapture,
  onError,
  maxRetakes = 3,
  disabled = false
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retakeCount, setRetakeCount] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Start camera on mount
  useEffect(() => {
    let mounted = true;
    
    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });

        if (mounted) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play();
              setIsCameraReady(true);
            };
          }
        }
      } catch (err) {
        if (mounted) {
          handleCameraError(err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    if (!capturedPhoto && !disabled) {
      startCamera();
    }

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [disabled, capturedPhoto]);

  const handleCameraError = (err) => {
    let errorMessage = 'Failed to access camera';
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errorMessage = 'Camera permission denied. Please allow camera access to capture your photo.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      errorMessage = 'No camera found. Please connect a camera and try again.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
    } else if (err.name === 'OverconstrainedError') {
      errorMessage = 'Camera does not meet the required constraints.';
    }

    setError(errorMessage);
    if (onError) {
      onError(errorMessage);
    }
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = photoDataUrl.split(',')[1];

    setCapturedPhoto(photoDataUrl);
    setIsCapturing(true);
    
    if (onCapture) {
      onCapture({
        dataUrl: photoDataUrl,
        base64,
        width: canvas.width,
        height: canvas.height,
        timestamp: new Date().toISOString()
      });
    }

    // Stop camera stream after capture
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [isCameraReady, onCapture, stream]);

  const retakePhoto = useCallback(() => {
    if (retakeCount >= maxRetakes) {
      const maxReachedError = `Maximum retakes (${maxRetakes}) reached. Please continue with the current photo or refresh the page to try again.`;
      setError(maxReachedError);
      if (onError) {
        onError(maxReachedError);
      }
      return;
    }

    setCapturedPhoto(null);
    setRetakeCount(prev => prev + 1);
    setIsCapturing(false);
    setError(null);
  }, [maxRetakes, retakeCount, onError]);

  const canRetake = retakeCount < maxRetakes;
  const retakesRemaining = maxRetakes - retakeCount;

  if (disabled && !capturedPhoto) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
        <Camera className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Photo capture is disabled
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Camera size={20} className="text-[#C4713A]" />
          Photo Verification
        </h3>
        {capturedPhoto && (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle size={12} className="mr-1" />
            Captured
          </span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-[#C4713A] animate-spin mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Accessing camera...</p>
        </div>
      )}

      {/* Video Preview / Captured Photo */}
      {!capturedPhoto && !isLoading && (
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isCameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
          
          {/* Camera overlay frame */}
          <div className="absolute inset-0 border-2 border-white/30 pointer-events-none">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full">
              <p className="text-white text-xs">Position your face in the frame</p>
            </div>
          </div>
        </div>
      )}

      {/* Captured Photo Preview */}
      {capturedPhoto && (
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
          <img
            src={capturedPhoto}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {capturedPhoto ? (
            <span>Retakes remaining: {retakesRemaining}</span>
          ) : isCameraReady ? (
            <span>Camera ready</span>
          ) : null}
        </div>

        <div className="flex gap-2">
          {capturedPhoto ? (
            canRetake && (
              <button
                onClick={retakePhoto}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} />
                Retake ({retakesRemaining} left)
              </button>
            )
          ) : (
            <button
              onClick={capturePhoto}
              disabled={!isCameraReady || isLoading || disabled}
              className="flex items-center gap-2 px-6 py-2 bg-[#C4713A] text-white rounded-lg font-medium hover:bg-[#A35C28] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera size={16} />
              {isCapturing ? 'Capturing...' : 'Capture Photo'}
            </button>
          )}
        </div>
      </div>

      {/* Max Retakes Warning */}
      {!capturedPhoto && retakeCount > 0 && retakesRemaining <= 1 && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Last retake remaining. After this, you cannot retake the photo.
        </p>
      )}
    </div>
  );
};

export default PhotoCapture;
