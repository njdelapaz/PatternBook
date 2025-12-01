/**
 * Tests for Note Retrieval Service (RAG)
 */

import retrievalService, { KeywordRetriever, tokenize, calculateTermFrequency, calculateIDF } from '../noteRetrievalService';
import { chunkNotes } from '../../utils/noteChunking';

describe('tokenize', () => {
  it('should tokenize text into lowercase words', () => {
    const text = 'Hello World! This is a TEST.';
    const tokens = tokenize(text);
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
    expect(tokens).toContain('test');
  });

  it('should remove stopwords', () => {
    const text = 'The cat is on the mat';
    const tokens = tokenize(text);
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('is');
    expect(tokens).not.toContain('on');
    expect(tokens).toContain('cat');
    expect(tokens).toContain('mat');
  });

  it('should handle empty string', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(null)).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
  });

  it('should remove punctuation', () => {
    const text = 'Hello, world! How are you?';
    const tokens = tokenize(text);
    expect(tokens).not.toContain(',');
    expect(tokens).not.toContain('!');
    expect(tokens).not.toContain('?');
  });
});

describe('calculateTermFrequency', () => {
  it('should calculate normalized term frequency', () => {
    const tokens = ['cat', 'dog', 'cat', 'bird'];
    const tf = calculateTermFrequency(tokens);
    
    expect(tf.cat).toBe(0.5); // 2/4
    expect(tf.dog).toBe(0.25); // 1/4
    expect(tf.bird).toBe(0.25); // 1/4
  });

  it('should handle empty tokens', () => {
    const tf = calculateTermFrequency([]);
    expect(tf).toEqual({});
  });

  it('should handle single token', () => {
    const tf = calculateTermFrequency(['hello']);
    expect(tf.hello).toBe(1);
  });
});

describe('calculateIDF', () => {
  it('should calculate inverse document frequency', () => {
    const chunks = [
      { tokens: ['cat', 'dog'] },
      { tokens: ['cat', 'bird'] },
      { tokens: ['dog', 'fish'] },
    ];
    
    const idf = calculateIDF(chunks);
    
    // cat appears in 2/3 docs: log(3/2) = 0.405
    expect(idf.cat).toBeCloseTo(0.405, 2);
    
    // dog appears in 2/3 docs: log(3/2) = 0.405
    expect(idf.dog).toBeCloseTo(0.405, 2);
    
    // bird appears in 1/3 docs: log(3/1) = 1.099
    expect(idf.bird).toBeCloseTo(1.099, 2);
    
    // fish appears in 1/3 docs: log(3/1) = 1.099
    expect(idf.fish).toBeCloseTo(1.099, 2);
  });

  it('should handle empty chunks', () => {
    const idf = calculateIDF([]);
    expect(idf).toEqual({});
  });
});

