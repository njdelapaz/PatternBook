# PatternBook

<img width="609.6" height="406.4" alt="image" src="https://github.com/user-attachments/assets/1cdbaa1d-bc69-484c-9072-850256acdcf6" />

Many people recommend journaling if you want to write down your thoughts and sort out your mind. But weeks or months later, those notes are just there, and you’re still going in circles with no clarity about your life. Each day a blank page looks at you, and it starts to look like work. You lose the motivation to continue...

Without feedback, it’s hard to build a habit. And with thoughts fragmented across various apps, it gets even worse! We are fixing thought fragmentation through **PatternBook, a minimalist AI-powered digital journal that keeps all of your thoughts in one place and speaks back to you!** 

We took our inspiration from an app called [Lightpage](https://lightpage.com/), and our three core features include: 
1. Frictionless voice inputs
2. Instant AI insights
3. Personal AI mentor

Whenever you have a thought, you can simply click on the microphone button and brain dump whatever’s on your mind. For each note, PatternBook’s AI engine hunts down highly relevant quotes and images that relate to your state of mind. You can also chat with PatternBook as a thought partner, who has full access to all of your notes and is designed to find fresh insights and perspectives. 

## Useful Links
- [Pitch Slideshow](https://docs.google.com/presentation/d/1G8jLezFiXI1SqZROXp0PiE1R2qpIVIkM1rAPqDGEECM/edit?usp=sharing)
- [Architecture Slideshow](https://docs.google.com/presentation/d/1m_ciL9oGpyf3aY6wZdQ_JFvJQTiRCEApG6FHUIDOLPM/edit?usp=sharing)
- [Alpha Demo Slideshow](https://docs.google.com/presentation/d/1aO9phkGkuA73uGSmqE5iM7QQBTtv6DUyJA0Tn2P3RbU/edit?usp=sharing)

## Quick start

1. Requirements
   - Node.js LTS
   - Expo CLI (via `npx expo`)
   - **Option A**: Expo Go app on your phone (easiest - works for voice!)
   - **Option B**: iOS Simulator or Android emulator

2. **Setup Backend Server** (Required for AI features)

   The app now uses a secure backend server to handle API keys. See [Backend Setup](#backend-server-setup) below.

3. Install frontend dependencies
   ```bash
   npm install
   ```

4. Install native modules used for voice-to-text
   ```bash
   npx expo install expo-audio expo-file-system
   ```

5. Configure frontend environment
   - Create `.env` file in the root directory:
   ```env
   # Backend Server URL
   BACKEND_URL=http://localhost:3000
   # For Android emulator, use: http://10.0.2.2:3000
   # For physical device, use your computer's IP: http://192.168.1.X:3000
   ```

6. Run

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

## Backend Server Setup

**IMPORTANT**: The app now requires a backend server to securely handle API keys and proxy AI API calls.

### Quick Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file in the `backend/` directory:
   ```env
   OPENAI_API_KEY=sk-proj-your-key-here
   DEEPGRAM_API_KEY=your-deepgram-key-here
   PORT=3000
   NODE_ENV=development
   ```

4. Start the backend server:
   ```bash
   npm start
   # For development with auto-restart: npm run dev
   ```

5. Verify the server is running:
   ```bash
   curl http://localhost:3000/health
   ```

### Backend Architecture

The backend server provides:
- **Secure API Key Storage**: API keys are stored server-side only, never exposed to the client
- **OpenAI Proxy** (`POST /api/openai/chat`): Handles chat completions for note conversations
- **Deepgram Proxy** (`POST /api/deepgram/transcribe`): Handles voice-to-text transcription
- **Rate Limiting**: Prevents API abuse (50 requests/minute, suitable for 5 concurrent users)
- **Error Handling**: Comprehensive error messages and retry logic

### Running Backend and Frontend Together

You'll need **two terminal windows**:

**Terminal 1 - Backend Server:**
```bash
cd backend
npm start
```

**Terminal 2 - Expo App:**
```bash
# From project root
npm start
```

### Backend URL Configuration

The frontend needs to know where to find the backend server. Update the `BACKEND_URL` in your root `.env` file based on how you're testing:

| Platform | BACKEND_URL |
|----------|-------------|
| iOS Simulator | `http://localhost:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| Physical Device (same WiFi) | `http://YOUR_COMPUTER_IP:3000` |

**To find your computer's IP:**
- Windows: `ipconfig` (look for IPv4 Address)
- macOS/Linux: `ifconfig` or `ip addr` (look for inet)

For complete backend documentation, see [backend/README.md](backend/README.md).

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

**Architecture Update**: The app now uses a backend server architecture for security.

### Frontend Environment Variables (Root `.env`)
```env
# Backend Server URL - REQUIRED
BACKEND_URL=http://localhost:3000
```

### Backend Environment Variables (`backend/.env`)
```env
# API Keys - stored securely on the server
OPENAI_API_KEY=sk-proj-your-key-here
DEEPGRAM_API_KEY=your-deepgram-key-here
CLAUDE_API_KEY=your-claude-key-here  # Optional

# Server Configuration
PORT=3000
NODE_ENV=development
```

### AI Models and Services

The backend proxies requests to:
- **OpenAI** (`gpt-4o-mini`): Chat completions, note summaries, conversations
- **Deepgram** (Nova-2): Voice-to-text transcription

### Security Benefits

- **No API keys in client code**: All keys are stored in the backend `.env` file
- **Rate limiting**: Prevents abuse of your API keys
- **Centralized error handling**: Better error messages and retry logic
- **Usage tracking**: Server-side logging of API usage

### Permissions

- iOS: `NSMicrophoneUsageDescription` is set in `app.json`.
- Android: `RECORD_AUDIO` permission is declared in `app.json`.

## Testing voice-to-text

### Setup

1. **Start the backend server first** (see [Backend Server Setup](#backend-server-setup))
   ```bash
   cd backend
   npm install
   # Create backend/.env with your API keys
   npm start
   ```

2. **Configure frontend** - Create root `.env` file:
   ```env
   BACKEND_URL=http://localhost:3000
   # Adjust based on your testing platform (see table above)
   ```

3. Install frontend dependencies
   ```bash
   # From project root
   npm install
   npx expo install expo-audio expo-file-system
   ```

4. Run on your device

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

**Backend server not running**
1. Stop the backend server (Ctrl+C in backend terminal)
2. Try recording or using chat
3. ✅ Expect: Alert shows "Cannot connect to server"
4. Restart backend → retry should work

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

**Backend connection issues**
- Ensure backend server is running in a separate terminal: `cd backend && npm start`
- Check backend health: `curl http://localhost:3000/health`
- Verify `BACKEND_URL` in root `.env` matches your platform (see table in Backend Setup section)
- For physical devices: Ensure phone and computer are on the same WiFi network
- Try the backend URL in your phone's browser to test connectivity

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
# 1. Backend Setup
cd backend
npm install
echo "OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
DEEPGRAM_API_KEY=YOUR_DEEPGRAM_KEY
PORT=3000
NODE_ENV=development" > .env
npm start &  # Start in background
cd ..

# 2. Frontend Setup
echo "BACKEND_URL=http://localhost:3000" > .env
npm install
npx expo install expo-audio expo-file-system

# 3. Run on iOS
npm run ios

# 4. In the app:
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

