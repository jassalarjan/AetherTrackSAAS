/**
 * Password Validation Utility
 * Enforces strong password policy to prevent account compromise
 * through password guessing or brute force attacks.
 */

const PASSWORD_MIN_LENGTH = 8;

const passwordRequirements = {
  minLength: PASSWORD_MIN_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true
};

/**
 * Validates a password against security requirements
 * @param {string} password - The password to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
function validatePassword(password) {
  const errors = [];
  
  // Check if password exists and meets minimum length
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }
  
  // Only check other requirements if password exists
  if (password) {
    // Check for uppercase letter
    if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    // Check for lowercase letter
    if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    // Check for number
    if (passwordRequirements.requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    // Check for special character
    if (passwordRequirements.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;\':",.<>?)');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Returns a human-readable description of password requirements
 * @returns {string} - Description of password requirements
 */
function getPasswordRequirements() {
  return `Password must:
  - Be at least ${PASSWORD_MIN_LENGTH} characters long
  - Contain at least one uppercase letter (A-Z)
  - Contain at least one lowercase letter (a-z)
  - Contain at least one number (0-9)
  - Contain at least one special character (!@#$%^&*()_+-=[]{}|;':",.<>?)`;
}

export { validatePassword, passwordRequirements, getPasswordRequirements };
