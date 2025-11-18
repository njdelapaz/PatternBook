# RAG System Testing Guide

## Overview

Comprehensive testing suite for the Retrieval-Augmented Generation (RAG) chat system. Tests cover unit tests, integration tests, and end-to-end scenarios.

## Test Structure

```
services/__tests__/
  └── noteRetrievalService.test.js    - TF-IDF retrieval engine tests

utils/__tests__/
  ├── chatStorage.test.js             - Chat history persistence tests
  ├── contextBuilder.test.js          - LLM context building tests  
  ├── tokenEstimator.test.js          - Token counting/truncation tests
  └── noteChunking.test.js            - Note splitting tests

__tests__/
  └── ragIntegration.test.js          - End-to-end integration tests
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Retrieval service
npm test -- services/__tests__/noteRetrievalService.test.js

# Chat storage
npm test -- utils/__tests__/chatStorage.test.js

# Context builder
npm test -- utils/__tests__/contextBuilder.test.js

# Token estimator
npm test -- utils/__tests__/tokenEstimator.test.js

# Note chunking
npm test -- utils/__tests__/noteChunking.test.js

# Integration tests
npm test -- __tests__/ragIntegration.test.js
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

## Test Coverage

### 1. Note Retrieval Service Tests (200+ assertions)

**File**: `services/__tests__/noteRetrievalService.test.js`

Tests the TF-IDF search engine that finds relevant notes:

- ✅ **Tokenization**: Lowercase, stopword removal, punctuation handling
- ✅ **Term Frequency**: Normalized TF calculation
- ✅ **Inverse Document Frequency**: IDF calculation across documents
- ✅ **Index Building**: Creating searchable index from notes
- ✅ **Retrieval**: Finding relevant chunks by score
- ✅ **Ranking**: Sorting results by relevance
- ✅ **Filtering**: Minimum score thresholds, top-k limiting
- ✅ **Exclusion**: Excluding specific notes from results
- ✅ **Edge Cases**: Empty queries, no matches, null inputs

**Key Test Scenarios**:
```javascript
// Should find morning routine notes
const results = retriever.retrieve('morning wake up exercise');
expect(results[0].noteTitle).toBe('Morning Routine');

// Should exclude specified notes
const results = retriever.retrieve('productivity', { 
  excludeNoteId: 'note-1' 
});
expect(results.every(r => r.noteId !== 'note-1')).toBe(true);
```

### 2. Chat Storage Tests (80+ assertions)

**File**: `utils/__tests__/chatStorage.test.js`

Tests persistence of chat histories:

- ✅ **Load/Save**: Reading and writing chat histories
- ✅ **Per-Note**: Separate history for each note
- ✅ **Global Chat**: Separate global conversation
- ✅ **Append Messages**: Adding new messages to history
- ✅ **Clear History**: Removing chat data
- ✅ **Pruning**: Auto-truncating old messages
- ✅ **Statistics**: Getting storage stats
- ✅ **Error Handling**: Graceful failure on storage errors

**Key Test Scenarios**:
```javascript
// Should persist and load chat history
await saveChatHistory('note-1', messages);
const loaded = await loadChatHistory('note-1');
expect(loaded).toEqual(messages);

// Should prune old messages
await pruneOldMessages('note-1', 50);
expect(history.length).toBeLessThanOrEqual(50);
```

### 3. Context Builder Tests (60+ assertions)

**File**: `utils/__tests__/contextBuilder.test.js`

Tests building LLM prompts with retrieved context:

- ✅ **System Prompts**: Creating context-aware system messages
- ✅ **Retrieved Notes**: Embedding note chunks in prompts
- ✅ **Chat History**: Including previous conversation
- ✅ **Token Management**: Staying within budget limits
- ✅ **Truncation**: Handling oversized contexts
- ✅ **Metadata**: Providing stats about context
- ✅ **Note Chat**: Building note-specific contexts
- ✅ **Global Chat**: Building global chat contexts

**Key Test Scenarios**:
```javascript
// Should build complete context
const context = buildGlobalChatContext(
  userMessage,
  chatHistory,
  retrievedChunks
);
expect(context.messages[0].role).toBe('system');
expect(context.messages[0].content).toContain('relevant notes');

// Should truncate if over budget
const longHistory = createLongHistory(100);
const context = buildChatContext({ userMessage, chatHistory: longHistory });
expect(context.metadata.historyTruncated).toBe(true);
```

### 4. Token Estimator Tests (50+ assertions)

**File**: `utils/__tests__/tokenEstimator.test.js`

Tests token counting and management:

- ✅ **Token Estimation**: ~4 chars = 1 token approximation
- ✅ **Message Tokens**: Counting tokens in message arrays
- ✅ **Text Truncation**: Cutting text to fit budgets
- ✅ **Message Truncation**: Keeping first + recent messages
- ✅ **Budget Constants**: Validating configuration
- ✅ **Edge Cases**: Empty strings, null values

**Key Test Scenarios**:
```javascript
// Should estimate tokens accurately
const tokens = estimateTokens('Hello world');
expect(tokens).toBe(Math.ceil('Hello world'.length / 4));

// Should truncate messages within budget
const truncated = truncateMessages(longMessages, 100);
expect(estimateMessagesTokens(truncated)).toBeLessThanOrEqual(100);
expect(truncated[0].role).toBe('system'); // Keeps first message
```

### 5. Note Chunking Tests (50+ assertions)

**File**: `utils/__tests__/noteChunking.test.js`

Tests splitting notes into searchable chunks:

- ✅ **Text Chunking**: Splitting by character count
- ✅ **Overlap**: Creating overlapping chunks
- ✅ **Metadata**: Preserving note information
- ✅ **Short Notes**: Handling notes under chunk size
- ✅ **Long Notes**: Splitting large notes efficiently
- ✅ **Preview**: Creating chunk previews
- ✅ **Batch Processing**: Chunking multiple notes

**Key Test Scenarios**:
```javascript
// Should create overlapping chunks
const chunks = chunkText(longText, 500, 100);
expect(chunks[0].endPos).toBeGreaterThan(chunks[1].startPos);

