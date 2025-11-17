/**
 * UI Test Data Fixtures
 * Mock data for testing React Native screen components
 */

// Mock notes data
export const mockNotes = [
  {
    id: '1',
    title: 'Test Note 1',
    content: 'This is the first test note with some content.',
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now() - 86400000,
    pinned: false,
    summary: 'Test summary 1',
    aiSummary: 'AI generated summary 1'
  },
  {
    id: '2',
    title: 'Pinned Note',
    content: 'This is a pinned note that should appear first.',
    createdAt: Date.now() - 172800000, // 2 days ago
    updatedAt: Date.now() - 172800000,
    pinned: true,
    summary: 'Pinned summary',
    aiSummary: 'AI generated summary for pinned note'
  },
  {
    id: '3',
    title: 'Recent Note',
    content: 'This is a recent note created today.',
    createdAt: Date.now() - 3600000, // 1 hour ago
    updatedAt: Date.now() - 3600000,
    pinned: false,
    summary: 'Recent summary',
    aiSummary: 'AI generated summary for recent note'
  },
  {
    id: '4',
    title: 'Long Content Note',
    content: 'This is a note with very long content that should be truncated in the preview. '.repeat(10),
    createdAt: Date.now() - 259200000, // 3 days ago
    updatedAt: Date.now() - 259200000,
    pinned: false,
    summary: 'Long content summary',
    aiSummary: 'AI generated summary for long content note'
  }
];

export const mockEmptyNotes = [];

export const mockSingleNote = [mockNotes[0]];

export const mockPinnedNotes = mockNotes.filter(note => note.pinned);

// Mock note for editing
export const mockNoteForEdit = {
  id: 'edit-1',
  title: 'Note to Edit',
  content: 'Original content that will be edited',
  createdAt: Date.now() - 7200000,
  updatedAt: Date.now() - 7200000,
  pinned: false
};

// Mock deleted notes
export const mockDeletedNotes = [
  {
    id: 'deleted-1',
    title: 'Deleted Note 1',
    content: 'This note was deleted',
    createdAt: Date.now() - 604800000, // 1 week ago
    updatedAt: Date.now() - 604800000,
    deletedAt: Date.now() - 86400000, // Deleted 1 day ago
    pinned: false
  },
  {
    id: 'deleted-2',
    title: 'Deleted Note 2',
    content: 'Another deleted note',
    createdAt: Date.now() - 1209600000, // 2 weeks ago
    updatedAt: Date.now() - 1209600000,
    deletedAt: Date.now() - 172800000, // Deleted 2 days ago
    pinned: false
  }
];

// Mock suggestions data
export const mockSuggestions = [
  {
    type: 'art',
    title: 'The Library',
    subtitle: '1526',
    artist: 'Giuseppe Arcimboldo',
    museum: 'Skokloster Castle, Sweden',
    badge: 'Picked for you',
    description: 'Test art suggestion description',
    image: require('../../assets/suggestions/library-art.jpg'),
    imageAlt: 'Test image alt text'
  },
  {
    type: 'quote',
    title: 'Test Quote',
    author: 'Test Author',
    badge: 'Picked for you',
    description: 'Test quote description',
    imageAlt: 'Test quote alt text'
  }
];

// Mock chat messages
export const mockChatMessages = [
  {
    role: 'user',
    content: 'What do you think about this note?'
  },
  {
    role: 'assistant',
    content: 'This is a thoughtful reflection. Let me help you explore it further.'
  }
];

// Mock transcription result
export const mockTranscription = 'This is a test transcription from voice recording.';

// Mock settings
export const mockSettings = {
  profile: {
    name: 'Test User'
  },
  notifications: {
    weeklyLetter: false,
    dailyReminder: false,
    reminderTime: '09:00'
  }
};

