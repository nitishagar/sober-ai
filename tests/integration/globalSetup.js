const { execFileSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = '/tmp/soberai-test.db';
const OLLAMA_STUB_PORT = 11435;

module.exports = async function globalSetup() {
  // 1. Set environment variables — visible in test worker processes
  process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;
  process.env.OLLAMA_ENDPOINT = `http://localhost:${OLLAMA_STUB_PORT}`;
  process.env.NODE_ENV = 'test';

  // 2. Remove stale test DB from previous runs
  for (const ext of ['', '-journal', '-shm', '-wal']) {
    try { fs.unlinkSync(TEST_DB_PATH + ext); } catch (_) {}
  }

  // 3. Run Prisma migrations against test DB
  const prismaBin = path.join(__dirname, '../../node_modules/.bin/prisma');
  const schemaPath = path.join(__dirname, '../../src/db/schema.prisma');
  execFileSync(prismaBin, ['migrate', 'deploy', `--schema=${schemaPath}`], {
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
    stdio: 'pipe'
  });

  // 4. Start stub Ollama HTTP server
  const stubServer = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/tags') {
      res.end(JSON.stringify({ models: [{ name: 'qwen3:4b' }] }));
    } else if (req.url === '/api/generate' || req.url === '/api/chat') {
      res.end(JSON.stringify({
        response: 'Test LLM response.',
        done: true,
        model: 'qwen3:4b'
      }));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not found' }));
    }
  });

  await new Promise((resolve, reject) => {
    stubServer.listen(OLLAMA_STUB_PORT, '127.0.0.1', resolve);
    stubServer.once('error', reject);
  });

  // Store server on global so globalTeardown can close it
  global.__OLLAMA_STUB__ = stubServer;

  console.log(`[globalSetup] Test DB: ${TEST_DB_PATH}`);
  console.log(`[globalSetup] Ollama stub: http://localhost:${OLLAMA_STUB_PORT}`);
};
