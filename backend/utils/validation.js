/**
 * Validation and Sanitization Utilities
 * Provides ObjectId validation and XSS sanitization for user input
 */

import mongoose from 'mongoose';
import xss from 'xss';

// ============================================================
// ObjectId Validation Utilities
// ============================================================

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID string to validate
 * @returns {boolean} - True if valid ObjectId
 */
export function isValidObjectId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // Check if it's a valid ObjectId format (24 hex characters)
  const hexRegex = /^[0-9a-fA-F]{24}$/;
  if (!hexRegex.test(id)) {
    return false;
  }
  
  // Use mongoose's validation and verify round-trip conversion
  return mongoose.Types.ObjectId.isValid(id) && 
         (new mongoose.Types.ObjectId(id)).toString() === id;
}

/**
 * Validates an ObjectId and throws an error if invalid
 * @param {string} id - The ID to validate
 * @param {string} paramName - Name of the parameter for error messages
 * @returns {string} - The validated ID
 * @throws {Error} - If ID is invalid
 */
export function validateObjectId(id, paramName = 'id') {
  if (!isValidObjectId(id)) {
    throw new Error(`Invalid ${paramName}: must be a valid MongoDB ObjectId`);
  }
  return id;
}

/**
 * Express middleware to validate ID parameter in routes
 * @param {string} paramName - The name of the route parameter (default: 'id')
 * @returns {Function} - Express middleware function
 */
export function validateIdParam(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({ 
        error: `Missing ${paramName} parameter`,
        code: 'MISSING_ID'
      });
    }
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        error: `Invalid ${paramName} format`,
        code: 'INVALID_ID_FORMAT'
      });
    }
    
    next();
  };
}

/**
 * Validates multiple ObjectId parameters
 * @param {string[]} paramNames - Array of parameter names to validate
 * @returns {Function} - Express middleware function
 */
export function validateMultipleIdParams(...paramNames) {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const id = req.params[paramName];
      
      if (id && !isValidObjectId(id)) {
        return res.status(400).json({ 
          error: `Invalid ${paramName} format`,
          code: 'INVALID_ID_FORMAT'
        });
      }
    }
    
    next();
  };
}

/**
 * Validates ObjectId in request body
 * @param {string[]} fields - Array of field names to validate
 * @returns {Function} - Express middleware function
 */
export function validateIdBody(fields) {
  return (req, res, next) => {
    for (const field of fields) {
      const id = req.body[field];
      
      if (id && !isValidObjectId(id)) {
        return res.status(400).json({ 
          error: `Invalid ${field} format in request body`,
          code: 'INVALID_ID_FORMAT'
        });
      }
    }
    
    next();
  };
}

// ============================================================
// XSS Sanitization Utilities
// ============================================================

/**
 * Basic HTML entity escaping for fallback sanitization
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function basicEscape(str) {
  const htmlEntities = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return String(str).replace(/[&<>"'`=/]/g, char => htmlEntities[char]);
}

/**
 * Sanitizes a string to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized string
 */
export function sanitizeInput(input, options = {}) {
  if (typeof input !== 'string') {
    return input;
  }
  
  if (xss) {
    return xss(input, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
      ...options
    });
  }
  
  // Fallback to basic escaping if xss module not available
  return basicEscape(input);
}

/**
 * Sanitizes an object's string fields
 * @param {Object} obj - The object to sanitize
 * @param {string[]|null} fields - Specific fields to sanitize (null = all string fields)
 * @returns {Object} - Sanitized object
 */
