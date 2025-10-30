# AI Suggestions Feature - Demo Guide

## Overview

The app now includes a horizontal scrollable bar of AI suggestions at the top of the notes list. These suggestions are contextually relevant to the demo notes you've created.

## How It Works

### Suggestion Types

1. **Art Suggestion** - Appears after the first demo note (dream about library)
   - Shows artwork: Giuseppe Arcimboldo's "The Librarian" (1526)
   - A surreal portrait composed entirely of books
   - Displays as an image card with badge
   - Directly relates to the dream about an endless library where memories and books are intertwined

2. **Quote Suggestion** - Appears after the second demo note (productivity)
   - Henry David Thoreau quote: "It is not enough to be busy. So are the ants. The question is: What are we busy about?"
   - Displays as a text card with badge
   - Directly addresses the note's theme about intentionality over busyness

3. **Weekly Letter** - Appears after both demo notes are created
   - Personalized greeting: "Hello, Nathan"
   - Features a colorful gradient banner
   - Includes a warm, conversational summary of the week's journaling
   - References the chat conversations about memory and productivity
   - Ends with a micro-challenge and reflective question
   - Badge labeled "Weekly letter"

### User Interaction

1. **Scrollable Bar**: The suggestions appear as a horizontal scrollable row at the top of the notes list, below the sort options.

2. **Tap to Expand**: When you tap on any suggestion card, it opens in a full-screen modal with:
   - **Tab Indicators**: Small horizontal bars at the top show which suggestion is currently displayed (active tab is white, inactive tabs are dimmed)
   - **For Art**: Full artwork image, title, artist name, museum location, badge, and description
   - **For Quote**: Large formatted quote text, author attribution, badge, and description

3. **Navigate Between Suggestions**:
   - Use the left arrow (←) button to go to the previous suggestion
   - Use the right arrow (→) button to go to the next suggestion
   - Arrows are disabled (dimmed) when at the first or last suggestion
   - Tab indicators update to show current position

4. **Close Modal**: Tap the X button in the top right to close the expanded view and return to the notes list.

5. **Bottom Navigation**: The modal includes bottom navigation buttons:
   - **Chat button**: Stubbed for demo
   - **More options (⋯)**: Stubbed for demo
   - **← and → arrows**: Functional navigation between suggestions

## Demo Flow

### Step 1: Create First Note
1. Use voice recording to create the dream library note
2. Note will automatically get titled "Dream about an endless library"
3. After creating this note, the **art suggestion card** will appear in the scrollable bar

### Step 2: View Art Suggestion
1. Scroll the suggestions bar (if needed)
2. Tap on the artwork card showing the turtle image
3. Full artwork details will expand in a modal
4. Notice the tab indicators at the top (only one tab since there's only one suggestion)
5. Review the artwork information and description
6. Close the modal

### Step 3: Create Second Note
1. Use voice recording again to create the productivity note
2. Note will automatically get titled "Rethinking productivity and worth"
3. After creating this note, the **quote suggestion card** will also appear

### Step 4: Navigate Between All Three Suggestions
1. After creating both notes, you should now see three suggestion cards in the scrollable bar
2. Tap on any suggestion card to open it in full-screen
3. Notice the three tab indicators at the top showing your position
4. Use the right arrow (→) button at the bottom to navigate through all suggestions:
   - Art (The Librarian)
   - Quote (Thoreau on busyness)
   - Weekly Letter (personalized summary)
5. Use the left arrow (←) button to go back through the suggestions
6. Watch the tab indicators update as you navigate
7. The arrows will be dimmed when you can't go further in that direction
8. The weekly letter includes:
   - A greeting with the user's name (Nathan)
   - A colorful gradient banner
   - References to the chat conversations ("we talked about...")
   - A micro-challenge for the week
   - A reflective question
9. Close the modal when done

## Required Asset

**Important**: You need to add the artwork image for the demo to work properly.

**File needed**: `library-art.jpg`
**Location**: `assets/suggestions/library-art.jpg`
**Artwork**: Giuseppe Arcimboldo's "The Librarian" (1526)

See [assets/suggestions/IMAGE_INSTRUCTIONS.md](assets/suggestions/IMAGE_INSTRUCTIONS.md) for details on where to find this image and specifications.

## Technical Notes

- Suggestions are generated based on note content keywords
- The system detects "dream" + "library" for art suggestions
- The system detects "productivity" + "accomplish" for quote suggestions
- All data is hard-coded for demo purposes
- The suggestions bar only appears when there are relevant suggestions to show
