const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { validateBatchRequest } = require('../../utils/validator');
const { isPrivateTarget } = require('../../utils/ssrf');
const { auditLimiter } = require('../middleware/rate-limit');
const logger = require('../../utils/logger');
const Auditor = require('../../core/auditor');
const reportService = require('../../services/reportService');
const { loadProviderSettings } = require('./settings');
const { batchJobs } = require('./batch-jobs');

const router = express.Router();

// POST /api/batch - Submit batch audit job
router.post('/', auditLimiter, async (req, res) => {
  try {
    // Validate request
    const validation = validateBatchRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        errors: validation.errors
      });
    }

    const { urls, webhook } = req.body;
    const jobId = uuidv4();
    // Owner scoping: store the request's owner token alongside the job. A null
    // owner means isolation is inactive (local/desktop) — the job lives in the
    // single global namespace visible to all callers.
    const ownerToken = req.ownerToken || null;
    const config = req.config;

    // Create batch job
    const job = {
      id: jobId,
      urls,
      webhook,
      status: 'queued',
      ownerToken,
      createdAt: new Date().toISOString(),
      completedAt: null,
      totalUrls: urls.length,
      completedUrls: 0,
      results: [],
      webhookStatus: webhook ? 'pending' : 'skipped'
    };

    batchJobs.set(jobId, job);

    logger.info(`Batch job ${jobId} created with ${urls.length} URLs`);

    // Return job info
    res.status(202).json({
      jobId,
      status: 'queued',
      totalUrls: urls.length,
      message: 'Batch job queued. Check status at /api/status/:jobId',
      statusUrl: `/api/status/${jobId}`
    });

    // Fire-and-forget sequential drain: URLs are processed one at a time.
    // Sequential only within this job — an SSE audit running concurrently can
    // still mean N browsers overall (G6). The trailing catch keeps drain
    // failures from becoming unhandled rejections.
    drainJob(job, config).catch((error) => {
      logger.error(`Batch job ${job.id} drain failed:`, error);
    });

  } catch (error) {
    logger.error('Batch job creation failed:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create batch job'
    });
  }
});

// Sequentially audit every URL in the job, recording one result entry per URL.
// Per-URL failures are caught so the drain continues; the terminal status is
// completed (all succeeded), failed (none succeeded), or partial otherwise.
async function drainJob(job, config) {
  job.status = 'processing';

  let providerSettings = null;
  try {
    providerSettings = await loadProviderSettings();
  } catch (err) {
    logger.error(`Batch job ${job.id}: using default LLM settings: ${err.message}`);
  }

  for (const url of job.urls) {
    // Per-URL SSRF guard (S11 parity with audit-progress): private targets are
    // recorded as blocked without launching Chromium. DNS-resolution failure
    // passes through to the audit attempt (isPrivateTarget returns
    // blocked:false), never blocks.
    let ssrf = { blocked: false };
    try {
      ssrf = await isPrivateTarget(url);
    } catch (err) {
      logger.error(`Batch job ${job.id}: SSRF check failed for ${url}, allowing audit: ${err.message}`);
      ssrf = { blocked: false };
    }
    if (ssrf.blocked) {
      job.results.push({ url, status: 'blocked', error: `Blocked: ${ssrf.reason}` });
      job.completedUrls += 1;
      continue;
    }

    try {
      const auditor = new Auditor(config, providerSettings);
      const result = await auditor.audit(url);
      const report = await reportService.createReport(result, job.ownerToken);
      job.results.push({
        url,
        status: 'completed',
        reportId: report.id,
        overallScore: result.scores.overall,
        grade: result.scores.grade
      });
    } catch (error) {
      logger.error(`Batch job ${job.id}: audit failed for ${url}:`, error);
      job.results.push({ url, status: 'failed', error: error.message || 'Audit failed' });
    }
    job.completedUrls += 1;
  }

  const succeeded = job.results.filter((r) => r.status === 'completed').length;
  if (succeeded === job.totalUrls) {
    job.status = 'completed';
  } else if (succeeded === 0) {
    job.status = 'failed';
  } else {
    job.status = 'partial';
  }
  job.completedAt = new Date().toISOString();

  await deliverWebhook(job);
}

// Best-effort webhook delivery on terminal state ONLY. Failures are logged and
// recorded, never fail the job.
async function deliverWebhook(job) {
  if (!job.webhook) {
    job.webhookStatus = 'skipped';
    return;
  }

  let guard = { blocked: false };
  try {
    guard = await isPrivateTarget(job.webhook);
  } catch (err) {
    logger.error(`Batch job ${job.id}: webhook SSRF check failed, allowing delivery: ${err.message}`);
    guard = { blocked: false };
  }
  if (guard.blocked) {
    logger.info(`Batch job ${job.id}: webhook skipped (private target): ${guard.reason}`);
    job.webhookStatus = 'skipped';
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let res;
    try {
      res = await fetch(job.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          status: job.status,
          totalUrls: job.totalUrls,
          completedUrls: job.completedUrls,
          results: job.results
        }),
        signal: controller.signal,
        redirect: 'manual'
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      throw new Error(`Webhook responded with status ${res.status}`);
    }
    job.webhookStatus = 'delivered';
  } catch (error) {
    logger.error(`Batch job ${job.id}: webhook delivery failed:`, error);
    job.webhookStatus = 'failed';
  }
}

module.exports = router;
