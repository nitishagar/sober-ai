require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');

// Import routes
const auditProgressRouter = require('./routes/audit-progress');
const mvpAuditRouter = require('./routes/audit-mvp');
const reportsRouter = require('./routes/reports');

// Phase 1 routes (legacy, backward compatibility)
const auditRouter = require('./routes/audit');
const reportRouter = require('./routes/report');
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

// Serve React build output (production/Electron) or legacy UI
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
const legacyUIPath = path.join(__dirname, '../ui/public');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
} else if (fs.existsSync(legacyUIPath)) {
  app.use(express.static(legacyUIPath));
}

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
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.3.0',
    services: {
      database: process.env.DATABASE_URL ? 'connected' : 'not configured',
      ollama: process.env.OLLAMA_ENDPOINT ? 'connected' : 'not configured'
    }
  });
});

// API routes
app.use('/api/audit-progress', auditProgressRouter);
app.use('/api/mvp/audit', mvpAuditRouter);
app.use('/api/reports', reportsRouter);

// Legacy routes (backward compatibility)
app.use('/api/audit', auditRouter);
app.use('/api/report', reportRouter);
app.use('/api/batch', batchRouter);
app.use('/api/status', statusRouter);

// Serve index.html for the root and any non-API routes (SPA fallback)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    // Try React build first, then legacy UI
    const indexPath = fs.existsSync(path.join(frontendDistPath, 'index.html'))
      ? path.join(frontendDistPath, 'index.html')
      : path.join(legacyUIPath, 'index.html');
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Only start listening when run directly (not imported by Electron)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    logger.info(`SoberAI Optimizer API server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
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
}

module.exports = app;
