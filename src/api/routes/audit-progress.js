const express = require('express');
const Auditor = require('../../core/auditor');
const reportService = require('../../services/reportService');
const { loadProviderSettings } = require('./settings');
const { EventEmitter } = require('events');

const router = express.Router();

// Store active audit sessions (state + emitter)
const activeSessions = new Map();

// Cleanup old sessions every minute
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const sessionTimestamps = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (!session || !session.state) {
      activeSessions.delete(sessionId);
      sessionTimestamps.delete(sessionId);
      continue;
    }

    const state = session.state;
    let shouldDelete = false;

    if (state.status === 'completed' && state.completedAt) {
      if (now - state.completedAt > 60000) shouldDelete = true;
    } else if (state.disconnected && state.disconnectedAt) {
      if (now - state.disconnectedAt > SESSION_TIMEOUT) shouldDelete = true;
    } else if (state.createdAt && now - state.createdAt > 10 * 60 * 1000) {
      shouldDelete = true;
    }

    if (shouldDelete) {
      activeSessions.delete(sessionId);
      sessionTimestamps.delete(sessionId);
      console.log(`[API] Cleaned up session: ${sessionId} (status: ${state.status || 'unknown'})`);
    }
  }
}, 60000);

/**
 * GET /api/audit-progress/session/:sessionId
 * Return state for an existing session (for restoration)
 */
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session || !session.state) {
    return res.json({ status: 'not_found' });
  }

  res.json({
    status: session.state.status || 'processing',
    url: session.state.url,
    phase: session.state.lastPhase || 1,
    progress: session.state.lastProgress || 0,
    message: session.state.lastMessage || 'Initializing audit...'
  });
});

/**
 * GET /api/audit-progress/session/:sessionId/stream
 * Reconnect to an existing session's SSE stream
 */
router.get('/session/:sessionId/stream', (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session || !session.state) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  console.log(`[API] Client reconnecting to session: ${sessionId}`);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const currentState = {
    status: session.state.status || 'processing',
    sessionId,
    phase: session.state.lastPhase,
    progress: session.state.lastProgress,
    message: session.state.lastMessage
  };

  if (session.state.eta !== undefined) {
    currentState.eta = session.state.eta;
  }

  if (session.state.status === 'completed' && session.state.reportId) {
    currentState.reportId = session.state.reportId;
    currentState.result = {
      reportId: session.state.reportId
    };
  }

  res.write(`data: ${JSON.stringify(currentState)}\n\n`);

  if (session.state.status === 'completed' || session.state.status === 'error') {
    setTimeout(() => res.end(), 100);
    return;
  }

  const responseWriter = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error(`[API] Failed to write to reconnected stream: ${err.message}`);
    }
  };

  session.emitter.on('progress', responseWriter);

  session.state.disconnected = false;
  delete session.state.disconnectedAt;

  req.on('close', () => {
    console.log(`[API] Reconnected client disconnected from session: ${sessionId}`);
    session.emitter.removeListener('progress', responseWriter);

    if (session.state) {
      session.state.disconnected = true;
      session.state.disconnectedAt = Date.now();
    }
  });
});

/**
 * POST /api/audit-progress
 * Start an audit with SSE progress updates
 */
