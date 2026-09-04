const rateLimit = require('express-rate-limit');

// Shared per-IP rate limiter for the write POST routes (invariant I/S12):
// 30/min on POST /api/audit-progress, POST /api/audit, and POST /api/batch
// with an identical 429 shape. ONE instance shared across all three routers
// so the budget is global per-IP, not per-route. High enough default that the
// integration suite's sequential writes don't trip; env-tunable.
const auditLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.AUDIT_RATE_LIMIT) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many audit requests, please slow down.' });
  }
});

module.exports = { auditLimiter };
