const express = require('express');
const reportService = require('../../services/reportService');

const router = express.Router();

/**
 * GET /api/reports
 * List all reports
 */
router.get('/', async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, search } = req.query;

    const result = await reportService.getReports({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
      search
    });

    return res.json(result);
  } catch (error) {
    console.error('[API] Failed to list reports:', error);
    return res.status(500).json({ error: 'Failed to list reports' });
  }
});

/**
 * GET /api/reports/stats
 * Get report statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await reportService.getReportStats();
    return res.json(stats);
  } catch (error) {
    console.error('[API] Failed to get stats:', error);
    return res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/reports/compare/:id1/:id2
 * Compare two reports
 */
router.get('/compare/:id1/:id2', async (req, res) => {
  try {
    const comparison = await reportService.compareReports(
      req.params.id1,
      req.params.id2
    );
    return res.json(comparison);
  } catch (error) {
    console.error('[API] Failed to compare reports:', error);
    return res.status(404).json({ error: 'One or both reports not found' });
  }
});

/**
 * GET /api/reports/:reportId
 * Get full report details
 */
router.get('/:reportId', async (req, res) => {
  try {
    const report = await reportService.getReport(req.params.reportId);
    return res.json(report);
  } catch (error) {
    console.error('[API] Failed to get report:', error);
    return res.status(404).json({ error: 'Report not found' });
  }
});

/**
 * DELETE /api/reports/:reportId
 * Delete a report
 */
router.delete('/:reportId', async (req, res) => {
  try {
    await reportService.deleteReport(req.params.reportId);
    return res.json({ message: 'Report deleted' });
  } catch (error) {
    console.error('[API] Failed to delete report:', error);
    return res.status(404).json({ error: 'Report not found' });
  }
});

module.exports = router;
