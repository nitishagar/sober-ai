require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');

// Import routes
const auditProgressRouter = require('./routes/audit-progress');
const reportsRouter = require('./routes/reports');
const settingsRouter = require('./routes/settings');

// Phase 1 routes (legacy, backward compatibility)
const auditRouter = require('./routes/audit');
const reportRouter = require('./routes/report');
const batchRouter = require('./routes/batch');
const statusRouter = require('./routes/status');
const errorHandler = require('./middleware/error-handler');
const { ownerTokenMiddleware } = require('./middleware/owner-token');
const logger = require('../utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Ollama health cache — avoids pinging on every /api/health poll
let ollamaStatusCache = { status: 'unknown', checkedAt: 0 };

async function checkOllama() {
  const now = Date.now();
  if (now - ollamaStatusCache.checkedAt < 10000) return ollamaStatusCache.status;
  const endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${endpoint}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    ollamaStatusCache = { status: res.ok ? 'connected' : 'unreachable', checkedAt: now };
  } catch (_) {
    ollamaStatusCache = { status: 'unreachable', checkedAt: now };
  }
  return ollamaStatusCache.status;
}

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
// CORS allowlist (invariant J): when CORS_ORIGIN is set (comma-separated), restrict to
// those origins for a split-origin cloud deployment. Unset → wildcard (preserves the
// current permissive behavior for local/Electron same-origin dev).
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : undefined;
app.use(cors({ origin: corsOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve React build output (production/Electron). The legacy static UI has been
// removed; when frontend/dist is absent, non-API routes are answered with a
// deliberate message by the SPA fallback below (no 500).
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
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

// Issue / read an ephemeral owner token for per-browser report isolation (invariant G).
// Mounted before routes so req.ownerToken is available everywhere.
app.use(ownerTokenMiddleware);

// Health check endpoint — performs a real Ollama ping with 10s result cache
app.get('/api/health', async (req, res) => {
  const ollamaStatus = await checkOllama();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.3.0',
    services: {
      database: process.env.DATABASE_URL ? 'connected' : 'not configured',
      ollama: ollamaStatus
    }
  });
});

// API routes
app.use('/api/audit-progress', auditProgressRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

// Legacy routes (backward compatibility)
app.use('/api/audit', auditRouter);
app.use('/api/report', reportRouter);
app.use('/api/batch', batchRouter);
app.use('/api/status', statusRouter);

// Serve index.html for the root and any non-API routes (SPA fallback).
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  // frontend/dist absent (e.g. source checkout without a build): return a deliberate,
  // informative response instead of sendFile on a non-existent path (which throws a 500).
  return res.status(404).send(
    'Frontend build not found — run `cd frontend && npm run build`'
  );
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
