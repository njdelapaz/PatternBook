/**
 * Content Validation Utility
 * Comprehensive validation for AI-generated and user-generated content
 * Prevents inappropriate, offensive, or irrelevant content
 */

/**
 * Patterns for detecting inappropriate content
 */
const INAPPROPRIATE_PATTERNS = {
  explicit: /\b(explicit|nsfw|nude|naked|sexual|pornographic|xxx)\b/i,
  violence: /\b(violence|violent|blood|gore|death|kill|killing|murder|weapon|gun|guns|bomb|bombing|terrorist|massacre)\b/i,
  hate: /\b(hate|racist|racism|sexist|sexism|homophobic|xenophobic|bigot|slur)\b/i,
  disturbing: /\b(disturbing|graphic|brutal|torture|abuse|abusive)\b/i,
  substances: /\b(drug|drugs|cocaine|heroin|meth|overdose|addiction|addict)\b/i,
  offensive: /\b(offensive|vulgar|profanity|obscene)\b/i,
};

/**
 * Patterns for controversial topics to avoid in suggestions
 */
const CONTROVERSIAL_PATTERNS = {
  politics: /\b(election|democrat|republican|liberal|conservative|political party|politician|congress|senate)\b/i,
  religion: /\b(religious war|holy war|religious conflict|religious extremism)\b/i,
};

/**
 * Check if text contains inappropriate content
 * @param {string} text - Text to check
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateContentAppropriate(text, options = {}) {
  const {
    checkControversial = true,
    strictMode = false, // If true, be more aggressive about filtering
  } = options;
  
  if (!text || typeof text !== 'string') {
    return { isValid: true, issues: [] };
  }
  
  const issues = [];
  const textLower = text.toLowerCase();
  
  // Check for inappropriate content (always checked)
  for (const [category, pattern] of Object.entries(INAPPROPRIATE_PATTERNS)) {
    if (pattern.test(textLower)) {
      issues.push({
        category: 'inappropriate',
        type: category,
        severity: 'high',
        message: `Contains ${category} content`,
      });
    }
  }
  
  // Check for controversial content (optional)
  if (checkControversial) {
    for (const [category, pattern] of Object.entries(CONTROVERSIAL_PATTERNS)) {
      if (pattern.test(textLower)) {
        issues.push({
          category: 'controversial',
          type: category,
          severity: 'medium',
          message: `Contains potentially controversial ${category} content`,
        });
      }
    }
  }
  
  // In strict mode, also flag potential issues
  if (strictMode) {
    // Check for all-caps (might be shouting/aggressive)
    if (text.length > 20 && text === text.toUpperCase()) {
      issues.push({
        category: 'tone',
        type: 'aggressive',
        severity: 'low',
        message: 'Text appears aggressive (all caps)',
      });
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    passed: issues.length === 0,
  };
}

/**
 * Validate AI response is appropriate and relevant
 * @param {string} response - AI response to validate
 * @param {Object} context - Context for validation
 * @returns {Object} Validation result
 */
export function validateAIResponse(response, context = {}) {
  const {
    expectedLength = { min: 10, max: 10000 },
    mustContainKeywords = [],
    mustNotContainKeywords = [],
  } = context;
  
  const issues = [];
  
  // Length check
  if (response.length < expectedLength.min) {
    issues.push({
      category: 'quality',
      type: 'too_short',
      severity: 'medium',
      message: `Response too short (${response.length} < ${expectedLength.min})`,
    });
  }
  
  if (response.length > expectedLength.max) {
    issues.push({
      category: 'quality',
      type: 'too_long',
      severity: 'low',
      message: `Response too long (${response.length} > ${expectedLength.max})`,
    });
  }
  
  // Content appropriateness
  const contentCheck = validateContentAppropriate(response);
  if (!contentCheck.isValid) {
    issues.push(...contentCheck.issues);
  }
  
  // Required keywords check
  const responseLower = response.toLowerCase();
  for (const keyword of mustContainKeywords) {
    if (!responseLower.includes(keyword.toLowerCase())) {
      issues.push({
        category: 'relevance',
        type: 'missing_keyword',
        severity: 'medium',
        message: `Missing expected keyword: ${keyword}`,
      });
    }
  }
  
  // Forbidden keywords check
  for (const keyword of mustNotContainKeywords) {
    if (responseLower.includes(keyword.toLowerCase())) {
      issues.push({
        category: 'relevance',
        type: 'forbidden_keyword',
        severity: 'high',
        message: `Contains forbidden keyword: ${keyword}`,
      });
    }
  }
  
  // Check for generic/template responses
  const genericPhrases = [
    'as an ai',
    'i am an ai',
    'i cannot',
    'i apologize but',
    'i don\'t have access to',
  ];
  
  for (const phrase of genericPhrases) {
    if (responseLower.includes(phrase)) {
      issues.push({
        category: 'quality',
        type: 'generic_response',
        severity: 'low',
        message: 'Response contains generic AI phrases',
      });
    }
  }
  
  const highSeverityIssues = issues.filter(i => i.severity === 'high');
  
  return {
    isValid: highSeverityIssues.length === 0,
    issues,
    passed: highSeverityIssues.length === 0,
    hasWarnings: issues.some(i => i.severity === 'medium' || i.severity === 'low'),
  };
}

