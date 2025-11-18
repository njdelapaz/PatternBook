# Import Test Notes - Count Selection Feature

## Update Summary

The test notes import feature now prompts the user to specify how many notes they want to import, rather than importing all notes automatically.

## New Flow

### Previous Flow
```
User taps button → Confirmation dialog → Import ALL notes
```

### New Flow
```
User taps button → Enter count modal → Confirmation dialog → Import specified count
```

## Visual Walkthrough

### Step 1: Tap Import Button

```
┌─────────────────────────────────────┐
│ Settings                            │
│                                     │
│ Data Management                     │
│                                     │
│ Import test notes for RAG testing  │
│                                     │
│ ┌─────────────────────────────────┐│
│ │  📥 Import Test Notes           ││
│ └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

### Step 2: Enter Number of Notes (NEW!)

```
┌─────────────────────────────────────┐
│                                     │
│   ┌───────────────────────────┐   │
│   │  Import Test Notes         │   │
│   │                            │   │
│   │  How many notes would you  │   │
│   │  like to import? (Max: 100)│  │
│   │                            │   │
│   │  ┌───────────────────────┐│   │
│   │  │        10             ││   │
│   │  └───────────────────────┘│   │
│   │  Enter number (e.g., 10)  │   │
│   │                            │   │
│   │  [Cancel]      [Import]   │   │
│   └───────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Features**:
- Default value: 10
- Number pad keyboard
- Max 3 digits (100 max)
- Auto-focus on input
- Validates input before proceeding

### Step 3: Confirmation Dialog

```
┌─────────────────────────────────────┐
│  Import Test Notes                  │
│                                     │
│  This will import 10 test notes     │
│  from test_data_notes_only.json.    │
│  Each note will be processed with   │
│  title generation. This may take    │
│  a few minutes.                     │
│                                     │
│     [Cancel]         [Import]       │
└─────────────────────────────────────┘
```

### Step 4: Importing

```
┌─────────────────────────────────────┐
│ Data Management                     │
│                                     │
│ ⏳ Importing 5/10                   │
│                                     │
└─────────────────────────────────────┘
```

### Step 5: Success

```
┌─────────────────────────────────────┐
│  Success                            │
│                                     │
│  Successfully imported 10 test      │
│  notes!                             │
│                                     │
│              [OK]                   │
└─────────────────────────────────────┘
```

## Input Validation

### Valid Inputs
- ✅ Numbers 1-100
- ✅ Leading zeros (e.g., "010" becomes 10)
- ✅ Defaults to 10 if field is empty

### Invalid Inputs
- ❌ Zero or negative numbers
- ❌ Non-numeric characters
- ❌ Numbers > 100
- ❌ Empty field

### Error Messages

**Invalid Number**:
```
┌─────────────────────────────────────┐
│  Invalid Number                     │
│                                     │
│  Please enter a valid number        │
│  greater than 0                     │
│                                     │
│              [OK]                   │
└─────────────────────────────────────┘
```

**Too Many**:
```
┌─────────────────────────────────────┐
│  Too Many                           │
│                                     │
│  Maximum 100 notes can be           │
│  imported at once                   │
│                                     │
│              [OK]                   │
└─────────────────────────────────────┘
```

## Implementation Details

### State Management

```javascript
const [showImportInput, setShowImportInput] = useState(false);
const [importCount, setImportCount] = useState('10');
```

### Flow Control

```javascript
// Step 1: Show input modal
const handleImportTestNotes = async () => {
  setShowImportInput(true);
};

// Step 2: Validate and confirm
const confirmImport = async () => {
  const count = parseInt(importCount, 10);
  
  // Validation
  if (isNaN(count) || count <= 0) {
    Alert.alert('Invalid Number', '...');
    return;
  }
  
  if (count > 100) {
    Alert.alert('Too Many', '...');
    return;
  }
  
  // Hide modal and show confirmation
  setShowImportInput(false);
  
  Alert.alert('Import Test Notes', `Import ${count} notes?`, [
    { text: 'Cancel' },
    { text: 'Import', onPress: () => startImport(count) }
  ]);
};
```

