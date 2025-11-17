# Test Data Structure Guide

## Overview

This directory contains comprehensive test data for a user who has been using PatternBook for ~3.5 months with 100 notes.

## Files

### `test_data_notes_only.json`
**This is the file you should import into the app.**

Contains just the array of notes in the exact format the app expects:
```json
[
  {
    "id": "1723680000000",
    "title": "...",
    "content": "...",
    "createdAt": 1723680000000,
    "updatedAt": 1723680000000,
    "pinned": false,
    "summary": "...",
    "aiSummary": "..."
  },
  ...
]
```

### `test_data_comprehensive_user.json`
**Reference/documentation file only.**

Contains the full test data structure including:
- `userProfile`: User information and settings
- `notes`: Array of 100 notes (same as notes_only file)
- `deletedNotes`: Sample deleted notes
- `metadata`: Statistics about the data

## App's Note Data Structure

Based on the codebase, notes are stored as a **simple array** in AsyncStorage under the key `@patternbook_notes`.

### Required Fields:
- `id`: string (timestamp as string, e.g., `"1723680000000"`)
- `title`: string
- `content`: string
- `createdAt`: number (timestamp in milliseconds, e.g., `1723680000000`)
- `updatedAt`: number (timestamp in milliseconds)
- `pinned`: boolean

### Optional Fields:
- `summary`: string (AI-generated summary, added after note creation)
- `aiSummary`: string (cached AI summary, often same as summary)

## How to Import Test Data

### Option 1: Direct Import (Recommended)
1. Open `test_data_notes_only.json`
2. Copy the entire array
3. In your app, you can temporarily modify `utils/storage.js` to load this data, or
4. Use AsyncStorage directly to set the notes:
   ```javascript
   import AsyncStorage from '@react-native-async-storage/async-storage';
   import notesData from './test_data_notes_only.json';
   
   AsyncStorage.setItem('@patternbook_notes', JSON.stringify(notesData));
   ```

### Option 2: Programmatic Import
Create a temporary import function in your app:
```javascript
import notesData from './test_data_notes_only.json';
import { saveNotes } from './utils/storage';

// Call this once to import
saveNotes(notesData);
```

## Test Data Statistics

- **Total Notes**: 100
- **Date Range**: August 15, 2024 - November 20, 2024 (~3.5 months)
- **Pinned Notes**: 5
- **Average Notes Per Week**: ~6.25
- **Note Types**: Mix of morning pages, reflections, dreams, work notes, reading notes, etc.

## Themes Covered

The test data includes notes on:
- Productivity and intentionality
- Memory and identity
- Relationships and connection
- Personal growth and self-awareness
- Work-life balance
- Creativity and expression
- Meaning and purpose
- Presence and mindfulness
- Gratitude practice
- Dreams and subconscious

## Notes About the Data

1. **Timestamps**: All timestamps are in milliseconds (JavaScript Date.now() format)
2. **IDs**: Note IDs are string representations of timestamps
3. **Summaries**: All notes include both `summary` and `aiSummary` fields (they're identical in this test data)
4. **Realistic Content**: Notes are written to simulate a real user's journaling patterns over several months
5. **Varied Lengths**: Notes range from short thoughts to longer reflections

## AI Suggestions

**Important**: AI suggestions (art, quotes, weekly letters) are **NOT stored in the test data** - they're generated automatically by the app.

### How It Works:
- The app calls `getSuggestionsForNotes(notes)` when the main screen loads
- It scans note content for keywords:
  - Notes containing "dream" + "library" → triggers art suggestion
  - Notes containing "productivity" or "accomplish" → triggers quote suggestion
  - Both present → triggers weekly letter suggestion
- Suggestions are generated dynamically, not stored with notes

### Your Test Data:
The test data includes notes with these keywords, so suggestions will appear automatically:
- Note #2: "Dream about an endless library" → will trigger art suggestion
- Note #3: "Rethinking productivity and worth" → will trigger quote suggestion
- Both present → will trigger weekly letter

**You don't need to include suggestions in the test data** - they're generated on-the-fly based on note content.

## Important Notes

- The app stores notes as a **simple array**, not a wrapper object
- Settings are stored separately in app state (not persisted to AsyncStorage in current implementation)
- Deleted notes are stored in state only (not persisted)
- AI suggestions are generated dynamically, not stored with notes
- The `test_data_comprehensive_user.json` file is for reference only - use `test_data_notes_only.json` for actual import

