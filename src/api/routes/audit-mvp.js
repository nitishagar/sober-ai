const express = require('express');
const Auditor = require('../../core/auditor');
const reportService = require('../../services/reportService');
const { validateAuditRequest } = require('../../utils/validator');

const router = express.Router();

/**
 * POST /api/audit
 * Run a single URL audit
 */
router.post('/', async (req, res) => {
  try {
    // Validate request
    const validation = validateAuditRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        errors: validation.errors
      });
    }

    const { url } = req.body;

    console.log(`[API] Starting audit for: ${url}`);

    // Run audit
    const auditor = new Auditor(req.config);
    const result = await auditor.audit(url);

    // Save report
    const report = await reportService.createReport(result);

    console.log(`[API] Audit completed, report ID: ${report.id}`);

    // Return result with report ID
    return res.json({
      reportId: report.id,
      ...result
    });
  } catch (error) {
    console.error('[API] Audit failed:', error);
    return res.status(500).json({ error: 'Audit failed', message: error.message });
  }
});

/**
 * GET /api/audit/:reportId
 * Retrieve a specific audit report
 */
router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await reportService.getReport(reportId);
    return res.json(report);
  } catch (error) {
    console.error('[API] Failed to retrieve report:', error);
    return res.status(404).json({ error: 'Report not found' });
  }
});

module.exports = router;
