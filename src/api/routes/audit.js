const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Auditor = require('../../core/auditor');
const { validateAuditRequest } = require('../../utils/validator');
const logger = require('../../utils/logger');

const router = express.Router();

// In-memory storage for audit results (Phase 1 - no persistence)
const auditResults = new Map();

// POST /api/audit - Run a single URL audit
router.post('/', async (req, res, next) => {
  try {
    // Validate request
    const validation = validateAuditRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        errors: validation.errors
      });
    }

    const { url, options = {} } = req.body;
    const auditId = uuidv4();

    logger.info(`Starting audit ${auditId} for: ${url}`);

    // Create auditor instance
    const auditor = new Auditor(req.config);

    // Run audit (this will take 15-20 seconds)
    const result = await auditor.audit(url);

    // Store result
    auditResults.set(auditId, {
      id: auditId,
      ...result,
      createdAt: new Date().toISOString()
    });

    // Clean up old results (keep only last 100)
    if (auditResults.size > 100) {
      const firstKey = auditResults.keys().next().value;
      auditResults.delete(firstKey);
    }

    logger.info(`Audit ${auditId} completed successfully`);

    // Return result with ID
    res.json({
      id: auditId,
      ...result
    });

  } catch (error) {
    logger.error('Audit failed:', error);
    next(error);
  }
});

// GET /api/audit/:id - Get audit result by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  if (!auditResults.has(id)) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Audit result with ID ${id} not found`
    });
  }

  res.json(auditResults.get(id));
});

module.exports = router;
