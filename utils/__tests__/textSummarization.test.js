/**
 * Tests for Text Summarization Utility
 * Tests the fallback text-based summarization when AI is unavailable
 */

import { generateTextSummary } from '../textSummarization';

describe('Text Summarization', () => {
  describe('generateTextSummary', () => {
    test('should return empty string for empty input', () => {
      expect(generateTextSummary('')).toBe('');
      expect(generateTextSummary(null)).toBe('');
      expect(generateTextSummary(undefined)).toBe('');
    });

    test('should return content as-is if already short', () => {
      const shortText = 'This is a short note.';
      expect(generateTextSummary(shortText)).toBe(shortText);
    });

    test('should extract first sentences for long text', () => {
      const longText = 'This is the first sentence. This is the second sentence. This is the third sentence. This is the fourth sentence.';
      const summary = generateTextSummary(longText);
      
      expect(summary.length).toBeLessThanOrEqual(150);
      expect(summary).toContain('This is the first sentence');
      expect(summary).toContain('This is the second sentence');
    });

    test('should extract first words if no sentence endings', () => {
      const textWithoutSentences = 'This is a long text without proper sentence endings just words and more words and even more words that go on and on';
      const summary = generateTextSummary(textWithoutSentences);
      
      expect(summary.length).toBeLessThanOrEqual(150);
      expect(summary).toContain('This is a long text');
    });

    test('should handle text with multiple paragraphs', () => {
      const multiParagraph = 'First paragraph sentence one. First paragraph sentence two.\n\nSecond paragraph sentence one. Second paragraph sentence two.';
      const summary = generateTextSummary(multiParagraph);
      
      expect(summary.length).toBeLessThanOrEqual(150);
      expect(summary).toContain('First paragraph');
    });

    test('should handle very long text', () => {
      const veryLongText = 'A'.repeat(1000) + '. ' + 'B'.repeat(1000) + '. ' + 'C'.repeat(1000) + '.';
      const summary = generateTextSummary(veryLongText);
      
      // Allow slight overflow due to sentence boundaries (max 160 to account for spacing)
      expect(summary.length).toBeLessThanOrEqual(160);
      expect(summary.length).toBeGreaterThan(0);
    });

    test('should preserve sentence structure when possible', () => {
      const text = 'This is sentence one. This is sentence two. This is sentence three.';
      const summary = generateTextSummary(text);
      
      // Should end with a period if it ends with a sentence
      expect(summary.trim().endsWith('.')).toBe(true);
    });

    test('should handle text with question marks and exclamation marks', () => {
      const text = 'What is this? This is a test! This is another sentence.';
      const summary = generateTextSummary(text);
      
      expect(summary.length).toBeLessThanOrEqual(150);
      expect(summary).toContain('What is this');
    });

    test('should handle single very long sentence', () => {
      const longSentence = 'This is a very long sentence that goes on and on without any breaks or periods until the very end.';
      const summary = generateTextSummary(longSentence);
      
      expect(summary.length).toBeLessThanOrEqual(150);
      expect(summary.length).toBeGreaterThan(0);
    });
  });
});

