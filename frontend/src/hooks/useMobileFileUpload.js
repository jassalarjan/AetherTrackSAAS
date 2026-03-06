/**
 * useMobileFileUpload.js
 *
 * Unified file upload hook that uses:
 *   - Native camera + photo library on Capacitor
 *   - Standard <input type="file"> on web
 *
 * Returns a `pickAndUpload` function that resolves with the server URL.
 */
import { useCallback }  from 'react';
import { Capacitor }    from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

/**
 * @param {object} options
 * @param {string} options.uploadUrl        - Backend endpoint  e.g. '/api/upload'
 * @param {string} [options.authToken]      - Bearer token
 * @param {string} [options.fieldName='file']
 * @param {object} [options.extraFields]    - Additional form fields
 */
export function useMobileFileUpload({ uploadUrl, authToken, fieldName = 'file', extraFields = {} } = {}) {

  const pickAndUpload = useCallback(async (source = 'PHOTOS') => {
    if (isNative) {
      return pickNative(source, { uploadUrl, authToken, fieldName, extraFields });
    } else {
      return pickWeb({ uploadUrl, authToken, fieldName, extraFields });
    }
  }, [uploadUrl, authToken, fieldName, extraFields]);

  return { pickAndUpload };
}

// ─── Native (Capacitor Camera plugin) ────────────────────────────────────
async function pickNative(source, { uploadUrl, authToken, fieldName, extraFields }) {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

  const photo = await Camera.getPhoto({
    quality:      90,
    allowEditing: false,
    resultType:   CameraResultType.Base64,
    source:       source === 'CAMERA' ? CameraSource.Camera : CameraSource.Photos,
    saveToGallery: false,
  });

  // Convert base64 → Blob
  const byteChars = atob(photo.base64String);
  const bytes     = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: `image/${photo.format}` });
  const file = new File([blob], `upload.${photo.format}`, { type: blob.type });

  return uploadFile(file, { uploadUrl, authToken, fieldName, extraFields });
}

// ─── Web (input[type=file]) ───────────────────────────────────────────────
function pickWeb({ uploadUrl, authToken, fieldName, extraFields }) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = 'image/*,application/pdf,.xlsx,.xls,.docx,.doc,.csv';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      try {
        const result = await uploadFile(file, { uploadUrl, authToken, fieldName, extraFields });
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}

// ─── Shared upload logic ──────────────────────────────────────────────────
async function uploadFile(file, { uploadUrl, authToken, fieldName, extraFields }) {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const url    = uploadUrl.startsWith('http') ? uploadUrl : apiUrl + uploadUrl;

  const form = new FormData();
  form.append(fieldName, file);
  Object.entries(extraFields).forEach(([k, v]) => form.append(k, v));

  const headers = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const response = await fetch(url, { method: 'POST', headers, body: form });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Upload failed (${response.status}): ${err}`);
  }
  return response.json();
}