// Should preserve metadata
const chunks = chunkNote(note);
expect(chunks[0].noteId).toBe(note.id);
expect(chunks[0].noteTitle).toBe(note.title);
```

### 6. Integration Tests (100+ assertions)

**File**: `__tests__/ragIntegration.test.js`

Tests complete RAG workflows end-to-end:

- ✅ **Global Chat Flow**: Complete pipeline for global chat
- ✅ **Note Chat Flow**: Complete pipeline for per-note chat
- ✅ **Retrieval + Context**: Combining retrieval with context building
- ✅ **Chat History**: Persisting and loading conversations
- ✅ **Cross-Note References**: Finding connections between notes
- ✅ **Performance**: Handling 100+ notes efficiently
- ✅ **Scalability**: Long notes, many chunks
- ✅ **Edge Cases**: No matches, empty notes, short queries

**Key Test Scenarios**:
```javascript
// End-to-end: Query → Retrieve → Build Context → Ready for LLM
const userQuery = 'What time should I wake up?';

// 1. Retrieve
const chunks = retrievalService.retrieve(userQuery);

// 2. Build context
const context = buildGlobalChatContext(userQuery, [], chunks);

// 3. Verify
expect(context.messages[0].content).toContain('6am');
expect(context.messages[0].content).toContain('Morning Routine');

// 4. Save history
await saveChatHistory('global', [...history, userMessage, aiResponse]);
```

## Manual Testing Scenarios

### Scenario 1: First-Time Chat
```
1. Open app with 5-10 existing notes
2. Tap chat icon (global chat)
3. Ask: "What have I been writing about?"
4. ✅ Should retrieve relevant note chunks
5. ✅ Should show referenced notes
6. ✅ Should persist conversation
```

### Scenario 2: Per-Note Chat with Cross-References
```
1. Open a note about "Morning Routine"
2. Tap chat icon in note editor
3. Ask: "Are there other routines in my notes?"
4. ✅ Should find Evening Routine note
5. ✅ Should NOT include current note in retrieval
6. ✅ Should show "Referenced: Evening Routine"
```

### Scenario 3: Chat History Persistence
```
1. Have a conversation in global chat (3-5 exchanges)
2. Close the app completely
3. Reopen app and go to global chat
4. ✅ Previous conversation should be loaded
5. Send new message
6. ✅ Should maintain context from previous messages
```

### Scenario 4: No Matching Notes
```
1. Open global chat
2. Ask about topic not in any notes: "quantum physics"
3. ✅ Should still respond (no crash)
4. ✅ Should work even with 0 retrieved chunks
5. ✅ System prompt should handle empty context
```

### Scenario 5: Many Notes Performance
```
1. Create 50+ notes with various content
2. Ask: "Tell me about my habits"
3. ✅ Should index quickly (< 1 second)
4. ✅ Should retrieve quickly (< 100ms)
5. ✅ Should show top 5 most relevant chunks
```

## Expected Test Results

### Coverage Goals
- **Retrieval Service**: 95%+ coverage
- **Chat Storage**: 90%+ coverage
- **Context Builder**: 90%+ coverage
- **Token Estimator**: 95%+ coverage
- **Note Chunking**: 95%+ coverage
- **Integration**: 85%+ coverage

### Performance Benchmarks
- Index 100 notes: < 1 second
- Query retrieval: < 100ms
- Context building: < 50ms
- Storage operations: < 100ms

## Debugging Failed Tests

### Common Issues

**1. AsyncStorage Mock Issues**
```javascript
// Make sure mock is properly configured
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

**2. Retrieval Not Finding Notes**
```javascript
// Ensure notes are indexed before querying
retrievalService.indexNotes(mockNotes);

// Check if notes have content
expect(mockNotes[0].content).toBeTruthy();

// Verify index was built
const stats = retrievalService.getStats();
expect(stats.indexed).toBe(true);
```

**3. Token Budget Exceeded**
```javascript
// Check total tokens
const budget = checkTokenBudget(messages);
console.log('Token usage:', budget);

// Truncate if needed
if (!budget.isWithinBudget) {
  messages = truncateMessages(messages, TOKEN_BUDGETS.TOTAL_INPUT);
}
```

## Adding New Tests

### Template for New Test Suite
```javascript
import { functionToTest } from '../path/to/module';

describe('Module Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('functionToTest', () => {
    it('should handle normal case', () => {
      const result = functionToTest(input);
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      const result = functionToTest(edgeInput);
      expect(result).toBeDefined();
    });

    it('should handle error case', () => {
      expect(() => functionToTest(badInput)).toThrow();
    });
  });
});
```

## Continuous Integration

Add to CI pipeline:
```yaml
# .github/workflows/test.yml
- name: Run RAG Tests
  run: |
    npm test -- __tests__/ragIntegration.test.js
    npm test -- services/__tests__/noteRetrievalService.test.js
    npm test -- utils/__tests__/
```

## Conclusion

The RAG testing suite provides comprehensive coverage of:
- ✅ Individual component functionality
- ✅ Integration between components
- ✅ End-to-end user workflows
- ✅ Performance and scalability
- ✅ Edge cases and error handling

Run tests regularly during development to catch regressions early!

