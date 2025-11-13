# Empty State Feature

## Overview

When users have no notes in the app, they now see an inviting empty state screen that encourages them to create their first note.

## What's Displayed

The empty state shows:

1. **Title**: "Brain dump about anything" - Encouraging, casual tone
2. **Example Card**: A preview card showing "Note" with placeholder text "I want to spend more time..." to give users an idea of what their notes will look like
3. **Two Action Buttons**:
   - **Dictate** (large circular button with sage green background): Opens voice recording screen
   - **Type** (large circular button with dark background): Opens text editor screen

## User Experience

### When Empty State Appears
- Shown when `notes.length === 0`
- Hidden elements when empty:
  - Search bar
  - Sort options (Recently Updated / Oldest First)
  - AI suggestions bar

### User Actions
Users can tap either button to create their first note:
- **Dictate**: Takes user to voice recording screen for hands-free note creation
- **Type**: Takes user to text editor for typing their note

## Implementation Details

**Location**: [screens/MainScreen.js:271-296](screens/MainScreen.js#L271-L296)

**Key Features**:
- Centered vertically with generous padding
- Matches app's color scheme (uses theme colors)
- Large circular buttons (140x140) for easy tapping
- Uses Carbon icons for consistency
- Responsive layout that works on different screen sizes

**Design Match**: Matches the Lightpage empty state design aesthetic shown in the reference image

## Testing the Empty State

To see the empty state:
1. Open the app
2. Go to Settings (three dots menu → Settings)
3. Scroll to "Data Management"
4. Tap "Clear All Data"
5. Confirm the action
6. You'll be returned to the main screen showing the empty state

## Files Modified

- **screens/MainScreen.js**: Added empty state UI and conditional rendering logic
- Styles added: `emptyState`, `emptyStateTitle`, `emptyStateCard`, `emptyStateCardTitle`, `emptyStateCardText`, `emptyStateButtons`, `emptyStateButton`, `emptyStateDictateButton`, `emptyStateButtonText`
