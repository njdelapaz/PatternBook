const express = require('express');
const axios = require('axios');
const multer = require('multer');
const router = express.Router();

// Configure multer for in-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (Deepgram's limit)
  }
});

const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';

/**
 * POST /api/deepgram/transcribe
 * Proxy for Deepgram speech-to-text API
 *
 * Expects multipart/form-data with 'audio' file field
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided. Please upload an audio file.'
      });
    }

    // Check if API key is configured
    if (!process.env.DEEPGRAM_API_KEY) {
      console.error('DEEPGRAM_API_KEY not configured in backend .env');
      return res.status(500).json({
        error: 'Deepgram API key is not configured on the server'
      });
    }

    console.log(`[Deepgram] Transcription request: ${req.file.originalname} (${req.file.size} bytes)`);

    const startTime = Date.now();

    // Prepare query parameters (can be sent from client or use defaults)
    const params = {
      model: req.query.model || 'nova-2',
      language: req.query.language || 'en-us',
      punctuate: req.query.punctuate !== 'false',
      smart_format: req.query.smart_format !== 'false',
      diarize: req.query.diarize === 'true',
      filler_words: req.query.filler_words === 'true',
      multichannel: req.query.multichannel === 'true',
    };

    // Make request to Deepgram API
    const response = await axios.post(
      DEEPGRAM_API_URL,
      req.file.buffer, // Send the file buffer directly
      {
        headers: {
          'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
          'Content-Type': req.file.mimetype || 'audio/m4a',
        },
        params: params,
        timeout: 60000, // 60 second timeout
        validateStatus: function (status) {
          return status < 600;
        }
      }
    );

    const duration = Date.now() - startTime;

    // If Deepgram returned an error status, forward it to the client
    if (response.status !== 200) {
      console.error(`[Deepgram] Error response: ${response.status}`, response.data);
      return res.status(response.status).json(response.data);
    }

    // Success - extract and return transcription
    const results = response.data?.results;

    if (!results || !results.channels || results.channels.length === 0) {
      return res.status(500).json({
        error: 'No transcription results returned from Deepgram'
      });
    }

    const alternatives = results.channels[0]?.alternatives;
    if (!alternatives || alternatives.length === 0) {
      return res.status(500).json({
        error: 'No transcription alternatives found'
      });
    }

    const transcript = alternatives[0]?.transcript;
    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({
        error: 'Empty transcription returned. Please try speaking more clearly.'
      });
    }

    console.log(`[Deepgram] Success: ${duration}ms, transcript length=${transcript.length}`);

    // Return the full Deepgram response
    res.json(response.data);

  } catch (error) {
    console.error('[Deepgram] Request failed:', error.message);

    // Handle specific error types
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Request to Deepgram timed out'
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'Audio file is too large. Maximum size is 25MB.'
      });
    }

    if (error.response) {
      // Forward error from Deepgram
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;

      let errorMessage;
      switch (status) {
        case 401:
          errorMessage = 'Invalid Deepgram API key';
          break;
        case 402:
          errorMessage = 'Deepgram account has insufficient credits';
          break;
        case 413:
          errorMessage = 'Audio file is too large';
          break;
        case 429:
          errorMessage = 'Too many requests to Deepgram';
          break;
        default:
          errorMessage = message;
      }

      return res.status(status).json({
        error: errorMessage,
        details: error.response.data
      });
    }

    // Generic error
    res.status(500).json({
      error: error.message || 'Internal server error while calling Deepgram API'
    });
  }
});

/**
 * GET /api/deepgram/status
 * Check if Deepgram is configured
 */
router.get('/status', (req, res) => {
  res.json({
    configured: Boolean(process.env.DEEPGRAM_API_KEY)
  });
});

module.exports = router;
