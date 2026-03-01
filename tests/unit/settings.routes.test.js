const express = require('express');
const request = require('supertest');

// Mock PrismaClient before requiring the route
const mockFindMany = jest.fn();
const mockUpsert = jest.fn();
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    settings: {
      findMany: mockFindMany,
      upsert: mockUpsert
    }
  }))
}));

// Mock axios for provider test-connection
jest.mock('axios');

const settingsRouter = require('../../src/api/routes/settings');

const app = express();
app.use(express.json());
app.use('/api/settings', settingsRouter);

describe('Settings API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/settings', () => {
    it('returns default settings when database is empty', async () => {
      mockFindMany.mockResolvedValue([]);

      const res = await request(app).get('/api/settings');

      expect(res.status).toBe(200);
      expect(res.body.llm_provider).toBe('ollama_local');
      expect(res.body.ollama_endpoint).toBe('http://localhost:11434');
      expect(res.body.ollama_model).toBe('qwen3:4b');
    });

    it('merges stored settings with defaults', async () => {
      mockFindMany.mockResolvedValue([
        { key: 'llm_provider', value: 'openai' },
        { key: 'openai_api_key', value: 'test-abc123def456' }
      ]);

      const res = await request(app).get('/api/settings');

      expect(res.status).toBe(200);
      expect(res.body.llm_provider).toBe('openai');
      // API key should be masked
      expect(res.body.openai_api_key).toBe('test****f456');
    });

    it('masks short API keys', async () => {
      mockFindMany.mockResolvedValue([
        { key: 'openai_api_key', value: 'short' }
      ]);

      const res = await request(app).get('/api/settings');
      expect(res.body.openai_api_key).toBe('****');
    });
  });

  describe('PUT /api/settings', () => {
    it('updates allowed settings', async () => {
      mockUpsert.mockResolvedValue({});

      const res = await request(app)
        .put('/api/settings')
        .send({ llm_provider: 'openai', openai_model: 'gpt-4' });

      expect(res.status).toBe(200);
      expect(res.body.updated).toContain('llm_provider');
      expect(res.body.updated).toContain('openai_model');
      expect(mockUpsert).toHaveBeenCalledTimes(2);
    });

    it('ignores unknown settings keys', async () => {
      mockUpsert.mockResolvedValue({});

      const res = await request(app)
        .put('/api/settings')
        .send({ unknown_key: 'value', llm_provider: 'ollama_local' });

      expect(res.status).toBe(200);
      expect(res.body.updated).toEqual(['llm_provider']);
      expect(mockUpsert).toHaveBeenCalledTimes(1);
    });

    it('skips masked API key values', async () => {
      mockUpsert.mockResolvedValue({});

      const res = await request(app)
        .put('/api/settings')
        .send({ openai_api_key: 'test****f456', llm_provider: 'openai' });

      expect(res.status).toBe(200);
      // Only llm_provider should be updated, not the masked key
      expect(res.body.updated).toEqual(['llm_provider']);
    });
  });

  describe('GET /api/settings/providers', () => {
    it('returns list of available providers', async () => {
      const res = await request(app).get('/api/settings/providers');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body.map(p => p.id)).toEqual(['ollama_local', 'ollama_cloud', 'openai']);
    });
  });
});
