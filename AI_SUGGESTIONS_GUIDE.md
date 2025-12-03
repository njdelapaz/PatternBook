# AI Suggestions Feature Guide

## What Changed

Your suggestions feature is now **powered by real AI with actual artwork images**!

### Before
- ❌ Static, pre-written suggestions
- ❌ Only appeared with specific keywords ("dream" + "library")
- ❌ Not personalized to your actual notes

### After
- ✅ **Real AI-generated suggestions** using GPT-4o-mini
- ✅ **Actual artwork images** fetched from Wikipedia (free, no API key!)
- ✅ Analyzes your recent notes and suggests relevant:
  - 🎨 **Artworks** - Real famous paintings with images
  - 💬 **Quotes** - Meaningful quotes from literature/philosophy
  - ✨ **Insights** - Reflective prompts and observations
- ✅ Appears automatically when you have notes (no keywords needed)
- ✅ Cached for 24 hours (cost-efficient)
- ✅ Manual refresh button to regenerate

## How It Works

1. **When you have notes**, the app automatically generates suggestions in the background
2. **AI analyzes your notes** and suggests relevant artworks, quotes, or insights
3. **For artworks**: Fetches the actual painting image from Wikipedia
4. Shows **"Generating suggestions..."** with a loading indicator
5. Once ready, displays 1-3 personalized suggestions with images in the horizontal scroll bar
6. **Tap any suggestion** to see the full details in a modal
7. Use the **"↻ Refresh" button** to generate new suggestions

## UI Behavior

### Suggestion Cards (Horizontal Scroll)
- **Art with image**: Shows the actual artwork image
- **Art without image**: Shows 🎨 icon with text preview
- **Quote**: Shows the quote text and author
- **Insight**: Shows the insight text

### Modal View
- **Art**: Large image (if available), title, artist, museum, description
- **Quote/Insight**: Full quote/insight with author and explanation
- Navigate between suggestions with ← → buttons

## For Your Demo

### Test It
1. **Create 2-3 notes** with varied content (any content works!)
   ```
   Example 1: "Finished my workout today. Feeling energized."
   Example 2: "Been reflecting on what productivity really means."
   Example 3: "Read an interesting article about memory."
   ```

2. **Wait ~5-10 seconds** for AI to generate suggestions

3. **Suggestions appear** below the sort options

4. **Tap a suggestion** to see the full recommendation

### Demo Script

For your 2-3 minute video:

**Option 1: Skip suggestions** (safest)
- Focus on voice transcription, AI summaries, and global chat with RAG
- These are proven, fast, and impressive

**Option 2: Include suggestions** (if you have time)
1. Show the main screen with notes
2. Point out: "The app analyzes my journal and suggests related art, quotes, and insights"
3. Tap one suggestion to show the modal
4. Say: "These are AI-generated based on themes in my notes"
5. Close and continue to next feature (10-15 seconds total)

## Technical Details

### Caching
- Suggestions are cached for **24 hours**
- Reduces API costs
- Use "Refresh" button to force regenerate

### API Usage
- Uses `gpt-4o-mini` (cheap and fast)
- Temperature: 0.8 (creative)
- Max tokens: 1500
- Analyzes last 10 notes (most recent)

### Cost Estimate
- ~$0.001-0.003 per generation
- With 24hr cache, minimal impact on API costs

## Files Modified

1. **`services/suggestionService.js`** (NEW)
   - AI suggestion generation logic
   - Image fetching integration
   - Caching system
   - LLM prompt engineering

2. **`services/artworkImageService.js`** (NEW)
   - Fetches artwork images from Wikipedia
   - No API key required (completely free!)
   - Handles image attribution

3. **`utils/suggestions.js`** (UPDATED)
   - Changed from hardcoded to async AI generation
   - Fallback suggestions if AI fails

4. **`screens/MainScreen.js`** (UPDATED)
   - Async suggestion loading with useEffect
   - Loading indicator
   - Refresh button
   - Displays images from URLs
   - Preserved original UI design

5. **`services/__tests__/suggestionService.test.js`** (NEW)
   - Comprehensive test suite

## Testing

Run tests:
```bash
npm test suggestionService.test.js
```

## Troubleshooting

**Suggestions not appearing?**
- Make sure you have notes created
- Wait 5-10 seconds for generation
- Check console logs for errors
- Verify `OPENAI_API_KEY` is set in `.env`

**Still showing old behavior?**
- Reload the app completely
- Clear AsyncStorage cache
- Check that imports are correct

**API errors?**
- Check your OpenAI API key is valid
- Ensure you have API credits
- Falls back to generic suggestions if LLM fails

## Future Enhancements

Possible improvements:
- Image generation for AI-suggested artworks (DALL-E)
- Suggest related journal prompts
- Weekly summary letters (AI-generated)
- Topic tagging and patterns
- Voice-based suggestion triggers

