const express = require('express');
const { PrismaClient } = require('@prisma/client');
const ProviderFactory = require('../../llm/providers/ProviderFactory');
const logger = require('../../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Default settings
const DEFAULTS = {
  llm_provider: 'ollama_local',
  ollama_endpoint: 'http://localhost:11434',
  ollama_model: 'qwen3:4b',
  ollama_api_key: '',
  openai_api_key: '',
  openai_model: 'gpt-4o-mini',
  anthropic_api_key: '',
  anthropic_model: 'claude-haiku-4-5-20251001'
};

/**
 * GET /api/settings
 * Retrieve all settings (API keys are masked)
 */
router.get('/', async (req, res) => {
  try {
    const rows = await prisma.settings.findMany();
    const settings = { ...DEFAULTS };

    for (const row of rows) {
      settings[row.key] = row.value;
    }

    // Mask API keys for security
    const masked = { ...settings };
    if (masked.ollama_api_key) {
      masked.ollama_api_key = maskKey(masked.ollama_api_key);
    }
    if (masked.openai_api_key) {
      masked.openai_api_key = maskKey(masked.openai_api_key);
    }
    if (masked.anthropic_api_key) {
      masked.anthropic_api_key = maskKey(masked.anthropic_api_key);
    }

    res.json(masked);
  } catch (error) {
    logger.error('Failed to load settings:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

/**
 * PUT /api/settings
 * Update one or more settings
 */
router.put('/', async (req, res) => {
  try {
    const updates = req.body;
    const allowedKeys = Object.keys(DEFAULTS);
    const results = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key)) continue;

      // Skip masked values (user didn't change the key)
      if ((key === 'ollama_api_key' || key === 'openai_api_key' || key === 'anthropic_api_key') && isMasked(value)) {
        continue;
      }

      await prisma.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
      results.push(key);
    }

    logger.info(`Settings updated: ${results.join(', ')}`);
    res.json({ updated: results });
  } catch (error) {
    logger.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * POST /api/settings/test-connection
 * Test the LLM provider connection with current settings
 */
router.post('/test-connection', async (req, res) => {
  try {
    const settings = await loadProviderSettings();
    const provider = ProviderFactory.create(settings);
    const result = await provider.testConnection();
    res.json(result);
  } catch (error) {
    logger.error('Connection test failed:', error);
    res.json({ ok: false, message: error.message });
  }
});

/**
 * GET /api/settings/providers
 * List available LLM providers
 */
router.get('/providers', (req, res) => {
  res.json(ProviderFactory.listProviders());
});

/**
 * Load provider settings from database for use by LLMAnalyzer.
 * Exported so audit routes can pass these to the Auditor.
 */
async function loadProviderSettings() {
  const rows = await prisma.settings.findMany();
  const stored = {};
  for (const row of rows) {
    stored[row.key] = row.value;
  }

  const providerType = stored.llm_provider || DEFAULTS.llm_provider;

  switch (providerType) {
    case 'ollama_cloud':
      return {
        provider: 'ollama_cloud',
        endpoint: stored.ollama_endpoint || DEFAULTS.ollama_endpoint,
        apiKey: stored.ollama_api_key || '',
        model: stored.ollama_model || DEFAULTS.ollama_model
      };
    case 'openai':
      return {
        provider: 'openai',
        apiKey: stored.openai_api_key || process.env.OPENAI_API_KEY || '',
        model: stored.openai_model || DEFAULTS.openai_model
      };
    case 'anthropic':
      return {
        provider: 'anthropic',
        apiKey: stored.anthropic_api_key || process.env.ANTHROPIC_API_KEY || '',
        model: stored.anthropic_model || DEFAULTS.anthropic_model
      };
    default:
      return {
        provider: 'ollama_local',
        endpoint: stored.ollama_endpoint || process.env.OLLAMA_ENDPOINT || DEFAULTS.ollama_endpoint,
        model: stored.ollama_model || DEFAULTS.ollama_model
      };
  }
}

function maskKey(key) {
  if (!key || key.length < 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

function isMasked(value) {
  return typeof value === 'string' && value.includes('****');
}

module.exports = router;
module.exports.loadProviderSettings = loadProviderSettings;
