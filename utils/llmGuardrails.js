/**
 * LLM Guardrails
 * Security and privacy measures for LLM API interactions
 * 
 * Features:
 * - Structured prompt templates with parametrization
 * - Prompt sanitization and injection attack prevention
 * - Input length validation
 * - PII detection and sanitization (email, phone, credit card, SSN)
 * - AI response sanitization (harmful content, PII, malicious code)
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
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  macAddress: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g,
  apiKey: /\b(?:sk|pk|api[_-]?key|token)[_-]?[a-zA-Z0-9]{20,}\b/gi,
};

// Harmful content patterns (keywords/phrases indicating toxicity, violence, etc.)
const HARMFUL_CONTENT_PATTERNS = [
  // Violence indicators
  /\b(kill|murder|assassinate|violence|harm|hurt|attack|destroy)\s+(yourself|myself|themselves|himself|herself)\b/gi,
  /\b(suicide|self[-\s]?harm|cutting|overdose)\b/gi,
  // Hate speech indicators (basic patterns - can be expanded)
  /\b(nazi|kkk|white[-\s]?supremacy|racial[-\s]?slur)\b/gi,
  // Explicit inappropriate content indicators
  /\b(explicit|pornographic|xxx|nsfw)\s+(content|material|image|video)\b/gi,
];

// Malicious code patterns
const MALICIOUS_CODE_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers like onclick="..."
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
];

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

/**
 * Detect and sanitize additional PII patterns in AI responses
 * Extends basic PII detection with response-specific patterns
 * @param {string} text - Text to scan for PII
 * @returns {Object} Result with sanitized text and detected PII types
 */
function detectAndSanitizeResponsePII(text) {
  let sanitized = text;
  const detectedPII = [];
  
  // Use existing PII detection
  const basicPIIResult = detectAndSanitizePII(text);
  sanitized = basicPIIResult.sanitized;
  detectedPII.push(...basicPIIResult.detectedPII);
  
  // Detect and replace IP addresses
  const ipMatches = sanitized.match(PII_PATTERNS.ipAddress);
  if (ipMatches && ipMatches.length > 0) {
    // Filter out common false positives (version numbers, etc.)
    const validIPs = ipMatches.filter(ip => {
      const parts = ip.split('.');
      return parts.length === 4 && parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    });
    
    if (validIPs.length > 0) {
      validIPs.forEach(ip => {
        sanitized = sanitized.replace(ip, '[IP_REDACTED]');
      });
      if (!detectedPII.includes('ip_address')) {
        detectedPII.push('ip_address');
      }
    }
  }
  
  // Detect and replace MAC addresses
  const macMatches = sanitized.match(PII_PATTERNS.macAddress);
  if (macMatches && macMatches.length > 0) {
    macMatches.forEach(mac => {
      sanitized = sanitized.replace(mac, '[MAC_REDACTED]');
    });
    if (!detectedPII.includes('mac_address')) {
      detectedPII.push('mac_address');
    }
  }
  
  // Detect and replace API keys/tokens
  const apiKeyMatches = sanitized.match(PII_PATTERNS.apiKey);
  if (apiKeyMatches && apiKeyMatches.length > 0) {
    apiKeyMatches.forEach(key => {
      sanitized = sanitized.replace(key, '[API_KEY_REDACTED]');
    });
    if (!detectedPII.includes('api_key')) {
      detectedPII.push('api_key');
    }
  }
  
  return {
    sanitized,
    detectedPII: [...new Set(detectedPII)],
    originalLength: text.length,
    sanitizedLength: sanitized.length,
  };
}

/**
 * Detect harmful content in AI responses
 * @param {string} content - Content to check
 * @returns {Object} Result with detected harmful content flags
 */
function detectHarmfulContent(content) {
  const detectedFlags = [];
  let hasHarmfulContent = false;
  
  HARMFUL_CONTENT_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(content)) {
      hasHarmfulContent = true;
      // Categorize based on pattern index
      if (index < 2) {
        if (!detectedFlags.includes('violence')) {
          detectedFlags.push('violence');
        }
      } else if (index === 2) {
        if (!detectedFlags.includes('hate_speech')) {
          detectedFlags.push('hate_speech');
        }
      } else {
        if (!detectedFlags.includes('inappropriate')) {
          detectedFlags.push('inappropriate');
        }
      }
    }
  });
  
  return {
    hasHarmfulContent,
    detectedFlags,
  };
}

/**
 * Sanitize malicious code from AI responses
 * @param {string} content - Content to sanitize
 * @returns {Object} Result with sanitized content and detected code types
 */
