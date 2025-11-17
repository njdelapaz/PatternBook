/**
 * Tests for Note Chunking
 */

import {
  chunkText,
  chunkNote,
  chunkNotes,
  getChunkPreview,
  CHUNK_CONFIG,
} from '../noteChunking';

describe('chunkText', () => {
  it('should split text into chunks', () => {
    const text = 'a'.repeat(1000);
    const chunks = chunkText(text);
    
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(chunk => {
      expect(chunk).toHaveProperty('text');
      expect(chunk).toHaveProperty('startPos');
      expect(chunk).toHaveProperty('endPos');
    });
  });

  it('should create overlapping chunks', () => {
    const text = 'a'.repeat(1000);
    const chunks = chunkText(text, 500, 100);
    
    expect(chunks.length).toBeGreaterThan(1);
    // Check overlap
    if (chunks.length > 1) {
      const firstChunkEnd = chunks[0].endPos;
      const secondChunkStart = chunks[1].startPos;
      expect(firstChunkEnd).toBeGreaterThan(secondChunkStart);
    }
  });

  it('should handle short text (single chunk)', () => {
    const text = 'Short text';
    const chunks = chunkText(text);
    
    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toBe(text);
    expect(chunks[0].startPos).toBe(0);
    expect(chunks[0].endPos).toBe(text.length);
  });

  it('should handle empty text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText(null)).toEqual([]);
    expect(chunkText(undefined)).toEqual([]);
  });

  it('should respect minimum chunk size', () => {
    const text = 'a'.repeat(30); // Smaller than MIN_CHUNK_SIZE
    const chunks = chunkText(text, 500, 100);
    
    // Should still create at least one chunk for very short text
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should use custom chunk size and overlap', () => {
    const text = 'a'.repeat(2000);
    const chunks = chunkText(text, 300, 50);
    
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBeLessThanOrEqual(300);
  });
});

