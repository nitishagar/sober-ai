const path = require('path');
const fs = require('fs');
const http = require('http');
const { execFileSync } = require('child_process');

const TEST_DB = '/tmp/soberai-e2e.db';
const OLLAMA_STUB_PORT = 11436;
const PORT = 3100;

process.env.DATABASE_URL = `file:${TEST_DB}`;
process.env.OLLAMA_ENDPOINT = `http://127.0.0.1:${OLLAMA_STUB_PORT}`;
process.env.NODE_ENV = 'test';
process.env.PORT = String(PORT);

// Verify frontend/dist exists
const distDir = path.join(__dirname, '../../../frontend/dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('frontend/dist missing. Run: cd frontend && npm ci && npm run build');
  process.exit(1);
}

// Clean stale DB
for (const ext of ['', '-journal', '-shm', '-wal']) {
  try { fs.unlinkSync(TEST_DB + ext); } catch (_) {}
}

// Prisma migrate
const prismaBin = path.join(__dirname, '../../../node_modules/.bin/prisma');
const schemaPath = path.join(__dirname, '../../../src/db/schema.prisma');
execFileSync(prismaBin, ['migrate', 'deploy', `--schema=${schemaPath}`], {
  env: { ...process.env },
  stdio: 'pipe'
});

// Stub Ollama
const stub = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [{ name: 'qwen3:4b' }] }));
  if (req.url === '/api/generate' || req.url === '/api/chat') {
    return res.end(JSON.stringify({ response: 'Test LLM response.', done: true, model: 'qwen3:4b' }));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'not found' }));
});
stub.listen(OLLAMA_STUB_PORT, '127.0.0.1');

// Monkey-patch Auditor before requiring server
const Auditor = require('../../../src/core/auditor');
const CANNED_DATA = require('./canned-gatherer-data');
Auditor.prototype.runGatherers = async () => CANNED_DATA;

// Boot app — server.js exports app but only listens when require.main === module
const app = require('../../../src/api/server');
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[e2e test-server] listening on http://127.0.0.1:${PORT}`);
});

// Graceful shutdown
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    server.close(() => {
      stub.close();
      process.exit(0);
    });
  });
}
