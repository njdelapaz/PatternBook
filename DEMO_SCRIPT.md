# PatternBook Demo Script

This document contains suggested user inputs for demonstrating the chat feature during your presentation.

## Setup
The app is configured with two different voice recording transcriptions and corresponding AI chat responses:

1. **First Note** (Dream Library): About an endless library in a dream
2. **Second Note** (Productivity): About rethinking productivity and worth

---

## Demo Flow

### Part 1: Create First Note (Dream Library)

1. **Record Voice Note #1**
   - Press the microphone button in the main screen or text editor
   - Wait for "recording" indicator
   - Press again to stop
   - The app will transcribe: _"I had the most interesting dream last night about wandering through an endless library..."_

2. **Chat About the Dream Note**
   - Open the note you just created
   - Tap the chat icon (speech bubble) at the bottom
   - **Type**: `What do you think this dream means?`
   - AI responds: _"That's a fascinating dream! The library of altered memories sounds like your subconscious exploring the malleability of memory. What do you think triggered this dream?"_

3. **Continue the Conversation**
   - **Type**: `I'm not sure, maybe I've been thinking about nostalgia lately`
   - AI responds: _"It's interesting how dreams can reveal our deeper thoughts about identity and truth. The fact that each book was slightly different suggests you might be processing how perspective shapes our past."_

4. **Third Message (Optional)**
   - **Type**: `That makes sense`
   - AI responds: _"This reminds me of the concept of 'memory reconsolidation' - each time we recall something, we actually change it slightly. Your dream seems to be grappling with that very idea."_

---

### Part 2: Create Second Note (Productivity)

1. **Record Voice Note #2**
   - Press microphone button again
   - Wait for recording
   - Press to stop
   - The app will transcribe: _"Today I realized something important about my relationship with productivity..."_

2. **Chat About the Productivity Note**
   - Open the note
   - Tap the chat icon
   - **Type**: `How can I actually make this change?`
   - AI responds: _"That's a really mature insight about productivity culture. What do you think would help you shift from quantity to quality in practice?"_

3. **Continue the Conversation**
   - **Type**: `Maybe I should focus on one thing at a time`
   - AI responds: _"It sounds like you're recognizing the difference between being busy and being purposeful. Have you thought about what 'intentional' looks like for you specifically?"_

4. **Third Message (Optional)**
   - **Type**: `I think it means choosing projects that align with my values`
   - AI responds: _"This is such an important realization. Measuring worth by accomplishments can be exhausting. What would it look like to measure your worth differently?"_

---

## Tips for Presenting

- **Don't rush**: Let the AI "typing" animation play out (1 second delay)
- **Natural pacing**: Pause between messages as if you're thinking
- **Emphasize the flow**: Show how the chat feels conversational and contextual
- **Show variety**: The responses cycle through 3 different canned responses per note type
- **Keep it simple**: You don't need to send all messages - just enough to show the feature

---

## Technical Notes

- Chat responses are **stubbed** - they don't actually use OpenAI
- The system detects whether you're chatting about the "dream" note or "productivity" note based on keywords
- Responses cycle: 1st message → response 1, 2nd message → response 2, 3rd message → response 3, 4th message → response 1 (repeats)
- Each note has its own set of 3 canned responses

---

## Fallback Messages (If You Forget)

If you forget what to type, here are simple fallback messages that work for any note:

- `tell me more`
- `what do you think?`
- `that's interesting`
- `can you elaborate?`
- `I see`

The AI will respond appropriately based on which note you're viewing.