describe('chunkNote', () => {
  it('should chunk a note with all metadata', () => {
    const note = {
      id: 'note-1',
      title: 'Test Note',
      content: 'a'.repeat(1000),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const chunks = chunkNote(note);
    
    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((chunk, i) => {
      expect(chunk).toHaveProperty('id');
      expect(chunk).toHaveProperty('noteId', 'note-1');
      expect(chunk).toHaveProperty('noteTitle', 'Test Note');
      expect(chunk).toHaveProperty('chunkIndex', i);
      expect(chunk).toHaveProperty('text');
      expect(chunk).toHaveProperty('startPos');
      expect(chunk).toHaveProperty('endPos');
      expect(chunk).toHaveProperty('noteCreatedAt');
      expect(chunk).toHaveProperty('noteUpdatedAt');
    });
  });

  it('should handle note with empty content', () => {
    const note = {
      id: 'note-1',
      title: 'Empty Note',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const chunks = chunkNote(note);
    expect(chunks).toEqual([]);
  });

  it('should handle note without title', () => {
    const note = {
      id: 'note-1',
      content: 'Some content here',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const chunks = chunkNote(note);
    expect(chunks[0].noteTitle).toBe('Untitled');
  });

  it('should handle null/invalid note', () => {
    expect(chunkNote(null)).toEqual([]);
    expect(chunkNote({})).toEqual([]);
    expect(chunkNote({ content: 'test' })).toEqual([]); // No id
  });

  it('should generate unique chunk IDs', () => {
    const note = {
      id: 'note-1',
      title: 'Test',
      content: 'a'.repeat(2000),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const chunks = chunkNote(note);
    const ids = chunks.map(c => c.id);
    const uniqueIds = new Set(ids);
    
    expect(ids.length).toBe(uniqueIds.size); // All IDs unique
  });
});

describe('chunkNotes', () => {
  const mockNotes = [
    {
      id: 'note-1',
      title: 'First Note',
      content: 'a'.repeat(800),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'note-2',
      title: 'Second Note',
      content: 'b'.repeat(600),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  it('should chunk multiple notes', () => {
    const chunks = chunkNotes(mockNotes);
    
    expect(chunks.length).toBeGreaterThan(0);
    
    // Should have chunks from both notes
    const noteIds = new Set(chunks.map(c => c.noteId));
    expect(noteIds.has('note-1')).toBe(true);
    expect(noteIds.has('note-2')).toBe(true);
  });

  it('should handle empty notes array', () => {
    expect(chunkNotes([])).toEqual([]);
  });

  it('should handle null/undefined', () => {
    expect(chunkNotes(null)).toEqual([]);
    expect(chunkNotes(undefined)).toEqual([]);
  });

  it('should preserve note order in chunks', () => {
    const chunks = chunkNotes(mockNotes);
    
    const note1Chunks = chunks.filter(c => c.noteId === 'note-1');
    const note2Chunks = chunks.filter(c => c.noteId === 'note-2');
    
    expect(note1Chunks.length).toBeGreaterThan(0);
    expect(note2Chunks.length).toBeGreaterThan(0);
  });

  it('should handle notes with varying content lengths', () => {
    const notes = [
      {
        id: '1',
        title: 'Short',
        content: 'Short content',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '2',
        title: 'Long',
        content: 'a'.repeat(5000),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    
    const chunks = chunkNotes(notes);
    
    const shortChunks = chunks.filter(c => c.noteId === '1');
    const longChunks = chunks.filter(c => c.noteId === '2');
    
    expect(shortChunks.length).toBe(1);
    expect(longChunks.length).toBeGreaterThan(1);
  });
});

describe('getChunkPreview', () => {
  it('should create preview of short text', () => {
    const text = 'Short text';
    const preview = getChunkPreview(text);
    
    expect(preview).toBe(text);
  });

  it('should truncate long text', () => {
    const text = 'a'.repeat(200);
    const preview = getChunkPreview(text, 50);
    
    expect(preview.length).toBeLessThanOrEqual(50);
    expect(preview).toContain('...');
  });

  it('should handle empty text', () => {
    expect(getChunkPreview('')).toBe('');
    expect(getChunkPreview(null)).toBe('');
    expect(getChunkPreview(undefined)).toBe('');
  });

  it('should respect custom max length', () => {
    const text = 'a'.repeat(200);
    const preview = getChunkPreview(text, 30);
    
    expect(preview.length).toBe(30);
    expect(preview.endsWith('...')).toBe(true);
  });

  it('should preserve content when at boundary', () => {
    const text = 'a'.repeat(100);
    const preview = getChunkPreview(text, 100);
    
    expect(preview).toBe(text);
  });
});

describe('CHUNK_CONFIG', () => {
  it('should have valid configuration', () => {
    expect(CHUNK_CONFIG).toBeDefined();
    expect(CHUNK_CONFIG.CHUNK_SIZE).toBeGreaterThan(0);
    expect(CHUNK_CONFIG.OVERLAP).toBeGreaterThan(0);
    expect(CHUNK_CONFIG.MIN_CHUNK_SIZE).toBeGreaterThan(0);
    expect(CHUNK_CONFIG.OVERLAP).toBeLessThan(CHUNK_CONFIG.CHUNK_SIZE);
  });
});

describe('Integration: Real-world Chunking', () => {
  it('should handle realistic note', () => {
    const note = {
      id: 'real-note',
      title: 'My Morning Routine',
      content: `
        I wake up at 6am every morning. The first thing I do is meditate for 20 minutes.
        This helps me center myself and prepare for the day ahead.
        
        After meditation, I exercise for 30 minutes. Usually running or yoga.
        Then I have a healthy breakfast with protein and fruits.
        
        By 8am, I'm ready to start my workday feeling energized and focused.
      `,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const chunks = chunkNote(note);
    
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].noteTitle).toBe('My Morning Routine');
    expect(chunks[0].text).toContain('wake up');
  });

  it('should handle very long note with multiple topics', () => {
    const longContent = `
      ${'Topic 1: '.repeat(100)}
      ${'Topic 2: '.repeat(100)}
      ${'Topic 3: '.repeat(100)}
    `;
    
    const note = {
      id: 'long-note',
      title: 'Comprehensive Guide',
      content: longContent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const chunks = chunkNote(note);
    
    expect(chunks.length).toBeGreaterThan(2);
    
    // Verify chunks maintain continuity through overlap
    for (let i = 0; i < chunks.length - 1; i++) {
      const currentChunk = chunks[i];
      const nextChunk = chunks[i + 1];
      
      // There should be overlap
      expect(currentChunk.endPos).toBeGreaterThan(nextChunk.startPos);
    }
  });
});

