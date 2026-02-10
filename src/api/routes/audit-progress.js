const express = require('express');
const { authenticate, checkUsageLimit } = require('../middleware/auth');
const Auditor = require('../../core/auditor');
const reportService = require('../../services/reportService');
const authService = require('../../services/authService');
const { EventEmitter } = require('events');

const router = express.Router();

// Store active audit sessions
const activeSessions = new Map();

// Cleanup old sessions every 5 minutes
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const sessionTimestamps = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, timestamp] of sessionTimestamps.entries()) {
    if (now - timestamp > SESSION_TIMEOUT) {
      activeSessions.delete(sessionId);
      sessionTimestamps.delete(sessionId);
      console.log(`[API] Cleaned up expired session: ${sessionId}`);
    }
  }
}, 60000); // Check every minute

/**
 * POST /api/audit-progress
 * Start an audit with SSE progress updates
 */
router.post('/', authenticate, checkUsageLimit, async (req, res) => {
  const { url } = req.body;
  const userId = req.user.id;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`[API] Starting audit with progress for: ${url} (user: ${req.user.email})`);

  // Create unique session ID
  const sessionId = `${userId}-${Date.now()}`;

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Create event emitter for this session
  const progressEmitter = new EventEmitter();
  activeSessions.set(sessionId, progressEmitter);
  sessionTimestamps.set(sessionId, Date.now());

  // Send progress updates to client
  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Listen to progress events
  progressEmitter.on('progress', sendProgress);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`[API] Client disconnected from audit progress: ${sessionId}`);
    activeSessions.delete(sessionId);
  });

  try {
    // Send initial progress
    sendProgress({
      status: 'started',
      message: 'Initializing audit...',
      progress: 0
    });

    // Create auditor with config from request
    const auditor = new Auditor(req.config);

    const totalPhases = 4; // Gathering, Audits, Scoring, LLM
    const emitPhaseProgress = (phase, message, subProgress = null) => {
      let progress;
      if (phase === 4 && subProgress !== null) {
        const phaseStart = Math.floor((3 / totalPhases) * 100); // 75%
        const phaseEnd = 100;
        progress = phaseStart + Math.floor((subProgress / 100) * (phaseEnd - phaseStart));
      } else {
        progress = Math.floor((phase / totalPhases) * 100);
      }

      sendProgress({
        status: 'processing',
        phase,
        message,
        progress
      });
    };

    // Map audit names to human-readable labels
    const getAuditLabel = (auditName) => {
      const labels = {
        ssrReadiness: 'SSR Readiness',
        schemaCoverage: 'Schema Coverage',
        semanticStructure: 'Semantic Structure',
        contentExtractability: 'Content Quality'
      };
      return labels[auditName] || auditName;
    };

    const auditTokenCounts = {};
    let currentAudit = null;

    const onPhase = (phase, message) => {
      emitPhaseProgress(phase, message);
    };

    const onStep = (event) => {
      if (event && event.message) {
        emitPhaseProgress(event.phase || 1, event.message);
      }
    };

    const onLLMToken = (auditName) => {
      if (currentAudit !== auditName) {
        currentAudit = auditName;
        auditTokenCounts[auditName] = 0;
      }

      auditTokenCounts[auditName]++;
      const tokenCount = auditTokenCounts[auditName];

      if (tokenCount % 10 === 0) {
        const estimatedProgress = Math.min(95, (tokenCount / 900) * 100);
        const recNumber = Math.min(3, Math.floor(tokenCount / 300) + 1);
        const auditLabel = getAuditLabel(auditName);
        emitPhaseProgress(4, `Analyzing ${auditLabel}... (${recNumber}/3 recommendations)`, estimatedProgress);
      }
    };

    const auditResult = await auditor.audit(url, { onPhase, onStep, onLLMToken });

    // Save report to database
    const report = await reportService.createReport(userId, auditResult);

    // Update user usage
    await authService.incrementAuditCount(userId);

    console.log(`[API] Audit completed, report ID: ${report.id}`);

    // Send completion
    sendProgress({
      status: 'completed',
      message: 'Audit complete!',
      progress: 100,
      reportId: report.id,
      result: {
        reportId: report.id,
        url: auditResult.url,
        scores: auditResult.scores,
        duration: auditResult.duration,
        metadata: auditResult.metadata
      }
    });

    // Close connection after a delay
    setTimeout(() => {
      res.end();
      activeSessions.delete(sessionId);
    }, 1000);
  } catch (error) {
    console.error(`[API] Audit failed for ${url}:`, error);

    let errorMessage = 'Audit failed';
    if (error.message.includes('timeout')) {
      errorMessage = 'Audit timed out. The website may be too slow or unreachable.';
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Could not reach the website. Please check the URL.';
    } else if (error.message.includes('LLM')) {
      errorMessage = 'AI analysis failed. Please try again.';
    } else {
      errorMessage = error.message || 'Audit failed';
    }

    sendProgress({
      status: 'error',
      message: errorMessage,
      progress: 0,
      error: {
        type: error.name,
        details: error.message
      }
    });

    setTimeout(() => {
      res.end();
      activeSessions.delete(sessionId);
    }, 1000);
  }
});

module.exports = router;
