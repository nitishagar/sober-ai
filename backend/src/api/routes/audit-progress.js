const express = require('express');
const { authenticate, checkUsageLimit } = require('../middleware/auth');
const Auditor = require('../../../../src/core/auditor');
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

  // Store original console methods
  const originalLog = console.log;
  const originalInfo = console.info;

  try {
    // Send initial progress
    sendProgress({
      status: 'started',
      message: 'Initializing audit...',
      progress: 0
    });

    // Create auditor with config from request
    const auditor = new Auditor(req.config);

    // Track progress phases
    let currentPhase = 1;
    const totalPhases = 4; // Gathering, Audits, Scoring, LLM
    let llmProgress = 0;

    const emitPhaseProgress = (phase, message, subProgress = null) => {
      let progress;
      if (phase === 4 && subProgress !== null) {
        // For phase 4 (LLM), use subProgress to show gradual progress
        const phaseStart = Math.floor((3 / totalPhases) * 100); // 75%
        const phaseEnd = 100;
        progress = phaseStart + Math.floor((subProgress / 100) * (phaseEnd - phaseStart));
      } else {
        progress = Math.floor((phase / totalPhases) * 100);
      }

      sendProgress({
        status: 'processing',
        phase: phase,
        message: message,
        progress: progress
      });
    };

    // Intercept logs to emit progress
    console.log = function (...args) {
      originalLog.apply(console, args);
      const message = args.join(' ');

      if (message.includes('Phase 1')) {
        currentPhase = 1;
        emitPhaseProgress(1, 'Gathering website data...');
      } else if (message.includes('Phase 2')) {
        currentPhase = 2;
        emitPhaseProgress(2, 'Running audits...');
      } else if (message.includes('Phase 3')) {
        currentPhase = 3;
        emitPhaseProgress(3, 'Calculating scores...');
      } else if (message.includes('Phase 4')) {
        currentPhase = 4;
        emitPhaseProgress(4, 'Generating AI recommendations...');
      } else if (message.includes('LLM Analysis:')) {
        const analysis = message.split(':')[1]?.trim();
        emitPhaseProgress(4, `AI analyzing: ${analysis}...`);
      } else if (message.includes('Generating recommendations for')) {
        const category = message.split('for ')[1]?.trim();
        emitPhaseProgress(4, `Generating recommendations for ${category}...`);
      } else if (message.includes('SSR Detection')) {
        emitPhaseProgress(1, 'Analyzing server-side rendering...');
      } else if (message.includes('Structured Data')) {
        emitPhaseProgress(1, 'Analyzing structured data...');
      } else if (message.includes('Semantic HTML')) {
        emitPhaseProgress(1, 'Analyzing semantic HTML...');
      } else if (message.includes('Content Analysis')) {
        emitPhaseProgress(1, 'Analyzing content...');
      }
    };

    console.info = console.log;

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

    // Create progress callback for LLM streaming
    // Track token counts per audit for accurate progress
    const auditTokenCounts = {};
    let currentAudit = null;

    const llmProgressCallback = (auditName, token) => {
      // Reset count if we're analyzing a new audit
      if (currentAudit !== auditName) {
        currentAudit = auditName;
        auditTokenCounts[auditName] = 0;
      }

      auditTokenCounts[auditName]++;
      const tokenCount = auditTokenCounts[auditName];

      // Update progress every 10 tokens
      if (tokenCount % 10 === 0) {
        // Improved estimation: 3 recommendations × ~300 tokens each = ~900 total
        // Progress = (tokenCount / 900) * 100, capped at 95%
        const estimatedProgress = Math.min(95, (tokenCount / 900) * 100);

        // Calculate which recommendation we're on (1 of 3, 2 of 3, 3 of 3)
        const recNumber = Math.min(3, Math.floor(tokenCount / 300) + 1);

        const auditLabel = getAuditLabel(auditName);
        emitPhaseProgress(4, `Analyzing ${auditLabel}... (${recNumber}/3 recommendations)`, estimatedProgress);
      }
    };

    // Run the audit with progress callback
    const auditResult = await auditor.audit(url, llmProgressCallback);

    // Restore console
    console.log = originalLog;
    console.info = originalInfo;

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

    // Restore console
    console.log = originalLog;
    console.info = originalInfo;

    // Determine error type for better messaging
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
