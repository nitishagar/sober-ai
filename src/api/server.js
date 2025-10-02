require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');

// Import routes
const auditRouter = require('../../backend/src/api/routes/audit');
const auditProgressRouter = require('../../backend/src/api/routes/audit-progress');
const authRouter = require('../../backend/src/api/routes/auth');
const reportsRouter = require('../../backend/src/api/routes/reports');
const reportRouter = require('./routes/report'); // Legacy Phase 1 route
const batchRouter = require('./routes/batch');
const statusRouter = require('./routes/status');
const errorHandler = require('./middleware/error-handler');
const logger = require('../utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Load configuration
const loadConfig = () => {
  const auditsConfig = yaml.load(
    fs.readFileSync(path.join(__dirname, '../config/audits.yaml'), 'utf8')
  );
  const modelsConfig = yaml.load(
    fs.readFileSync(path.join(__dirname, '../config/models.yaml'), 'utf8')
  );

  return {
    audits: auditsConfig,
    models: modelsConfig
  };
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the UI
app.use(express.static(path.join(__dirname, '../ui/public')));

// Make config available to routes
app.use((req, res, next) => {
  try {
    req.config = loadConfig();
    next();
  } catch (error) {
    logger.error('Failed to load configuration:', error);
    res.status(500).json({
      error: 'Configuration error',
      message: 'Failed to load application configuration'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.2.0',
    database: process.env.DATABASE_URL ? 'configured' : 'not configured',
    redis: process.env.REDIS_URL ? 'configured' : 'not configured'
  });
});

// API routes - MVP routes with authentication
app.use('/api/auth', authRouter);
app.use('/api/audit', auditRouter);
app.use('/api/audit-progress', auditProgressRouter);
app.use('/api/reports', reportsRouter);

// Legacy Phase 1 routes (for backward compatibility)
app.use('/api/report', reportRouter);
app.use('/api/batch', batchRouter);
app.use('/api/status', statusRouter);

// Serve index.html for the root and any non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../ui/public/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`SoberAI Optimizer API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  logger.info(`Redis: ${process.env.REDIS_URL ? 'Connected' : 'Not configured'}`);
  logger.info(`Ollama endpoint: ${process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
