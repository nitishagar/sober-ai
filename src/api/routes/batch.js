const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { validateBatchRequest } = require('../../utils/validator');
const logger = require('../../utils/logger');

const router = express.Router();

// In-memory batch job storage
const batchJobs = new Map();

// POST /api/batch - Submit batch audit job
router.post('/', async (req, res) => {
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

    // Create batch job
    const job = {
      id: jobId,
      urls,
      webhook,
      status: 'queued',
      createdAt: new Date().toISOString(),
      totalUrls: urls.length,
      completedUrls: 0,
      results: []
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

  } catch (error) {
    logger.error('Batch job creation failed:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create batch job'
    });
  }
});

module.exports = router;
