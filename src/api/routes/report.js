const express = require('express');
const logger = require('../../utils/logger');

const router = express.Router();

// This would typically fetch from database
// For Phase 1, we redirect to the audit endpoint
router.get('/:id', (req, res) => {
  // Redirect to audit endpoint for Phase 1
  logger.info(`Report request for ${req.params.id}, redirecting to audit endpoint`);
  res.redirect(`/api/audit/${req.params.id}`);
});

module.exports = router;
