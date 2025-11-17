/**
 * LLM Guardrails
 * Security and privacy measures for LLM API interactions
 * 
 * Features:
 * - Structured prompt templates with parametrization
 * - Prompt sanitization and injection attack prevention
 * - Input length validation
 * - PII detection and sanitization (email, phone, credit card, SSN)
 */

// Maximum input lengths (in characters)
export const MAX_INPUT_LENGTHS = {
  chat: 2000,
  summary: 5000,
  default: 2000,
};

// PII Detection Patterns
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{13,19}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
};

// Prompt injection patterns to detect and remove
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions?/gi,
  /you\s+are\s+(now\s+)?(a\s+)?(system|assistant|user)/gi,
  /system:\s*you\s+are/gi,
  /assistant:\s*(you\s+are|do\s+this)/gi,
  /role:\s*(system|assistant|user)/gi,
  /forget\s+(all\s+)?(previous|prior)/gi,
  /disregard\s+(all\s+)?(previous|prior)/gi,
];

/**
 * Create a prompt template with parameter substitution
 * @param {string} template - Template string with {{param}} placeholders
 * @param {Object} params - Parameters to substitute
 * @returns {string} Rendered template
 */
export function createPromptTemplate(template, params = {}) {
  let rendered = template;
  
  // Replace all {{param}} with values
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{{${key}}}`;
    if (rendered.includes(placeholder)) {
      // Escape the value to prevent injection
      const escapedValue = escapeForPrompt(String(value));
      rendered = rendered.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), escapedValue);
    }
  }
  
  return rendered;
}

/**
 * Escape special characters to prevent prompt injection
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeForPrompt(text) {
  // Remove newlines that could be used for injection
  let escaped = text.replace(/\n/g, ' ');
  
  // Remove common injection patterns
  INJECTION_PATTERNS.forEach(pattern => {
    escaped = escaped.replace(pattern, '');
  });
  
  return escaped.trim();
}

/**
 * Validate input length
 * @param {string} input - Input to validate
 * @param {number} maxLength - Maximum allowed length
 * @param {Object} options - Options (truncate: boolean)
 * @returns {Object} Validation result
 */
export function validateInputLength(input, maxLength = MAX_INPUT_LENGTHS.default, options = {}) {
  const length = input.length;
  
  if (length <= maxLength) {
    return {
      isValid: true,
      length,
      truncated: false,
    };
  }
  
  if (options.truncate) {
    return {
      isValid: true,
      length: maxLength,
      truncated: true,
      originalLength: length,
      sanitized: input.substring(0, maxLength),
    };
  }
  
  return {
    isValid: false,
    length,
    error: `Input length (${length}) exceeds maximum allowed length (${maxLength})`,
  };
}

/**
 * Sanitize prompt to prevent injection attacks
 * @param {string} prompt - Prompt to sanitize
 * @returns {string} Sanitized prompt
 */
export function sanitizePrompt(prompt) {
  let sanitized = prompt;
  
  // Remove injection patterns
  INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove role injection attempts
  sanitized = sanitized.replace(/\n\s*(system|assistant|user):\s*/gi, '\n');
  
  // Clean up multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Detect and sanitize PII (Personally Identifiable Information)
 * @param {string} text - Text to scan for PII
 * @returns {Object} Result with sanitized text and detected PII types
 */
export function detectAndSanitizePII(text) {
  let sanitized = text;
  const detectedPII = [];
  
  // Detect and replace email addresses
  const emailMatches = text.match(PII_PATTERNS.email);
  if (emailMatches && emailMatches.length > 0) {
    emailMatches.forEach(email => {
      sanitized = sanitized.replace(email, '[EMAIL_REDACTED]');
    });
    // Add one entry per unique email type (not per email)
    if (!detectedPII.includes('email')) {
      detectedPII.push('email');
    }
  }
  
  // Detect and replace credit card numbers FIRST (before phone, as cards can match phone pattern)
  const cardMatches = text.match(PII_PATTERNS.creditCard);
  if (cardMatches) {
    // Validate using Luhn algorithm for better accuracy
    const validCards = cardMatches.filter(card => {
      const digits = card.replace(/\D/g, '');
      return digits.length >= 13 && digits.length <= 19 && isValidLuhn(digits);
    });
    
    if (validCards.length > 0) {
      validCards.forEach(card => {
        sanitized = sanitized.replace(card, '[CARD_REDACTED]');
      });
      if (!detectedPII.includes('credit_card')) {
        detectedPII.push('credit_card');
      }
    }
  }
  
  // Detect and replace phone numbers (after credit cards to avoid conflicts)
  const phoneMatches = sanitized.match(PII_PATTERNS.phone);
  if (phoneMatches && phoneMatches.length > 0) {
    // Filter out false positives (short numbers, years, etc.)
    const validPhones = phoneMatches.filter(phone => {
      const digits = phone.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    });
    
    if (validPhones.length > 0) {
      validPhones.forEach(phone => {
        sanitized = sanitized.replace(phone, '[PHONE_REDACTED]');
      });
      if (!detectedPII.includes('phone')) {
        detectedPII.push('phone');
      }
    }
  }
  
  // Detect and replace SSN
  const ssnMatches = text.match(PII_PATTERNS.ssn);
  if (ssnMatches) {
    ssnMatches.forEach(ssn => {
      sanitized = sanitized.replace(ssn, '[SSN_REDACTED]');
    });
    detectedPII.push('ssn');
  }
  
  return {
    sanitized,
    detectedPII: [...new Set(detectedPII)], // Remove duplicates
    originalLength: text.length,
    sanitizedLength: sanitized.length,
  };
}

/**
 * Validate credit card number using Luhn algorithm
 * @param {string} cardNumber - Card number to validate
 * @returns {boolean} True if valid
 */
function isValidLuhn(cardNumber) {
  let sum = 0;
  let isEven = false;
  
  // Remove non-digits and reverse
  const digits = cardNumber.replace(/\D/g, '').split('').reverse();
  
  for (let i = 0; i < digits.length; i++) {
    let digit = parseInt(digits[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Comprehensive input sanitization
 * @param {string} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitization result
 */
export function sanitizeInput(input, options = {}) {
  const {
    maxLength = MAX_INPUT_LENGTHS.default,
    sanitizePII = true,
    sanitizeInjection = true,
    truncate = false,
  } = options;
  
  const warnings = [];
  let sanitized = input;
  
  // Validate length
  const lengthValidation = validateInputLength(sanitized, maxLength, { truncate });
  if (!lengthValidation.isValid) {
    return {
      isValid: false,
      error: lengthValidation.error,
      sanitized: truncate ? lengthValidation.sanitized : sanitized,
    };
  }
  
  if (lengthValidation.truncated) {
    sanitized = lengthValidation.sanitized;
    warnings.push('Input was truncated due to length');
  }
  
  // Sanitize PII
  if (sanitizePII) {
    const piiResult = detectAndSanitizePII(sanitized);
    if (piiResult.detectedPII.length > 0) {
      sanitized = piiResult.sanitized;
      warnings.push(`Detected and sanitized PII: ${piiResult.detectedPII.join(', ')}`);
    }
  }
  
  // Sanitize injection attempts
  if (sanitizeInjection) {
    const beforeSanitization = sanitized;
    sanitized = sanitizePrompt(sanitized);
    if (beforeSanitization !== sanitized) {
      warnings.push('Removed potential prompt injection attempts');
    }
  }
  
  return {
    isValid: true,
    sanitized,
    warnings,
    detectedPII: sanitizePII ? detectAndSanitizePII(input).detectedPII : [],
    originalLength: input.length,
    sanitizedLength: sanitized.length,
  };
}

/**
 * Build secure prompt with all guardrails applied
 * @param {string} template - Prompt template
 * @param {Object} params - Template parameters
 * @param {Object} options - Security options
 * @returns {Object} Secure prompt result
 */
export function buildSecurePrompt(template, params = {}, options = {}) {
  // First, create the template
  let prompt = createPromptTemplate(template, params);
  
  // Apply sanitization
  const sanitizationResult = sanitizeInput(prompt, {
    maxLength: options.maxLength || MAX_INPUT_LENGTHS.default,
    sanitizePII: options.sanitizePII !== false,
    sanitizeInjection: options.sanitizeInjection !== false,
    truncate: options.truncate || false,
  });
  
  if (!sanitizationResult.isValid) {
    return {
      isValid: false,
      error: sanitizationResult.error,
      prompt: sanitizationResult.sanitized,
    };
  }
  
  return {
    isValid: true,
    prompt: sanitizationResult.sanitized,
    warnings: sanitizationResult.warnings,
    detectedPII: sanitizationResult.detectedPII,
  };
}

