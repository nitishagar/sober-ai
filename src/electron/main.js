const { app, BrowserWindow } = require('electron');
const path = require('path');
const net = require('net');
const { execFileSync } = require('child_process');

let mainWindow;

function getAvailablePort() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function runMigrations(dbPath) {
  const schemaPath = path.join(__dirname, '../db/schema.prisma');
  const prismaBin = path.join(__dirname, '../../node_modules/.bin/prisma');
  execFileSync(prismaBin, ['migrate', 'deploy', `--schema=${schemaPath}`], {
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: 'pipe'
  });
}

async function waitForServer(port, retries = 20, delayMs = 250) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      if (res.ok) return;
    } catch (_) { /* not ready yet */ }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error('Express server did not become ready in time');
}

async function startServer(port) {
  // Set environment for the Express server
  process.env.PORT = port;
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';

  // Set SQLite database path to user data directory
  const dbPath = path.join(app.getPath('userData'), 'soberai.db');
  process.env.DATABASE_URL = `file:${dbPath}`;

  // Run migrations before Express starts — safe to re-run on every launch
  runMigrations(dbPath);

  // Load the Express app (won't auto-listen because require.main !== module)
  const expressApp = require('../api/server');

  return new Promise((resolve) => {
    expressApp.listen(port, () => {
      console.log(`[Electron] Express server running on port ${port}`);
      resolve(port);
    });
  });
}

async function createWindow() {
  const port = await getAvailablePort();
  await startServer(port);
  await waitForServer(port);          // health-check gate before opening window

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'SoberAI',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

module.exports = { createWindow };