export function sanitizeObject(obj, fields = null) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const sanitized = { ...obj };
  const fieldsToSanitize = fields || Object.keys(sanitized);
  
  for (const key of fieldsToSanitize) {
    if (sanitized.hasOwnProperty(key) && typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Recursively sanitizes an object including nested objects and arrays
 * @param {*} data - The data to sanitize
 * @param {string[]|null} excludeFields - Fields to exclude from sanitization
 * @returns {*} - Sanitized data
 */
export function sanitizeDeep(data, excludeFields = []) {
  if (typeof data === 'string') {
    return sanitizeInput(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeDeep(item, excludeFields));
  }
  
  if (data && typeof data === 'object') {
    const sanitized = {};
    for (const key of Object.keys(data)) {
      if (excludeFields.includes(key)) {
        sanitized[key] = data[key];
      } else {
        sanitized[key] = sanitizeDeep(data[key], excludeFields);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Express middleware to sanitize request body
 * @param {string[]|null} fields - Specific fields to sanitize (null = all string fields)
 * @returns {Function} - Express middleware function
 */
export function sanitizeBody(fields = null) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, fields);
    }
    next();
  };
}

/**
 * Express middleware for deep sanitization of request body
 * @param {string[]} excludeFields - Fields to exclude from sanitization
 * @returns {Function} - Express middleware function
 */
export function sanitizeBodyDeep(excludeFields = []) {
  return (req, res, next) => {
    if (req.body) {
      req.body = sanitizeDeep(req.body, excludeFields);
    }
    next();
  };
}

// ============================================================
// Combined Validation + Sanitization Middleware
// ============================================================

/**
 * Creates a combined middleware for validating IDs and sanitizing body
 * @param {Object} options - Configuration options
 * @param {string} idParam - Name of ID parameter to validate
 * @param {string[]} sanitizeFields - Fields to sanitize in body
 * @returns {Function[]} - Array of middleware functions
 */
export function createSecureRouteMiddleware(options = {}) {
  const { idParam = 'id', sanitizeFields = null } = options;
  
  const middlewares = [];
  
  if (idParam) {
    middlewares.push(validateIdParam(idParam));
  }
  
  middlewares.push(sanitizeBody(sanitizeFields));
  
  return middlewares;
}

// ============================================================
// Common Text Field Sanitization Presets
// ============================================================

/**
 * Common text fields that should be sanitized for user content
 */
export const SANITIZATION_PRESETS = {
  // Task-related fields
  TASK_FIELDS: ['title', 'description', 'notes', 'comments'],
  
  // User profile fields
  USER_FIELDS: ['name', 'firstName', 'lastName', 'bio', 'designation', 'department'],
  
  // Project fields
  PROJECT_FIELDS: ['name', 'description', 'notes'],
  
  // Comment fields
  COMMENT_FIELDS: ['content', 'text'],
  
  // Leave request fields
  LEAVE_FIELDS: ['reason', 'notes'],
  
  // Meeting fields
  MEETING_FIELDS: ['title', 'description', 'agenda', 'notes', 'location'],
  
  // Team fields
  TEAM_FIELDS: ['name', 'description']
};

/**
 * Middleware preset for task routes
 */
export const sanitizeTaskBody = sanitizeBody(SANITIZATION_PRESETS.TASK_FIELDS);

/**
 * Middleware preset for user routes
 */
export const sanitizeUserBody = sanitizeBody(SANITIZATION_PRESETS.USER_FIELDS);

/**
 * Middleware preset for project routes
 */
export const sanitizeProjectBody = sanitizeBody(SANITIZATION_PRESETS.PROJECT_FIELDS);

/**
 * Middleware preset for comment routes
 */
export const sanitizeCommentBody = sanitizeBody(SANITIZATION_PRESETS.COMMENT_FIELDS);

// Default export for convenience
export default {
  // ObjectId validation
  isValidObjectId,
  validateObjectId,
  validateIdParam,
  validateMultipleIdParams,
  validateIdBody,
  
  // XSS sanitization
  sanitizeInput,
  sanitizeObject,
  sanitizeDeep,
  sanitizeBody,
  sanitizeBodyDeep,
  
  // Combined
  createSecureRouteMiddleware,
  
  // Presets
  SANITIZATION_PRESETS,
  sanitizeTaskBody,
  sanitizeUserBody,
  sanitizeProjectBody,
  sanitizeCommentBody
};