/**
 * Build safe prompt with content guidelines
 * @param {string} basePrompt - Base prompt template
 * @param {Object} options - Options
 * @returns {string} Enhanced prompt with safety guidelines
 */
export function buildSafePrompt(basePrompt, options = {}) {
  const {
    includeContentGuidelines = true,
    includeToneGuidelines = true,
    customGuidelines = [],
  } = options;
  
  let enhancedPrompt = basePrompt;
  
  if (includeContentGuidelines) {
    enhancedPrompt += `\n\nCRITICAL CONTENT GUIDELINES:
- NO inappropriate, offensive, or explicit content
- NO violence, hate speech, or disturbing themes  
- NO controversial political or religious content
- Keep responses appropriate for all audiences
- Focus on helpful, constructive, and uplifting content`;
  }
  
  if (includeToneGuidelines) {
    enhancedPrompt += `\n\nTONE GUIDELINES:
- Be thoughtful, respectful, and supportive
- Use clear, accessible language
- Maintain a warm but professional tone
- Be specific and avoid generic responses`;
  }
  
  if (customGuidelines.length > 0) {
    enhancedPrompt += `\n\nADDITIONAL GUIDELINES:\n${customGuidelines.map(g => `- ${g}`).join('\n')}`;
  }
  
  return enhancedPrompt;
}

/**
 * Filter and validate a batch of suggestions
 * @param {Array} suggestions - Array of suggestion objects
 * @returns {Object} Filtered suggestions and validation stats
 */
export function filterSuggestions(suggestions) {
  const validated = [];
  const filtered = [];
  
  for (const suggestion of suggestions) {
    const textToCheck = `${suggestion.title || ''} ${suggestion.description || ''} ${suggestion.author || ''}`;
    const validation = validateContentAppropriate(textToCheck);
    
    if (validation.isValid) {
      validated.push(suggestion);
    } else {
      filtered.push({
        suggestion,
        issues: validation.issues,
      });
      console.warn('[ContentValidation] Filtered suggestion:', suggestion.title, validation.issues);
    }
  }
  
  return {
    validated,
    filtered,
    stats: {
      total: suggestions.length,
      validated: validated.length,
      filtered: filtered.length,
      filterRate: suggestions.length > 0 ? (filtered.length / suggestions.length) * 100 : 0,
    },
  };
}

/**
 * Sanitize text for use in prompts (remove potentially problematic content)
 * @param {string} text - Text to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitization result
 */
export function sanitizeForPrompt(text, options = {}) {
  const {
    removeUrls = false,
    removeEmails = false,
    maxLength = null,
  } = options;
  
  let sanitized = text;
  const warnings = [];
  
  // Remove URLs if requested
  if (removeUrls) {
    const urlPattern = /https?:\/\/[^\s]+/g;
    if (urlPattern.test(sanitized)) {
      sanitized = sanitized.replace(urlPattern, '[URL_REMOVED]');
      warnings.push('URLs removed');
    }
  }
  
  // Remove emails if requested
  if (removeEmails) {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    if (emailPattern.test(sanitized)) {
      sanitized = sanitized.replace(emailPattern, '[EMAIL_REMOVED]');
      warnings.push('Email addresses removed');
    }
  }
  
  // Truncate if needed
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
    warnings.push(`Truncated to ${maxLength} characters`);
  }
  
  // Validate the sanitized content
  const validation = validateContentAppropriate(sanitized);
  
  return {
    sanitized,
    warnings,
    validation,
    isValid: validation.isValid,
  };
}

export default {
  validateContentAppropriate,
  validateAIResponse,
  buildSafePrompt,
  filterSuggestions,
  sanitizeForPrompt,
};

