const { app, BrowserWindow } = require('electron');
const path = require('path');
const net = require('net');

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

async function startServer(port) {
  // Set environment for the Express server
  process.env.PORT = port;
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';

  // Set SQLite database path to user data directory
  const dbPath = path.join(app.getPath('userData'), 'soberai.db');
  process.env.DATABASE_URL = `file:${dbPath}`;

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

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'SoberAI',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
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