function sanitizeMaliciousCode(content) {
  let sanitized = content;
  const detectedCode = [];
  
  MALICIOUS_CODE_PATTERNS.forEach((pattern, index) => {
    const before = sanitized;
    sanitized = sanitized.replace(pattern, '');
    
    if (before !== sanitized) {
      // Categorize detected code
      if (index === 0) {
        if (!detectedCode.includes('script_tags')) {
          detectedCode.push('script_tags');
        }
      } else if (index === 1) {
        if (!detectedCode.includes('javascript_urls')) {
          detectedCode.push('javascript_urls');
        }
      } else if (index === 2) {
        if (!detectedCode.includes('event_handlers')) {
          detectedCode.push('event_handlers');
        }
      } else {
        if (!detectedCode.includes('embedded_content')) {
          detectedCode.push('embedded_content');
        }
      }
    }
  });
  
  return {
    sanitized,
    detectedCode,
    originalLength: content.length,
    sanitizedLength: sanitized.length,
  };
}

/**
 * Comprehensive AI response sanitization
 * Sanitizes AI responses for harmful content, PII, and malicious code
 * @param {string} response - AI response content to sanitize
 * @param {Object} options - Sanitization options
 * @param {boolean} options.sanitizePII - Whether to sanitize PII (default: true)
 * @param {boolean} options.sanitizeHarmful - Whether to sanitize harmful content (default: true)
 * @param {boolean} options.sanitizeCode - Whether to sanitize malicious code (default: true)
 * @param {boolean} options.removeHarmfulContent - Whether to remove harmful content entirely (default: true)
 * @returns {Object} Sanitization result with sanitized content and metadata
 */
export function sanitizeAIResponse(response, options = {}) {
  const {
    sanitizePII = true,
    sanitizeHarmful = true,
    sanitizeCode = true,
    removeHarmfulContent = true,
  } = options;
  
  if (!response || typeof response !== 'string') {
    return {
      sanitized: '',
      warnings: ['Empty or invalid response'],
      detectedPII: [],
      detectedHarmful: [],
      detectedCode: [],
      originalLength: 0,
      sanitizedLength: 0,
    };
  }
  
  let sanitized = response;
  const warnings = [];
  const detectedPII = [];
  const detectedHarmful = [];
  const detectedCode = [];
  
  // Step 1: Sanitize malicious code first (highest priority)
  if (sanitizeCode) {
    const codeResult = sanitizeMaliciousCode(sanitized);
    if (codeResult.detectedCode.length > 0) {
      sanitized = codeResult.sanitized;
      detectedCode.push(...codeResult.detectedCode);
      warnings.push(`Removed malicious code: ${codeResult.detectedCode.join(', ')}`);
    }
  }
  
  // Step 2: Detect harmful content
  if (sanitizeHarmful) {
    const harmfulResult = detectHarmfulContent(sanitized);
    if (harmfulResult.hasHarmfulContent) {
      detectedHarmful.push(...harmfulResult.detectedFlags);
      
      if (removeHarmfulContent) {
        // Remove harmful content by replacing with safe message
        HARMFUL_CONTENT_PATTERNS.forEach(pattern => {
          sanitized = sanitized.replace(pattern, '[CONTENT_REMOVED]');
        });
        warnings.push(`Removed harmful content: ${harmfulResult.detectedFlags.join(', ')}`);
      } else {
        warnings.push(`Detected harmful content: ${harmfulResult.detectedFlags.join(', ')}`);
      }
    }
  }
  
  // Step 3: Sanitize PII
  if (sanitizePII) {
    const piiResult = detectAndSanitizeResponsePII(sanitized);
    if (piiResult.detectedPII.length > 0) {
      sanitized = piiResult.sanitized;
      detectedPII.push(...piiResult.detectedPII);
      warnings.push(`Detected and sanitized PII: ${piiResult.detectedPII.join(', ')}`);
    }
  }
  
  // Step 4: Clean up multiple [CONTENT_REMOVED] markers
  sanitized = sanitized.replace(/\[CONTENT_REMOVED\](?:\s*\[CONTENT_REMOVED\])+/g, '[CONTENT_REMOVED]');
  
  // Step 5: Clean up excessive whitespace
  sanitized = sanitized.replace(/\s{3,}/g, ' ').trim();
  
  // Step 6: Handle empty or mostly-empty responses
  if (sanitized.length === 0 || sanitized.replace(/\[.*?\]/g, '').trim().length === 0) {
    sanitized = '[Response removed due to content policy]';
    warnings.push('Response was mostly or entirely removed due to sanitization');
  }
  
  // Step 7: Check if too much content was removed (>50%)
  const removalRatio = 1 - (sanitized.length / response.length);
  if (removalRatio > 0.5 && response.length > 50) {
    warnings.push(`Warning: More than 50% of response was removed (${Math.round(removalRatio * 100)}%)`);
  }
  
  return {
    sanitized,
    warnings,
    detectedPII: [...new Set(detectedPII)],
    detectedHarmful: [...new Set(detectedHarmful)],
    detectedCode: [...new Set(detectedCode)],
    originalLength: response.length,
    sanitizedLength: sanitized.length,
    removalRatio: removalRatio,
  };
}

