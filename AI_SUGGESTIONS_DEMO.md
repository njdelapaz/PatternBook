# AI Suggestions Feature - Demo Guide

## Overview

The app now includes a horizontal scrollable bar of AI suggestions at the top of the notes list. These suggestions are contextually relevant to the demo notes you've created.

## How It Works

### Suggestion Types

1. **Art Suggestion** - Appears after the first demo note (dream about library)
   - Shows artwork: "Turtle in a Lotus Pond"
   - Displays as an image card with badge
   - Contextually related to dream/contemplation themes

2. **Quote Suggestion** - Appears after the second demo note (productivity)
   - Winston Churchill quote: "If you're going through hell, keep going."
   - Displays as a text card with badge
   - Contextually related to perseverance/productivity themes

### User Interaction

1. **Scrollable Bar**: The suggestions appear as a horizontal scrollable row at the top of the notes list, below the sort options.

2. **Tap to Expand**: When you tap on any suggestion card, it opens in a full-screen modal with:
   - **For Art**: Full artwork image, title, artist name, museum location, badge, and description
   - **For Quote**: Large formatted quote text, author attribution, badge, and description

3. **Close Modal**: Tap the X button in the top right to close the expanded view and return to the notes list.

4. **Bottom Navigation** (Stubbed): The modal includes bottom navigation buttons (Chat, more options, arrows) that are visual placeholders for the demo.

## Demo Flow

### Step 1: Create First Note
1. Use voice recording to create the dream library note
2. Note will automatically get titled "Dream about an endless library"
3. After creating this note, the **art suggestion card** will appear in the scrollable bar

### Step 2: View Art Suggestion
1. Scroll the suggestions bar (if needed)
2. Tap on the artwork card showing the turtle image
3. Full artwork details will expand in a modal
4. Review the artwork information and description
5. Close the modal

### Step 3: Create Second Note
1. Use voice recording again to create the productivity note
2. Note will automatically get titled "Rethinking productivity and worth"
3. After creating this note, the **quote suggestion card** will also appear

### Step 4: View Quote Suggestion
1. Scroll the suggestions bar to see both cards
2. Tap on the quote card
3. Full quote view will expand in a modal
4. Review the quote and description
5. Close the modal

## Required Asset

**Important**: You need to add the artwork image for the demo to work properly.

**File needed**: `turtle-lotus.jpg`
**Location**: `assets/suggestions/turtle-lotus.jpg`

See [assets/suggestions/IMAGE_INSTRUCTIONS.md](assets/suggestions/IMAGE_INSTRUCTIONS.md) for details on the image requirements.

## Technical Notes

- Suggestions are generated based on note content keywords
- The system detects "dream" + "library" for art suggestions
- The system detects "productivity" + "accomplish" for quote suggestions
- All data is hard-coded for demo purposes
- The suggestions bar only appears when there are relevant suggestions to show
