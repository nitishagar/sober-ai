const express = require('express');
const authService = require('../../services/authService');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await authService.register(email, password, name);

    return res.status(201).json(result);
  } catch (error) {
    console.error('[API] Registration failed:', error);

    if (error.message === 'User already exists') {
      return res.status(409).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password);

    return res.json(result);
  } catch (error) {
    console.error('[API] Login failed:', error);

    if (error.message === 'Invalid credentials' || error.message === 'Account is inactive') {
      return res.status(401).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.substring(7);
    const user = await authService.verifyToken(token);

    return res.json({ user: authService.sanitizeUser(user) });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
