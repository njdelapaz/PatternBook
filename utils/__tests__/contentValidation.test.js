/**
 * Tests for Content Validation Utility
 */

import {
  validateContentAppropriate,
  validateAIResponse,
  validateArtwork,
  buildSafePrompt,
  filterSuggestions,
  sanitizeForPrompt,
  scanForInappropriateKeywords,
  INAPPROPRIATE_KEYWORDS,
} from '../contentValidation';

describe('Content Validation', () => {
  describe('INAPPROPRIATE_KEYWORDS', () => {
    it('should export keyword categories', () => {
      expect(INAPPROPRIATE_KEYWORDS).toBeDefined();
      expect(INAPPROPRIATE_KEYWORDS.nudity).toBeInstanceOf(Array);
      expect(INAPPROPRIATE_KEYWORDS.sexual).toBeInstanceOf(Array);
      expect(INAPPROPRIATE_KEYWORDS.violence).toBeInstanceOf(Array);
      expect(INAPPROPRIATE_KEYWORDS.disturbing).toBeInstanceOf(Array);
    });

    it('should have comprehensive keyword coverage', () => {
      expect(INAPPROPRIATE_KEYWORDS.nudity.length).toBeGreaterThan(5);
      expect(INAPPROPRIATE_KEYWORDS.violence.length).toBeGreaterThan(5);
    });
  });

  describe('scanForInappropriateKeywords', () => {
    it('should return no issues for clean content', () => {
      const result = scanForInappropriateKeywords('A beautiful landscape painting with mountains and trees');
      expect(result.hasIssues).toBe(false);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect nudity keywords', () => {
      const result = scanForInappropriateKeywords('This artwork depicts nude figures');
      expect(result.hasIssues).toBe(true);
      expect(result.issues.some(i => i.category === 'nudity')).toBe(true);
      expect(result.issues[0].keyword).toBe('nude');
    });

    it('should detect violence keywords', () => {
      const result = scanForInappropriateKeywords('A battle scene with blood and violence');
      expect(result.hasIssues).toBe(true);
      expect(result.issues.some(i => i.category === 'violence')).toBe(true);
    });

    it('should detect multiple issues', () => {
      const result = scanForInappropriateKeywords('A violent scene with naked figures');
      expect(result.hasIssues).toBe(true);
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
    });

    it('should be case insensitive', () => {
      const result = scanForInappropriateKeywords('NUDE PORTRAIT');
      expect(result.hasIssues).toBe(true);
    });

    it('should handle null/undefined gracefully', () => {
      expect(scanForInappropriateKeywords(null).hasIssues).toBe(false);
      expect(scanForInappropriateKeywords(undefined).hasIssues).toBe(false);
      expect(scanForInappropriateKeywords('').hasIssues).toBe(false);
    });

    it('should detect sexual content keywords', () => {
      const result = scanForInappropriateKeywords('An erotic and sensual composition');
      expect(result.hasIssues).toBe(true);
      expect(result.issues.some(i => i.category === 'sexual')).toBe(true);
    });

    it('should detect disturbing content keywords', () => {
      const result = scanForInappropriateKeywords('A grotesque horror nightmare');
      expect(result.hasIssues).toBe(true);
      expect(result.issues.some(i => i.category === 'disturbing')).toBe(true);
    });

    it('should provide detailed issue information', () => {
      const result = scanForInappropriateKeywords('nude artwork');
      expect(result.issues[0]).toHaveProperty('category');
      expect(result.issues[0]).toHaveProperty('keyword');
      expect(result.issues[0]).toHaveProperty('message');
    });
  });

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

  describe('validateArtwork', () => {
    it('should pass appropriate artwork', () => {
      const artwork = {
        type: 'art',
        title: 'Starry Night',
        description: 'A beautiful swirling night sky over a village',
        author: 'Vincent van Gogh',
      };
      const result = validateArtwork(artwork);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect nudity in artwork title', () => {
      const artwork = {
        type: 'art',
        title: 'The Nude Descending',
        description: 'An abstract painting',
        author: 'Artist Name',
      };
      const result = validateArtwork(artwork);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.type === 'nudity')).toBe(true);
    });

    it('should detect nudity in artwork description', () => {
      const artwork = {
        type: 'art',
        title: 'Classical Dance',
        description: 'Depicts naked figures dancing on a hill',
        author: 'Artist Name',
      };
      const result = validateArtwork(artwork);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.type === 'nudity')).toBe(true);
    });

    it('should detect violent imagery', () => {
      const artwork = {
        type: 'art',
        title: 'Battle Scene',
        description: 'A war scene with soldiers fighting',
        author: 'Artist Name',
      };
      const result = validateArtwork(artwork);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.type === 'violence')).toBe(true);
    });

    it('should detect disturbing imagery', () => {
      const artwork = {
        type: 'art',
        title: 'The Nightmare',
        description: 'A grotesque and macabre scene',
        author: 'Artist Name',
      };
      const result = validateArtwork(artwork);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.type === 'disturbing')).toBe(true);
    });

    it('should detect erotic/sexual content', () => {
      const artwork = {
        type: 'art',
        title: 'Intimate Moment',
        description: 'An erotic and sensual composition',
        author: 'Artist Name',
      };
      const result = validateArtwork(artwork);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.type === 'sexual')).toBe(true);
    });

    it('should detect multiple issues', () => {
      const artwork = {
        type: 'art',
        title: 'Nude Battle',
        description: 'Naked soldiers in violent combat',
        author: 'Artist Name',
      };
      const result = validateArtwork(artwork);
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
      expect(result.issues.some(i => i.type === 'nudity')).toBe(true);
      expect(result.issues.some(i => i.type === 'violence')).toBe(true);
    });

    it('should be case insensitive', () => {
      const artwork = {
        type: 'art',
        title: 'NUDE PORTRAIT',
        description: 'NAKED FIGURE',
        author: 'Artist',
      };
      const result = validateArtwork(artwork);
      expect(result.isValid).toBe(false);
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
        { type: 'art', title: 'Starry Night', description: 'A beautiful painting', author: 'Van Gogh' },
        { type: 'quote', title: 'Peaceful quote', description: 'About reflection', author: 'Socrates' },
      ];

      const result = filterSuggestions(suggestions);
      expect(result.validated).toHaveLength(2);
      expect(result.filtered).toHaveLength(0);
      expect(result.stats.filterRate).toBe(0);
    });

    it('should filter inappropriate suggestions', () => {
      const suggestions = [
        { type: 'art', title: 'Good painting', description: 'Beautiful art', author: 'Artist' },
        { type: 'art', title: 'Bad painting', description: 'Contains explicit violence', author: 'Artist' },
      ];

      const result = filterSuggestions(suggestions);
      expect(result.validated).toHaveLength(1);
      expect(result.filtered).toHaveLength(1);
      expect(result.stats.filterRate).toBe(50);
      expect(result.validated[0].title).toBe('Good painting');
    });

    it('should use stricter validation for artwork', () => {
      const suggestions = [
        { type: 'art', title: 'Dance', description: 'Depicts nude figures', author: 'Artist' },
        { type: 'quote', title: 'About reflection', description: 'A thoughtful quote', author: 'Author' },
      ];

      const result = filterSuggestions(suggestions);
      expect(result.validated).toHaveLength(1);
      expect(result.filtered).toHaveLength(1);
      expect(result.validated[0].type).toBe('quote');
      expect(result.filtered[0].suggestion.type).toBe('art');
    });

    it('should filter artwork with nudity but allow other types with standard validation', () => {
      const suggestions = [
        { type: 'art', title: 'Naked Portrait', description: 'Classical nude', author: 'Artist' },
        { type: 'insight', title: 'Reflection', description: 'A thoughtful observation', author: null },
      ];

      const result = filterSuggestions(suggestions);
      expect(result.validated).toHaveLength(1);
      expect(result.validated[0].type).toBe('insight');
    });

    it('should handle empty array', () => {
      const result = filterSuggestions([]);
      expect(result.validated).toHaveLength(0);
      expect(result.filtered).toHaveLength(0);
      expect(result.stats.filterRate).toBe(0);
    });

    it('should check all text fields', () => {
      const suggestions = [
        { type: 'quote', title: 'Clean title', description: 'Clean desc', author: 'violence in author' },
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

