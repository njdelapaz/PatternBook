# Weekly Letter Feature

## Overview

A personalized weekly newsletter suggestion that appears after users have created both demo notes. It provides a warm, conversational summary of the week's journaling activity and references the chat conversations.

## When It Appears

The weekly letter appears as the third suggestion card in the AI suggestions bar **only after both demo notes have been created**:
1. Dream library note (first voice recording)
2. Productivity note (second voice recording)

## Design

Based on the Lightpage weekly letter design shown in the reference screenshot.

### Card Display (Scrollable Bar)
- **Background**: Pink/purple gradient banner at top
- **Title**: "Hello, Nathan"
- **Subtitle**: "Weekly letter"
- **Badge**: "● Weekly letter"
- Appears in the horizontal scrollable suggestions bar alongside art and quote cards

### Full Modal Display
When tapped, expands to show:

1. **Header**
   - Purple badge: "● Weekly letter"
   - Date: "Oct 26, 2025" (aligned right)

2. **Title**
   - Large, bold: "Hello, Nathan"

3. **Gradient Banner**
   - Colorful gradient image (pink to orange)
   - Rounded corners
   - Placeholder for visual appeal

4. **Content Paragraphs**
   - Warm, conversational tone
   - References the chat conversations: "This week, we talked about..."
   - Summarizes key themes from both notes:
     - Memory and its malleability (dream note)
     - Productivity and intentionality (productivity note)
   - Includes a micro-challenge
   - Ends with a reflective question

## Content

The weekly letter content is hard-coded for the demo and includes:

**Opening**: Playful greeting acknowledging the minimal data ("Just two notes, but what notes they are")

**Summary**: References to the chat conversations about:
- The nature of memory and how it changes each time we recall it
- The relationship between productivity and worth
- The insight about quality over quantity

**Challenge**: "Notice one small thing that made you smile this week"

**Question**: "What's one thing you're curious about exploring in your life right now?"

## Implementation

### Files Modified

1. **utils/suggestions.js**
   - Added `weeklyLetter` object to SUGGESTIONS
   - Updated `getSuggestionsForNotes()` to show letter when both notes exist

2. **screens/MainScreen.js**
   - Added weekly letter card rendering in suggestions bar
   - Added weekly letter modal display
   - New styles for letter card and modal

### Key Features

- **Contextual Relevance**: References actual demo content and chat topics
- **Personalization**: Uses the name "Nathan" (can be changed)
- **Conversational Tone**: Warm, friendly, encouraging
- **Navigation**: Accessible via arrow buttons alongside other suggestions
- **Tab Indicators**: Shows position among 3 suggestions

## Styling

### Card Styles
- `suggestionLetterContent`: Container with gradient background
- `suggestionLetterGradient`: Pink gradient placeholder (120px height)
- `suggestionLetterTitle`: Title text ("Hello, Nathan")
- `suggestionLetterSubtitle`: Subtitle text ("Weekly letter")

### Modal Styles
- `suggestionModalLetter`: Main container
- `suggestionModalLetterHeader`: Top row with badge and date
- `suggestionModalLetterBadge`: Purple badge container
- `suggestionModalLetterTitle`: Large title (32px)
- `suggestionModalLetterGradientLarge`: Full-width gradient banner (200px)
- `suggestionModalLetterParagraph`: Body text paragraphs

## Demo Flow

1. Create first note (dream) → Art suggestion appears
2. Create second note (productivity) → Quote suggestion appears
3. Both notes exist → Weekly letter appears as third card
4. User can navigate between all three using arrows
5. Tab indicators show 3 dots (one for each suggestion)

## Future Enhancements

For a production version, this could be:
- Generated dynamically based on actual journal entries
- Personalized with user's real name from settings
- Sent on a weekly schedule
- Include actual insights from AI analysis of patterns in journaling
