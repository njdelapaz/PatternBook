const express = require('express');
const axios = require('axios');
const router = express.Router();

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * POST /api/openai/chat
 * Proxy for OpenAI chat completions API
 *
 * Request body should match OpenAI's API format:
 * {
 *   model: string,
 *   messages: array,
 *   temperature?: number,
 *   max_tokens?: number,
 *   ...other OpenAI options
 * }
 */
router.post('/chat', async (req, res) => {
  try {
    const { model, messages, temperature, max_tokens, ...otherOptions } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Messages array is required and must not be empty'
      });
    }

    if (!model) {
      return res.status(400).json({
        error: 'Model is required'
      });
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured in backend .env');
      return res.status(500).json({
        error: 'OpenAI API key is not configured on the server'
      });
    }

    // Log request (without full message content for privacy)
    console.log(`[OpenAI] Request: model=${model}, messages=${messages.length}, temp=${temperature}`);

    const startTime = Date.now();

    // Make request to OpenAI API
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model,
        messages,
        temperature: temperature !== undefined ? temperature : 0.7,
        max_tokens,
        ...otherOptions,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        timeout: 60000, // 60 second timeout
        validateStatus: function (status) {
          // Don't throw on any status code, we'll handle errors ourselves
          return status < 600;
        }
      }
    );

    const duration = Date.now() - startTime;

    // If OpenAI returned an error status, forward it to the client
    if (response.status !== 200) {
      console.error(`[OpenAI] Error response: ${response.status}`, response.data);
      return res.status(response.status).json(response.data);
    }

    // Success - forward the response
    const { choices, usage } = response.data;
    console.log(`[OpenAI] Success: ${duration}ms, tokens=${usage?.total_tokens || 0}`);

    res.json(response.data);

  } catch (error) {
    console.error('[OpenAI] Request failed:', error.message);

    // Handle network/timeout errors
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Request to OpenAI timed out'
      });
    }

    if (error.response) {
      // Forward error from OpenAI
      return res.status(error.response.status).json(error.response.data);
    }

    // Generic error
    res.status(500).json({
      error: error.message || 'Internal server error while calling OpenAI API'
    });
  }
});

module.exports = router;
