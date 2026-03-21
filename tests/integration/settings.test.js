const request = require('supertest');
const app = require('../../src/api/server');
const { truncateAll, disconnect } = require('../helpers/db');

describe('Settings API', () => {
  beforeEach(truncateAll);
  afterAll(disconnect);

  it('GET /api/settings returns default settings', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('llm_provider');
  });

  it('GET /api/settings/providers returns provider list', async () => {
    const res = await request(app).get('/api/settings/providers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('PUT /api/settings saves and returns updated settings', async () => {
    const update = { llm_provider: 'ollama_local', ollama_model: 'llama3:8b' };
    const res = await request(app).put('/api/settings').send(update);
    expect(res.status).toBe(200);
    expect(res.body.updated).toContain('llm_provider');

    // Verify persisted
    const get = await request(app).get('/api/settings');
    expect(get.body.llm_provider).toBe('ollama_local');
    expect(get.body.ollama_model).toBe('llama3:8b');
  });

  it('POST /api/settings/test-connection succeeds with stub Ollama', async () => {
    const res = await request(app)
      .post('/api/settings/test-connection')
      .send();
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
