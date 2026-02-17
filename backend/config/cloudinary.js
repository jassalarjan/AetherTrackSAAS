import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for memory storage
const storage = multer.memoryStorage();

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Other
    'application/json',
    'application/xml',
    'text/xml'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, images, and archives.`), false);
  }
};

// Configure Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * Upload a file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} originalName - Original filename
 * @param {string} mimetype - File mimetype
 * @returns {Promise<object>} Cloudinary upload result
 */
const uploadToCloudinary = (fileBuffer, originalName, mimetype) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_FOLDER || 'aethertrack/documents',
        resource_type: 'auto',
        public_id: `${Date.now()}-${path.parse(originalName).name}`,
        format: path.extname(originalName).substring(1) || undefined
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, raw, video, auto)
 * @returns {Promise<object>} Cloudinary deletion result
 */
const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

/**
 * Extract Cloudinary public ID from URL
 * @param {string} url - Cloudinary URL
 * @returns {string} Public ID
 */
const extractPublicId = (url) => {
  try {
    // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.ext
    const matches = url.match(/\/v\d+\/(.+?)(?:\.[^.]+)?$/);
    if (matches && matches[1]) {
      return matches[1];
    }
    // Fallback: try to extract from upload/ onwards
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      const afterUpload = url.substring(uploadIndex + 8);
      // Remove version if present
      const withoutVersion = afterUpload.replace(/^v\d+\//, '');
      // Remove file extension
      return withoutVersion.replace(/\.[^.]+$/, '');
    }
    return null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

export { cloudinary, upload, uploadToCloudinary, deleteFromCloudinary, extractPublicId };
