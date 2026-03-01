const express = require('express');
const logger = require('../../utils/logger');

const router = express.Router();

// Placeholder for batch job status tracking

// GET /api/status/:jobId - Get batch job status
router.get('/:jobId', (req, res) => {
  const { jobId } = req.params;

  logger.info(`Status check for batch job: ${jobId}`);

  // Placeholder response
  res.json({
    jobId,
    status: 'pending',
    message: 'Batch processing is not yet implemented. Use POST /api/audit for single URL audits.'
  });
});

module.exports = router;
