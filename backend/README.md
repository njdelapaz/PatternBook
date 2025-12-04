# PatternBook Backend Server

This is the backend server for PatternBook, a React Native note-taking app with AI features. The backend securely handles API keys and proxies requests to AI services (OpenAI and Deepgram).

## Features

- **Secure API Key Management**: API keys are stored server-side, never exposed to the client
- **OpenAI Proxy**: Handles chat completions for note chat and global chat features
- **Deepgram Proxy**: Handles voice-to-text transcription for voice notes
- **Rate Limiting**: Prevents API abuse with request rate limiting
- **CORS Support**: Configured for local development and Expo testing
- **Error Handling**: Comprehensive error handling with helpful error messages

## Prerequisites

- Node.js 16.x or higher
- npm or yarn

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (see Configuration section below)

## Configuration

### Environment Variables

Create or edit the `.env` file in the `backend/` directory with your API keys:

```env
# API Keys - Get these from your service providers
OPENAI_API_KEY=your_openai_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here  # Optional, for future use

# Server Configuration
PORT=3000
NODE_ENV=development
```

**Where to get API keys:**
- **OpenAI**: https://platform.openai.com/api-keys
- **Deepgram**: https://console.deepgram.com/
- **Claude**: https://console.anthropic.com/ (optional)

## Running the Server

### Development Mode (with auto-restart)

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when you make changes.

### Production Mode

```bash
npm start
```

### Verify Server is Running

The server should start on port 3000 (or the port specified in .env). You should see:

```
🚀 PatternBook Backend Server
================================
Environment: development
Server running on: http://localhost:3000
Health check: http://localhost:3000/health
================================
```

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "PatternBook backend server is running",
  "timestamp": "2025-12-03T..."
}
```

## API Endpoints

### Health Check
```
GET /health
```
Returns server status.

### OpenAI Chat Completions
```
POST /api/openai/chat
Content-Type: application/json

{
  "model": "gpt-4o-mini",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```

### Deepgram Transcription
```
POST /api/deepgram/transcribe
Content-Type: multipart/form-data

Form data:
- audio: <audio file> (m4a, mp3, wav, etc.)

Query parameters (optional):
- model: nova-2 (default)
- language: en-us (default)
- punctuate: true (default)
- smart_format: true (default)
```

### Check Deepgram Status
```
GET /api/deepgram/status
```
Returns whether Deepgram API key is configured.

## Rate Limiting

The server implements rate limiting to prevent abuse:
- **Limit**: 50 requests per minute per IP address
- **Scope**: Applies to all `/api/*` endpoints
- **Purpose**: Suitable for 5 concurrent users during testing/demos

If you exceed the limit, you'll receive a 429 (Too Many Requests) response.

## Connecting from the React Native App

### iOS Simulator
Use `localhost:3000` in your `.env` file:
```env
BACKEND_URL=http://localhost:3000
```

### Android Emulator
Use `10.0.2.2:3000` (Android emulator's special alias for host machine):
```env
BACKEND_URL=http://10.0.2.2:3000
```

### Physical Device (Same Network)
Find your computer's local IP address:

**Windows:**
```bash
ipconfig
# Look for "IPv4 Address" (e.g., 192.168.1.100)
```

**macOS/Linux:**
```bash
ifconfig
# Look for "inet" under your active network interface (e.g., 192.168.1.100)
```

Then use that IP in your `.env`:
```env
BACKEND_URL=http://192.168.1.100:3000
```

**Important**: Make sure your phone and computer are on the same WiFi network!

## Testing the Backend

### Test OpenAI Endpoint

```bash
curl -X POST http://localhost:3000/api/openai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hello!"}],
    "temperature": 0.7
  }'
```

### Test Deepgram Endpoint

```bash
curl -X POST http://localhost:3000/api/deepgram/transcribe \
  -F "audio=@path/to/your/audio.m4a"
```

## Troubleshooting

### Server won't start

1. **Port already in use**: Change the PORT in `.env` to a different port (e.g., 3001)
2. **Missing dependencies**: Run `npm install` again
3. **Syntax errors**: Check the console output for error messages

### API calls failing

1. **Check API keys**: Verify your `.env` file has valid API keys
2. **Check server logs**: Look at the console output for error messages
3. **Test endpoints**: Use curl to test endpoints directly
4. **CORS issues**: Ensure the frontend URL is allowed in the CORS configuration

### Can't connect from mobile device

1. **Check network**: Ensure device and computer are on the same WiFi network
2. **Check firewall**: Your computer's firewall might be blocking connections
3. **Check IP address**: Verify you're using the correct local IP address
4. **Test with curl**: Try accessing the health endpoint from your phone's browser

### Rate limiting issues during testing

If you're hitting rate limits during development, you can temporarily increase the limit in `server.js`:

```javascript
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100, // Increase this number
  // ...
});
```

## Project Structure

```
backend/
├── routes/
│   ├── openai.js      # OpenAI chat completions proxy
│   └── deepgram.js    # Deepgram transcription proxy
├── server.js          # Main Express server
├── package.json       # Dependencies and scripts
├── .env               # Environment variables (not in git)
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## Security Notes

- **Never commit .env**: The `.env` file contains sensitive API keys and should never be committed to git
- **API keys**: All API keys are stored server-side only, never exposed to the client
- **Rate limiting**: Prevents abuse of your API keys
- **CORS**: Currently set to allow all origins for development. Restrict this in production.

## Development Tips

- Use `npm run dev` for development (auto-restart on changes)
- Check server logs for debugging information
- Test endpoints with curl or Postman before testing with the mobile app
- Keep an eye on your API usage/costs in the OpenAI and Deepgram dashboards

## Production Considerations

For production deployment, consider:
- Using a process manager (PM2, systemd)
- Setting up HTTPS/SSL
- Restricting CORS to specific origins
- Implementing authentication/authorization
- Adding request logging
- Setting up monitoring and alerts
- Using a proper database for user data
- Implementing usage tracking and billing

## Support

For issues or questions, please create an issue in the project repository.
