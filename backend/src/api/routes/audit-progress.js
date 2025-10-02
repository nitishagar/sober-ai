const express = require('express');
const { authenticate, checkUsageLimit } = require('../middleware/auth');
const Auditor = require('../../../../src/core/auditor');
const reportService = require('../../services/reportService');
const authService = require('../../services/authService');
const { EventEmitter } = require('events');

const router = express.Router();

// Store active audit sessions
const activeSessions = new Map();

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

    // Create progress callback for LLM streaming
    let tokenCount = 0;
    const llmProgressCallback = (auditName, token) => {
      tokenCount++;
      // Update progress every 10 tokens to avoid too many updates
      if (tokenCount % 10 === 0) {
        const estimatedProgress = Math.min(95, tokenCount / 5); // Estimate based on token count
        emitPhaseProgress(4, `AI analyzing ${auditName}...`, estimatedProgress);
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
    console.error(`[API] Audit failed: ${error.message}`);

    // Restore console
    console.log = originalLog;
    console.info = originalInfo;

    sendProgress({
      status: 'error',
      message: error.message || 'Audit failed',
      progress: 0
    });

    setTimeout(() => {
      res.end();
      activeSessions.delete(sessionId);
    }, 1000);
  }
});

module.exports = router;
