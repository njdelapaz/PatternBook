require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Import routes
const openaiRoutes = require('./routes/openai');
const deepgramRoutes = require('./routes/deepgram');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for local development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' })); // For large audio files in base64
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global rate limiter - generous limit for demo purposes
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Allow 100 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'PatternBook backend server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/openai', openaiRoutes);
app.use('/api/deepgram', deepgramRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Get local network IP addresses
function getLocalIP() {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const addresses = [];

  for (const interfaceName in networkInterfaces) {
    for (const iface of networkInterfaces[interfaceName]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  return addresses;
}

// Start server on all network interfaces (0.0.0.0)
app.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIP();

  console.log(`\n🚀 PatternBook Backend Server`);
  console.log(`================================`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\nLocal Access:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`\nNetwork Access:`);
  localIPs.forEach(ip => {
    console.log(`  http://${ip}:${PORT}`);
  });
  console.log(`\nHealth Check:`);
  console.log(`  http://localhost:${PORT}/health`);
  console.log(`================================\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