describe('KeywordRetriever', () => {
  const mockNotes = [
    {
      id: 'note-1',
      title: 'Morning Routine',
      content: 'I wake up at 6am every morning. First thing I do is meditate for 20 minutes. Then I exercise and have a healthy breakfast.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'note-2',
      title: 'Productivity Tips',
      content: 'Focus on one task at a time. Avoid multitasking. Take regular breaks every 25 minutes using the Pomodoro technique.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'note-3',
      title: 'Goals 2024',
      content: 'Want to build better habits. Wake up earlier. Exercise more consistently. Read one book per month.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  let retriever;

  beforeEach(() => {
    retriever = new KeywordRetriever();
    retriever.buildIndex(mockNotes);
  });

  describe('buildIndex', () => {
    it('should build index from notes', () => {
      const stats = retriever.getStats();
      expect(stats.indexed).toBe(true);
      expect(stats.noteCount).toBe(3);
      expect(stats.chunkCount).toBeGreaterThan(0);
    });

    it('should handle empty notes', () => {
      const emptyRetriever = new KeywordRetriever();
      emptyRetriever.buildIndex([]);
      const stats = emptyRetriever.getStats();
      expect(stats.noteCount).toBe(0);
      expect(stats.chunkCount).toBe(0);
    });

    it('should handle notes with empty content', () => {
      const notesWithEmpty = [
        { id: '1', title: 'Test', content: '', createdAt: Date.now(), updatedAt: Date.now() },
      ];
      const emptyRetriever = new KeywordRetriever();
      emptyRetriever.buildIndex(notesWithEmpty);
      const stats = emptyRetriever.getStats();
      expect(stats.noteCount).toBe(1);
    });
  });

  describe('retrieve', () => {
    it('should retrieve relevant chunks for query', () => {
      const results = retriever.retrieve('morning routine wake up', 3);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('noteId');
      expect(results[0]).toHaveProperty('noteTitle');
      expect(results[0]).toHaveProperty('score');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should return chunks sorted by score (descending)', () => {
      const results = retriever.retrieve('morning wake exercise', 5);
      
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should limit results to topK', () => {
      const results = retriever.retrieve('wake morning exercise habits', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should filter by minimum score', () => {
      const results = retriever.retrieve('xyzabc123nonsense', 10, 0.1);
      expect(results.length).toBe(0); // No results should match
    });

    it('should return empty array for empty query', () => {
      const results = retriever.retrieve('', 5);
      expect(results).toEqual([]);
    });

    it('should return empty array when not indexed', () => {
      const newRetriever = new KeywordRetriever();
      const results = newRetriever.retrieve('test', 5);
      expect(results).toEqual([]);
    });

    it('should find relevant chunks for productivity query', () => {
      const results = retriever.retrieve('productivity focus task', 3);
      
      expect(results.length).toBeGreaterThan(0);
      const hasProductivityNote = results.some(r => r.noteId === 'note-2');
      expect(hasProductivityNote).toBe(true);
    });

    it('should find relevant chunks for habits query', () => {
      const results = retriever.retrieve('habits goals exercise', 3);
      
      expect(results.length).toBeGreaterThan(0);
      const hasGoalsNote = results.some(r => r.noteId === 'note-3');
      expect(hasGoalsNote).toBe(true);
    });

    it('should prioritize newer notes via recency weighting', () => {
      const now = Date.now();
      const recencyNotes = [
        {
          id: 'recent-note',
          title: 'Productivity Focus',
          content: 'Focus on productivity with single-tasking.',
          createdAt: now - 2 * 24 * 60 * 60 * 1000,
          updatedAt: now,
        },
        {
          id: 'older-note',
          title: 'Productivity Focus',
          content: 'Focus on productivity with single-tasking.',
          createdAt: now - 30 * 24 * 60 * 60 * 1000,
          updatedAt: now - 30 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'unrelated-note',
          title: 'Gardening Tips',
          content: 'Completely different topic about gardening and plants.',
          createdAt: now,
          updatedAt: now,
        },
      ];

      const recencyRetriever = new KeywordRetriever();
      recencyRetriever.buildIndex(recencyNotes);

      const results = recencyRetriever.retrieve('productivity focus single tasking', 3, 0);

      const recentResult = results.find(r => r.noteId === 'recent-note');
      const olderResult = results.find(r => r.noteId === 'older-note');

      expect(recentResult).toBeDefined();
      expect(olderResult).toBeDefined();
      expect(recentResult.score).toBeGreaterThan(olderResult.score);
      expect(recentResult.recencyWeight).toBeGreaterThan(olderResult.recencyWeight);
      expect(recentResult.baseScore).toBeCloseTo(olderResult.baseScore, 5);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const stats = retriever.getStats();
      expect(stats).toHaveProperty('noteCount');
      expect(stats).toHaveProperty('chunkCount');
      expect(stats).toHaveProperty('indexed');
      expect(typeof stats.noteCount).toBe('number');
      expect(typeof stats.chunkCount).toBe('number');
      expect(typeof stats.indexed).toBe('boolean');
    });
  });
});

describe('RetrievalService (singleton)', () => {
  const mockNotes = [
    {
      id: 'note-1',
      title: 'Test Note',
      content: 'This is a test note about productivity and habits.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    retrievalService.indexNotes(mockNotes);
  });

  it('should index notes', () => {
    const stats = retrievalService.getStats();
    expect(stats.indexed).toBe(true);
    expect(stats.noteCount).toBe(1);
  });

  it('should retrieve relevant chunks', () => {
    const results = retrievalService.retrieve('productivity habits', { topK: 3 });
    expect(Array.isArray(results)).toBe(true);
  });

  it('should exclude notes by ID', () => {
    const results = retrievalService.retrieve('productivity', {
      topK: 5,
      excludeNoteId: 'note-1',
    });
    
    const hasExcludedNote = results.some(r => r.noteId === 'note-1');
    expect(hasExcludedNote).toBe(false);
  });

  it('should check if ready', () => {
    expect(retrievalService.isReady()).toBe(true);
    
    const newService = new (require('../noteRetrievalService').default.constructor)();
    expect(newService.isReady()).toBe(false);
  });

  it('should handle empty notes array', () => {
    retrievalService.indexNotes([]);
    const stats = retrievalService.getStats();
    expect(stats.noteCount).toBe(0);
  });

  it('should handle null notes', () => {
    retrievalService.indexNotes(null);
    const stats = retrievalService.getStats();
    expect(stats.noteCount).toBe(0);
  });
});

describe('Integration: Full Retrieval Flow', () => {
  const comprehensiveNotes = [
    {
      id: 'note-1',
      title: 'Morning Routine',
      content: 'Wake up at 6am. Meditate for 20 minutes. Exercise for 30 minutes. Healthy breakfast with protein and fruits.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'note-2',
      title: 'Evening Routine',
      content: 'Wind down at 9pm. Read a book for 30 minutes. No screens after 10pm. Sleep by 10:30pm.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'note-3',
      title: 'Productivity System',
      content: 'Use Pomodoro technique. 25 minutes focused work. 5 minute break. Review progress daily.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'note-4',
      title: 'Fitness Goals',
      content: 'Run 3 times per week. Strength training twice per week. Yoga on rest days. Track progress monthly.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    retrievalService.indexNotes(comprehensiveNotes);
  });

  it('should find morning-related notes', () => {
    const results = retrievalService.retrieve('morning routine wake up', { topK: 5 });
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].noteTitle).toBe('Morning Routine');
  });

  it('should find productivity-related notes', () => {
    const results = retrievalService.retrieve('productivity work focus', { topK: 5 });
    
    expect(results.length).toBeGreaterThan(0);
    const hasProductivity = results.some(r => r.noteTitle === 'Productivity System');
    expect(hasProductivity).toBe(true);
  });

  it('should find exercise-related notes from multiple sources', () => {
    const results = retrievalService.retrieve('exercise fitness workout', { topK: 5 });
    
    expect(results.length).toBeGreaterThan(0);
    // Should find both Morning Routine (exercise) and Fitness Goals
    const noteIds = [...new Set(results.map(r => r.noteId))];
    expect(noteIds.length).toBeGreaterThan(1);
  });

  it('should handle queries with no matches', () => {
    const results = retrievalService.retrieve('quantum physics thermodynamics', { topK: 5, minScore: 0.1 });
    expect(results.length).toBe(0);
  });

  it('should return results with all required metadata', () => {
    const results = retrievalService.retrieve('morning', { topK: 3 });
    
    expect(results.length).toBeGreaterThan(0);
    results.forEach(result => {
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('noteId');
      expect(result).toHaveProperty('noteTitle');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('chunkIndex');
    });
  });
});