### Import Function

```javascript
// App.js
const handleImportTestNotes = async (count, onProgress) => {
  const testData = require('./test_data_notes_only.json');
  const notesToImport = Math.min(count, testData.length);
  
  for (let i = 0; i < notesToImport; i++) {
    // Process note...
    onProgress(i + 1, notesToImport);
  }
  
  return { success: true, count: notesToImport };
};
```

## UI Components

### Modal Overlay

- Semi-transparent black background (50% opacity)
- Dismissible by tapping outside or back button
- Keyboard-aware (adjusts position when keyboard appears)

### Modal Content

- 85% screen width
- Rounded corners (16px)
- Card background with theme support
- Shadow/elevation for depth

### Input Field

- Center-aligned text
- Large font (18px)
- Bold weight for visibility
- Number pad keyboard
- Max 3 characters

### Buttons

- Cancel: Gray background, theme text color
- Import: Accent color background, black text
- Equal width (flex: 1)
- 12px gap between buttons

## Styling

```javascript
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContent: {
  width: '85%',
  borderRadius: 16,
  padding: 24,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5,
},
modalInput: {
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 18,
  marginBottom: 24,
  textAlign: 'center',
  fontWeight: '600',
},
```

## Use Cases

### Quick Testing (1-10 notes)
```
Scenario: Test basic RAG functionality
Input: 5 notes
Time: ~15-20 seconds
Use: Quick verification
```

### Medium Testing (10-30 notes)
```
Scenario: Test retrieval quality
Input: 20 notes
Time: ~1 minute
Use: Balanced testing
```

### Full Testing (50-100 notes)
```
Scenario: Performance testing
Input: 100 notes
Time: ~5-7 minutes
Use: Comprehensive testing
```

## Benefits

### User Control
- ✅ Choose exact number needed
- ✅ Avoid importing unnecessary notes
- ✅ Faster testing cycles

### Time Savings
- ⚡ Import 5 notes in ~20 seconds vs 7 minutes for all
- ⚡ Iterate faster during development
- ⚡ Reduce API costs (fewer title generations)

### Flexibility
- 🎯 Test with different dataset sizes
- 🎯 Incremental testing (add 10, test, add 10 more, etc.)
- 🎯 Adapt to specific test scenarios

## Edge Cases

### Available Notes Less Than Requested
```javascript
const notesToImport = Math.min(count, testData.length);
// If user requests 200 but only 100 exist, imports 100
```

### Cancellation
- Cancel at input modal → No action taken
- Cancel at confirmation → No action taken
- Cannot cancel during import (by design)

### Invalid Input After Modal Dismissed
- Modal reopens with previous value
- Value persists across modal open/close
- Resets to '10' on app restart

## Testing Tips

### Recommended Counts

**Development**:
- Start with 5 notes
- Test global chat with simple queries
- Verify titles are generated correctly

**Feature Testing**:
- Use 20-30 notes
- Test search, filtering, RAG retrieval
- Check performance

**Stress Testing**:
- Import 100 notes
- Test with complex queries
- Monitor memory and performance

### Troubleshooting

**Modal doesn't appear**:
- Check `showImportInput` state
- Verify button `onPress` is calling `handleImportTestNotes`

**Import button disabled**:
- Check `isImporting` state
- Ensure previous import completed

**Invalid number error persists**:
- Clear input field
- Enter new valid number
- Check console for parsing errors

## Summary

The updated import feature provides:
- 📥 **User-specified count** (1-100 notes)
- 🎯 **Better control** over testing data
- ⚡ **Faster iteration** with smaller datasets
- ✅ **Input validation** for safety
- 🎨 **Clean modal UI** with theme support

Perfect for flexible, efficient RAG testing! 🚀