router.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`[API] Starting audit with progress for: ${url}`);

  // Create unique session ID
  const sessionId = `audit-${Date.now()}`;

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Create event emitter + state for this session
  const progressEmitter = new EventEmitter();
  const sessionState = {
    url,
    lastPhase: 1,
    lastProgress: 0,
    lastMessage: 'Initializing audit...',
    status: 'processing',
    createdAt: Date.now(),
    phaseTimestamps: {
      1: Date.now()
    }
  };

  activeSessions.set(sessionId, {
    emitter: progressEmitter,
    state: sessionState
  });
  sessionTimestamps.set(sessionId, Date.now());

  const sendProgress = (data) => {
    if (data.phase !== undefined) sessionState.lastPhase = data.phase;
    if (data.progress !== undefined) sessionState.lastProgress = data.progress;
    if (data.message !== undefined) sessionState.lastMessage = data.message;
    if (data.status !== undefined) sessionState.status = data.status;
    if (data.reportId !== undefined) sessionState.reportId = data.reportId;
    if (data.eta !== undefined) sessionState.eta = data.eta;

    progressEmitter.emit('progress', data);
  };

  const responseWriter = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error(`[API] Failed to write to stream: ${err.message}`);
    }
  };

  progressEmitter.on('progress', responseWriter);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`[API] Client disconnected from audit progress: ${sessionId}`);
    const session = activeSessions.get(sessionId);
    if (session && session.state) {
      session.state.disconnected = true;
      session.state.disconnectedAt = Date.now();
    }
  });

  try {
    // Send initial progress including session ID
    sendProgress({
      status: 'started',
      sessionId,
      message: 'Initializing audit...',
      progress: 0
    });

    // Load LLM provider settings from database and create auditor
    let providerSettings = null;
    try {
      providerSettings = await loadProviderSettings();
    } catch (err) {
      console.log('[API] Using default LLM settings:', err.message);
    }
    const auditor = new Auditor(req.config, providerSettings);

    // Progress allocation weighted by typical phase duration
    // Phase 1 (Gathering): 30%, Phase 2 (Audits): 5%, Phase 3 (Scoring): 5%, Phase 4 (LLM): 60%
    const phaseAllocation = {
      1: { start: 0, end: 30 },
      2: { start: 30, end: 35 },
      3: { start: 35, end: 40 },
      4: { start: 40, end: 100 }
    };
    let lastEmittedProgress = 0;

    const emitPhaseProgress = (phase, message, subProgress = null) => {
      if (phase !== sessionState.lastPhase && !sessionState.phaseTimestamps[phase]) {
        sessionState.phaseTimestamps[phase] = Date.now();
      }

      const alloc = phaseAllocation[phase];
      let progress;
      if (phase === 4 && subProgress !== null) {
        progress = alloc.start + Math.floor((subProgress / 100) * (alloc.end - alloc.start));
      } else {
        progress = alloc.end;
      }

      if (progress < lastEmittedProgress) {
        progress = lastEmittedProgress;
      }
      progress = Math.min(progress, 99);
      lastEmittedProgress = progress;

      // Phase-weighted ETA using actual phase timestamps
      // Default durations in ms (self-adjusting as phases complete)
      const phaseDurations = { 1: 10000, 2: 500, 3: 100, 4: 30000 };

      // Update with actual durations from completed phases
      for (let p = 1; p < phase; p++) {
        const pStart = sessionState.phaseTimestamps[p];
        const pEnd = sessionState.phaseTimestamps[p + 1];
        if (pStart && pEnd) {
          phaseDurations[p] = pEnd - pStart;
        }
      }

      let eta = null;
      const currentPhaseStart = sessionState.phaseTimestamps[phase];
      if (currentPhaseStart) {
        const phaseElapsed = Date.now() - currentPhaseStart;
        const progressInPhase = progress - alloc.start;
        const phaseRange = alloc.end - alloc.start;

        // Estimate remaining time in current phase
        let phaseRemaining;
        if (progressInPhase > 0) {
          const estimatedPhaseDuration = (phaseElapsed / progressInPhase) * phaseRange;
          phaseRemaining = Math.max(0, estimatedPhaseDuration - phaseElapsed);
        } else {
          phaseRemaining = phaseDurations[phase];
        }

        // Add default durations for remaining phases
        let futurePhases = 0;
        for (let p = phase + 1; p <= 4; p++) {
          futurePhases += phaseDurations[p];
        }

        eta = Math.max(5, Math.floor((phaseRemaining + futurePhases) / 1000));
      }

      sendProgress({
        status: 'processing',
        phase,
        message,
        progress,
        eta
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

    // Explicit callbacks for auditor phases
    const onPhase = (phase, message) => {
      emitPhaseProgress(phase, message);
    };

    const onStep = (event) => {
      if (event && event.message) {
        emitPhaseProgress(event.phase || 1, event.message);
      }
    };

    // Track token counts per audit for concurrent LLM progress
    const auditTokenCounts = {};
    let totalTokens = 0;
    const estimatedTokensPerAudit = 300;
    let lastUpdateTime = 0;
    const MIN_UPDATE_INTERVAL = 500; // ms — max 2 updates per second

    const onLLMToken = (auditName) => {
      if (!auditTokenCounts[auditName]) {
        auditTokenCounts[auditName] = 0;
      }
      auditTokenCounts[auditName]++;
      totalTokens++;

      const now = Date.now();
      if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) return;
      lastUpdateTime = now;

      // Calculate overall LLM progress from all audits
      const auditNames = Object.keys(auditTokenCounts);
      const numAudits = auditNames.length;
      let overallProgress = 0;

      for (const name of auditNames) {
        const auditProgress = Math.min(95, Math.floor((auditTokenCounts[name] / estimatedTokensPerAudit) * 100));
        overallProgress += auditProgress / numAudits;
      }

      const totalProgress = Math.floor(overallProgress);
      const auditLabel = getAuditLabel(auditName);
      const completedCount = auditNames.filter(name =>
        auditTokenCounts[name] >= estimatedTokensPerAudit
      ).length;

      emitPhaseProgress(4, `Analyzing ${auditLabel}... (${completedCount + 1}/${numAudits} recommendations)`, totalProgress);
    };

    // Run the audit with explicit callbacks
    const auditResult = await auditor.audit(url, { onPhase, onStep, onLLMToken });

    // Save report to database
    const report = await reportService.createReport(auditResult);

    console.log(`[API] Audit completed, report ID: ${report.id}`);

    const fallbackUsed = Object.values(auditResult.recommendations || {}).some(r => r && r.fallback === true);

    const latestSession = activeSessions.get(sessionId);
    if (latestSession && latestSession.state) {
      latestSession.state.status = 'completed';
      latestSession.state.reportId = report.id;
      latestSession.state.completedAt = Date.now();
      latestSession.state.lastPhase = 4;
      latestSession.state.lastProgress = 100;
      latestSession.state.lastMessage = 'Audit complete!';
    }

    // Send completion
    const completedPayload = {
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
    };
    if (fallbackUsed) completedPayload.fallbackUsed = true;
    sendProgress(completedPayload);

    // Close connection after a delay
    setTimeout(() => {
      res.end();
      activeSessions.delete(sessionId);
      sessionTimestamps.delete(sessionId);
    }, 1000);

  } catch (error) {
    console.error(`[API] Audit failed for ${url}:`, error);

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
      sessionTimestamps.delete(sessionId);
    }, 1000);
  }
});

module.exports = router;
