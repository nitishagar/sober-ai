const request = require('supertest');
const app = require('../../src/api/server');
const { truncateAll, disconnect } = require('../helpers/db');

describe('GET /api/health', () => {
  beforeEach(truncateAll);
  afterAll(disconnect);

  it('returns 200 with ollama connected status when stub is running', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.services).toBeDefined();
    // ollama stub is running on port 11435
    expect(res.body.services.ollama).toBe('connected');
  });

  it('includes version and timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
  });
});
