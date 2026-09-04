const express = require('express');
const logger = require('../../utils/logger');
const { batchJobs } = require('./batch-jobs');

const router = express.Router();

// GET /api/status/:jobId - Get batch job status
router.get('/:jobId', (req, res) => {
  const { jobId } = req.params;

  logger.info(`Status check for batch job: ${jobId}`);

  const job = batchJobs.get(jobId);
  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      message: `No batch job found with id ${jobId}`
    });
  }

  // Owner scoping (S8 parity): a job stored with a truthy owner token is only
  // visible to that owner — otherwise 404 (no existence leak). A null stored
  // token means the global namespace, visible to all callers.
  if (job.ownerToken && job.ownerToken !== req.ownerToken) {
    return res.status(404).json({
      error: 'Job not found',
      message: `No batch job found with id ${jobId}`
    });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    totalUrls: job.totalUrls,
    completedUrls: job.completedUrls,
    results: job.results,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    webhookStatus: job.webhookStatus
  });
});

module.exports = router;
