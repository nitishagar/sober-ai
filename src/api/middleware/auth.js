const authService = require('../../services/authService');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const user = await authService.verifyToken(token);

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth] Authentication failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.role !== role && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

async function checkUsageLimit(req, res, next) {
  try {
    const canUse = await authService.checkUsageLimit(req.user.id);

    if (!canUse) {
      return res.status(429).json({
        error: 'Usage limit exceeded',
        message: 'You have reached your monthly audit limit. Please upgrade your plan.'
      });
    }

    next();
  } catch (error) {
    console.error('[Auth] Usage limit check failed:', error);
    return res.status(500).json({ error: 'Failed to check usage limit' });
  }
}

module.exports = {
  authenticate,
  requireRole,
  checkUsageLimit
};
