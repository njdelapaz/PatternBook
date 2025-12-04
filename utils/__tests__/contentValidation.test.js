/**
 * Tests for Content Validation Utility
 */

import {
  validateContentAppropriate,
  validateAIResponse,
  buildSafePrompt,
  filterSuggestions,
  sanitizeForPrompt,
} from '../contentValidation';

describe('Content Validation', () => {
  describe('validateContentAppropriate', () => {
    it('should pass appropriate content', () => {
      const result = validateContentAppropriate('A beautiful painting of a landscape at sunset');
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect explicit content', () => {
      const result = validateContentAppropriate('This contains explicit and nsfw content');
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(1);
      expect(result.issues[0].category).toBe('inappropriate');
      expect(result.issues[0].type).toBe('explicit');
    });

    it('should detect violence', () => {
      const result = validateContentAppropriate('A painting depicting violence and murder');
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.type === 'violence')).toBe(true);
    });

    it('should detect hate speech', () => {
      const result = validateContentAppropriate('Content with racist themes');
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.type === 'hate')).toBe(true);
    });

    it('should detect controversial content when enabled', () => {
      const result = validateContentAppropriate('About the election and political party', {
        checkControversial: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.category === 'controversial')).toBe(true);
    });

    it('should skip controversial check when disabled', () => {
      const result = validateContentAppropriate('About the election and political party', {
        checkControversial: false,
      });
      expect(result.isValid).toBe(true);
    });

    it('should handle empty or invalid input', () => {
      expect(validateContentAppropriate('').isValid).toBe(true);
      expect(validateContentAppropriate(null).isValid).toBe(true);
      expect(validateContentAppropriate(undefined).isValid).toBe(true);
    });

    it('should be case insensitive', () => {
      const result = validateContentAppropriate('EXPLICIT VIOLENCE');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateAIResponse', () => {
    it('should pass valid response', () => {
      const result = validateAIResponse('This is a thoughtful and appropriate response about reflection.');
      expect(result.isValid).toBe(true);
    });

    it('should detect too short responses', () => {
      const result = validateAIResponse('Short', {
        expectedLength: { min: 20, max: 1000 },
      });
      expect(result.isValid).toBe(true); // Low severity, not blocking
      expect(result.hasWarnings).toBe(true);
      expect(result.issues.some(i => i.type === 'too_short')).toBe(true);
    });

    it('should detect too long responses', () => {
      const longText = 'x'.repeat(11000);
      const result = validateAIResponse(longText, {
        expectedLength: { min: 10, max: 10000 },
      });
      expect(result.hasWarnings).toBe(true);
      expect(result.issues.some(i => i.type === 'too_long')).toBe(true);
    });

    it('should detect generic AI phrases', () => {
      const result = validateAIResponse('As an AI, I cannot provide that information.');
      expect(result.hasWarnings).toBe(true);
      expect(result.issues.some(i => i.type === 'generic_response')).toBe(true);
    });

    it('should check for forbidden keywords', () => {
      const result = validateAIResponse('This response contains violence', {
        mustNotContainKeywords: ['violence', 'explicit'],
      });
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.type === 'forbidden_keyword')).toBe(true);
    });

    it('should check for required keywords', () => {
      const result = validateAIResponse('A peaceful landscape', {
        mustContainKeywords: ['ocean', 'waves'],
      });
      expect(result.hasWarnings).toBe(true);
      expect(result.issues.some(i => i.type === 'missing_keyword')).toBe(true);
    });

    it('should validate content appropriateness', () => {
      const result = validateAIResponse('This has explicit content');
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.category === 'inappropriate')).toBe(true);
    });
  });

  describe('buildSafePrompt', () => {
    it('should add content guidelines', () => {
      const prompt = buildSafePrompt('Base prompt', {
        includeContentGuidelines: true,
      });
      expect(prompt).toContain('Base prompt');
      expect(prompt).toContain('CRITICAL CONTENT GUIDELINES');
      expect(prompt).toContain('NO inappropriate');
    });

    it('should add tone guidelines', () => {
      const prompt = buildSafePrompt('Base prompt', {
        includeToneGuidelines: true,
      });
      expect(prompt).toContain('TONE GUIDELINES');
      expect(prompt).toContain('thoughtful');
    });

    it('should add custom guidelines', () => {
      const prompt = buildSafePrompt('Base prompt', {
        customGuidelines: ['Custom rule 1', 'Custom rule 2'],
      });
      expect(prompt).toContain('ADDITIONAL GUIDELINES');
      expect(prompt).toContain('Custom rule 1');
      expect(prompt).toContain('Custom rule 2');
    });

    it('should work with all options', () => {
      const prompt = buildSafePrompt('Base prompt', {
        includeContentGuidelines: true,
        includeToneGuidelines: true,
        customGuidelines: ['Custom rule'],
      });
      expect(prompt).toContain('Base prompt');
      expect(prompt).toContain('CRITICAL CONTENT GUIDELINES');
      expect(prompt).toContain('TONE GUIDELINES');
      expect(prompt).toContain('Custom rule');
    });
  });

  describe('filterSuggestions', () => {
    it('should pass appropriate suggestions', () => {
      const suggestions = [
        { title: 'Starry Night', description: 'A beautiful painting', author: 'Van Gogh' },
        { title: 'Peaceful quote', description: 'About reflection', author: 'Socrates' },
      ];

      const result = filterSuggestions(suggestions);
      expect(result.validated).toHaveLength(2);
      expect(result.filtered).toHaveLength(0);
      expect(result.stats.filterRate).toBe(0);
    });

    it('should filter inappropriate suggestions', () => {
      const suggestions = [
        { title: 'Good painting', description: 'Beautiful art', author: 'Artist' },
        { title: 'Bad painting', description: 'Contains explicit violence', author: 'Artist' },
      ];

      const result = filterSuggestions(suggestions);
      expect(result.validated).toHaveLength(1);
      expect(result.filtered).toHaveLength(1);
      expect(result.stats.filterRate).toBe(50);
      expect(result.validated[0].title).toBe('Good painting');
    });

    it('should handle empty array', () => {
      const result = filterSuggestions([]);
      expect(result.validated).toHaveLength(0);
      expect(result.filtered).toHaveLength(0);
      expect(result.stats.filterRate).toBe(0);
    });

    it('should check all text fields', () => {
      const suggestions = [
        { title: 'Clean title', description: 'Clean desc', author: 'violence in author' },
      ];

      const result = filterSuggestions(suggestions);
      expect(result.filtered).toHaveLength(1);
    });
  });

  describe('sanitizeForPrompt', () => {
    it('should return text unchanged if valid', () => {
      const result = sanitizeForPrompt('Clean text without issues');
      expect(result.sanitized).toBe('Clean text without issues');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should remove URLs when requested', () => {
      const result = sanitizeForPrompt('Check out https://example.com', {
        removeUrls: true,
      });
      expect(result.sanitized).toContain('[URL_REMOVED]');
      expect(result.warnings).toContain('URLs removed');
    });

    it('should remove emails when requested', () => {
      const result = sanitizeForPrompt('Contact me at test@example.com', {
        removeEmails: true,
      });
      expect(result.sanitized).toContain('[EMAIL_REMOVED]');
      expect(result.warnings).toContain('Email addresses removed');
    });

    it('should truncate long text when maxLength is set', () => {
      const result = sanitizeForPrompt('x'.repeat(1000), {
        maxLength: 100,
      });
      expect(result.sanitized.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(result.warnings).toContain('Truncated to 100 characters');
    });

    it('should validate sanitized content', () => {
      const result = sanitizeForPrompt('Text with violence');
      expect(result.isValid).toBe(false);
      expect(result.validation.issues).not.toHaveLength(0);
    });

    it('should handle multiple sanitization operations', () => {
      const result = sanitizeForPrompt(
        'Long text with https://url.com and email@test.com' + 'x'.repeat(1000),
        {
          removeUrls: true,
          removeEmails: true,
          maxLength: 50,
        }
      );
      expect(result.sanitized).not.toContain('https://');
      expect(result.sanitized).not.toContain('email@');
      expect(result.sanitized.length).toBeLessThanOrEqual(53);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

