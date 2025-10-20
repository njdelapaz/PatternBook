# Lightpage (PatternBook) — MVP

A minimalist, AI-assisted journaling app built with Expo (React Native). Capture thoughts with text (and soon voice), keep them locally, and get quick AI summaries.

## Quick start

1. Requirements
   - Node.js LTS
   - Expo CLI (via `npx expo`)
   - **Option A**: Expo Go app on your phone (easiest - works for voice!)
   - **Option B**: iOS Simulator or Android emulator

2. Install deps
   ```bash
   npm install
   ```

3. Install native modules used for voice-to-text
   ```bash
   npx expo install expo-audio expo-file-system
   ```

4. Configure environment
   - Copy `env-example.txt` to `.env` and set your key
   ```
   OPENAI_API_KEY=sk-...
   ```

5. Run

   **Option A: Expo Go (recommended - fastest)**
   ```bash
   npm start
   # Scan QR code with Expo Go app on your phone
   # Works on iOS/Android - voice recording included!
   ```

   **Option B: Simulator/Emulator**
   ```bash
   npm run ios      # iOS Simulator
   npm run android  # Android Emulator
   ```

   **Option C: Web (limited - no voice)**
   ```bash
   npm run web
   # Voice recording not supported on web
   ```

## Current capabilities

- Local notes stored in AsyncStorage (fully offline storage)
- Create, view, edit notes with auto-save and undo/redo
- Search notes by title or content
- Pin, delete, and restore from Recently Deleted
- Dark/Light theme toggle
- Per-note "AI Summary" using OpenAI (modal view)
 - Voice-to-text (press/hold mic): records audio and transcribes via OpenAI Whisper

## Roadmap to MVP

1) Stabilize project setup
- Verify Expo SDK 54 + RN 0.81 work on your device; upgrade only if needed
- Keep `.env` out of VCS; confirm `react-native-dotenv` works

2) Voice-to-text (MVP)
- Implement mic button to record with `expo-av`
- Send audio to OpenAI Whisper for transcription; append to note
- Gate with an in-app toggle; fall back to OS dictation if disabled

3) Spaces (timelines)
- Add `space` to note model; UI switcher (General, Work, Personal)
- Filter list by current space; allow creating spaces

4) Weekly/global summary
- Add action to summarize last 7 days or all notes into a letter
- Show in modal and optionally save as a note

5) Export to Markdown
- Use `expo-file-system` and `expo-sharing` to export notes as .md

6) Privacy and data controls
- Settings page copy: local storage, on-demand AI calls only
- "Clear all data" button to wipe AsyncStorage

## Env and API

- The app uses `OPENAI_API_KEY` from `.env` (see `babel.config.js` for dotenv config)
- Summary model: `gpt-4o-mini` (tweak temperature/max tokens as needed)
 - Transcription: `whisper-1` via `/v1/audio/transcriptions`

### Transcription providers and fallback

You can choose a provider and a fallback in case of quota issues:

```
# Default is openai
TRANSCRIBE_PROVIDER=openai

# Keys (set what you use)
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=dg_...
```

Behavior:
- If `TRANSCRIBE_PROVIDER=openai`: the app tries OpenAI first; on quota errors, it will try Deepgram if `DEEPGRAM_API_KEY` is set.
- If `TRANSCRIBE_PROVIDER=deepgram`: the app tries Deepgram first; if it fails and `OPENAI_API_KEY` is set, it falls back to OpenAI.

### Permissions

- iOS: `NSMicrophoneUsageDescription` is set in `app.json`.
- Android: `RECORD_AUDIO` permission is declared in `app.json`.

## Testing voice-to-text

### Setup
1. Create `.env` file with your OpenAI key
   ```
   OPENAI_API_KEY=sk-proj-...
   ```

2. Install dependencies
   ```bash
   npm install
   npx expo install expo-audio expo-file-system
   ```

3. Run on your device

   **Easiest: Expo Go app** (no build required)
   ```bash
   npm start
   # 1. Install "Expo Go" from App Store/Play Store
   # 2. Scan the QR code
   # 3. App loads with voice recording working!
   ```

   **Alternative: Simulator/Emulator**
   ```bash
   npm run ios     # iOS simulator
   npm run android # Android emulator
   ```

   Note: Voice recording **does not work on web** in this MVP.

### Manual test cases

**Basic voice capture**
1. Open or create a note
2. Press and **hold** the microphone button (bottom bar, middle)
3. Speak clearly: "This is a test of voice to text"
4. Release the button
5. ✅ Expect: Spinner appears → transcribed text appends to note

**Permission prompt (first run)**
1. Fresh install or reset permissions
2. Press mic button
3. ✅ Expect: iOS/Android permission dialog appears
4. Grant permission
5. Try recording again → should work

**Empty/short recording**
1. Press and immediately release mic (< 0.5 sec)
2. ✅ Expect: No error; empty or very short text returned

**Long recording**
1. Record 30+ seconds of speech
2. ✅ Expect: Full transcription appears (may take a few seconds)

**Network failure**
1. Enable airplane mode
2. Try recording
3. ✅ Expect: Alert shows "Failed to transcribe recording"
4. Disable airplane mode → retry should work

**Missing API key**
1. Remove `OPENAI_API_KEY` from `.env`
2. Restart app (`r` in metro, or rebuild)
3. Try recording
4. ✅ Expect: Alert "Missing OPENAI_API_KEY. Set it in .env..."

**Recording state UI**
1. Press and hold mic
2. ✅ Expect: Mic button background turns red while recording
3. Release
4. ✅ Expect: Spinner replaces mic icon while transcribing
5. ✅ Expect: Button returns to normal after transcription

**Multi-line insertion**
1. Type some text in a note, press Enter a few times
2. Record voice
3. ✅ Expect: Transcription appends after existing content with a newline separator

### Troubleshooting

**"Microphone permission is required"**
- iOS: Go to Settings → Privacy & Security → Microphone → Enable for Expo Go or your app
- Android: Go to Settings → Apps → Expo/PatternBook → Permissions → Microphone → Allow

**"Failed to start recording"**
- Check that `app.json` has the mic permission strings (already added)
- Ensure no other recording is active (the app now properly cleans up)
- Rebuild: `npx expo run:ios` or `npx expo run:android` (not just Expo Go refresh)
- Check Expo/RN logs for AudioModule errors

**Transcription returns empty**
- Speak louder or closer to the mic
- Try a longer recording (2-3 seconds minimum)
- Check that audio file was created (logs show URI)

**Build errors for expo-audio or expo-file-system**
- Run: `npx expo install --check` to align versions with SDK 54
- Clear: `rm -rf node_modules && npm install`
- Restart metro: `npx expo start -c`

**Web shows "not supported" alert**
- Expected behavior; use iOS/Android for voice features
- Fallback: use the keyboard mic (built into mobile OS keyboards)

### Quick smoke test script

```bash
# 1. Setup
echo "OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE" > .env
npm install
npx expo install expo-audio expo-file-system

# 2. Run on iOS
npm run ios

# 3. In the app:
# - Create a note
# - Press/hold mic, say "Testing one two three"
# - Release and verify text appears
# - Tap chat icon to get AI summary
# - Verify summary modal shows
```

## Notes

- SVG icons are imported via `react-native-svg` + transformer
- If you hit build issues, clear cache and restart metro
- Voice recording requires a physical device or simulator with mic access (not web)
- Expo SDK 54: `expo-av` shows a deprecation warning. We use it for stability in Expo Go; planned migration to `expo-audio` is straightforward if needed.

