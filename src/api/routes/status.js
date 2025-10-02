const express = require('express');
const logger = require('../../utils/logger');

const router = express.Router();

// This is a placeholder for Phase 1
// In Phase 2, this would integrate with Bull queue for real batch processing

// GET /api/status/:jobId - Get batch job status
router.get('/:jobId', (req, res) => {
  const { jobId } = req.params;

  logger.info(`Status check for batch job: ${jobId}`);

  // Placeholder response
  res.json({
    jobId,
    status: 'pending',
    message: 'Batch processing is not implemented in Phase 1. Use POST /api/audit for single URL audits.',
    note: 'Full batch processing with queue system will be available in Phase 2'
  });
});

module.exports = router;
