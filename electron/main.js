const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let nextServer = null;
const nextPort = 3000;
const isDev = !app.isPackaged;

// ========== LOGGING ==========
const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, 'attindo.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  logStream.write(line);
  console.log(line.trim());
}

log('=== Attindo Starting ===');
log('Version: 1.0.0');
log('Mode: ' + (isDev ? 'Development' : 'Production'));
log('App Path: ' + app.getAppPath());
log('Resources: ' + process.resourcesPath);
log('User Data: ' + app.getPath('userData'));
log('Platform: ' + process.platform);

// ========== DATABASE ==========
function getAppDataDir() {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

function getDatabasePath() {
  return path.join(getAppDataDir(), 'attindo.db');
}

function ensureDatabase() {
  const dbPath = getDatabasePath();
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '');
    log('Created new database at: ' + dbPath);
  }
  return dbPath;
}

// Convert Windows path to proper file:// URI for Prisma
function getDatabaseUrl() {
  const dbPath = getDatabasePath();
  // On Windows, convert backslashes to forward slashes and ensure proper file:// format
  let normalizedPath = dbPath.replace(/\\/g, '/');
  // Ensure absolute path starts with / on Windows (file:///C:/...)
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }
  return 'file:' + normalizedPath;
}

// ========== STANDALONE SERVER SETUP ==========
function findServerPath() {
  // Possible locations for the Next.js standalone server
  const possiblePaths = [
    path.join(process.resourcesPath, 'next-standalone', 'server.js'),
    path.join(process.resourcesPath, 'app', 'next-standalone', 'server.js'),
    path.join(__dirname, '..', 'next-standalone', 'server.js'),
    path.join(__dirname, '..', '..', 'next-standalone', 'server.js'),
  ];

  for (const p of possiblePaths) {
    log('Checking server path: ' + p + ' -> ' + (fs.existsSync(p) ? 'EXISTS' : 'NOT FOUND'));
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findStandaloneDir() {
  const possibleDirs = [
    path.join(process.resourcesPath, 'next-standalone'),
    path.join(process.resourcesPath, 'app', 'next-standalone'),
    path.join(__dirname, '..', 'next-standalone'),
    path.join(__dirname, '..', '..', 'next-standalone'),
  ];

  for (const d of possibleDirs) {
    if (fs.existsSync(d)) return d;
  }
  return null;
}

// ========== NEXT.JS SERVER ==========
function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      log('Dev mode - assuming Next.js is running on port ' + nextPort);
      resolve(nextPort);
      return;
    }

    const serverPath = findServerPath();
    const standaloneDir = findStandaloneDir();

    if (!serverPath || !standaloneDir) {
      log('ERROR: Could not find Next.js standalone server!');
      log('Searched paths:');
      log('  serverPath: ' + serverPath);
      log('  standaloneDir: ' + standaloneDir);
      reject(new Error('Next.js server not found'));
      return;
    }

    log('Server path: ' + serverPath);
    log('Standalone dir: ' + standaloneDir);

    // List standalone dir contents for debugging
    try {
      const contents = fs.readdirSync(standaloneDir);
      log('Standalone contents: ' + contents.join(', '));
    } catch (e) {
      log('Cannot read standalone dir: ' + e.message);
    }

    const dbUrl = getDatabaseUrl();
    log('Database URL: ' + dbUrl);

    const env = {
      ...process.env,
      DATABASE_URL: dbUrl,
      PORT: String(nextPort),
      HOSTNAME: '0.0.0.0',
      NODE_ENV: 'production',
    };

    log('Starting server with env PORT=' + nextPort + ' HOSTNAME=0.0.0.0');

    try {
      nextServer = spawn('node', [serverPath], {
        env,
        cwd: standaloneDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let serverStarted = false;

      nextServer.stdout.on('data', (data) => {
        const output = data.toString();
        log('[Next.js stdout] ' + output.trim());

        // Detect when server is ready
        if (!serverStarted && (output.includes('Ready') || output.includes('started') || output.includes('Listening'))) {
          serverStarted = true;
          resolve(nextPort);
        }
      });

      nextServer.stderr.on('data', (data) => {
        const output = data.toString();
        log('[Next.js stderr] ' + output.trim());
      });

      nextServer.on('error', (err) => {
        log('[Next.js spawn error] ' + err.message);
        reject(err);
      });

      nextServer.on('close', (code, signal) => {
        log('[Next.js] Server exited with code=' + code + ' signal=' + signal);
        nextServer = null;
        if (!serverStarted) {
          reject(new Error('Server exited before becoming ready with code ' + code));
        }
      });

      // Timeout - if server doesn't signal ready in 45s, try HTTP check
      setTimeout(() => {
        if (!serverStarted) {
          log('Server startup timeout, checking if it responds to HTTP...');
          checkServerHttp(nextPort).then(() => {
            serverStarted = true;
            resolve(nextPort);
          }).catch(() => {
            log('Server not responding after timeout');
            reject(new Error('Server did not start in time'));
          });
        }
      }, 45000);

    } catch (err) {
      log('Failed to spawn server: ' + err.message);
      reject(err);
    }
  });
}

function checkServerHttp(port) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(true);
    });
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('HTTP check timeout'));
    });
  });
}

function waitForServer(port, maxRetries = 40) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      checkServerHttp(port).then(() => {
        log('Server is responding on port ' + port);
        resolve(true);
      }).catch(() => {
        retries++;
        if (retries >= maxRetries) {
          reject(new Error('Server did not respond after ' + maxRetries + ' retries'));
        } else {
          setTimeout(check, 1500);
        }
      });
    };
    check();
  });
}

// ========== SEED DATABASE ==========
function seedDatabase() {
  return new Promise((resolve) => {
    const dbPath = getDatabasePath();

    try {
      const dbSize = fs.statSync(dbPath).size;
      if (dbSize > 10000) {
        log('Database already has data (' + dbSize + ' bytes), skipping seed');
        resolve();
        return;
      }
    } catch (e) {
      log('Cannot check database size: ' + e.message);
    }

    log('First run detected, seeding database...');

    // Find seed script
    const possibleSeedPaths = isDev
      ? [path.join(process.cwd(), 'scripts', 'seed.ts')]
      : [
          path.join(process.resourcesPath, 'next-standalone', 'scripts', 'seed.ts'),
          path.join(process.resourcesPath, 'scripts', 'seed.ts'),
        ];

    let seedPath = null;
    for (const p of possibleSeedPaths) {
      if (fs.existsSync(p)) {
        seedPath = p;
        log('Found seed script at: ' + p);
        break;
      }
    }

    if (!seedPath) {
      log('Seed script not found, will rely on API seed endpoint');
      // Try to seed via HTTP after server starts
      resolve();
      return;
    }

    const dbUrl = getDatabaseUrl();
    const env = {
      ...process.env,
      DATABASE_URL: dbUrl,
    };

    const child = spawn('npx', ['tsx', seedPath], {
      env,
      shell: true,
      stdio: 'pipe',
      cwd: path.dirname(seedPath),
    });

    child.stdout.on('data', (data) => { log('[Seed] ' + data.toString().trim()); });
    child.stderr.on('data', (data) => { log('[Seed err] ' + data.toString().trim()); });

    child.on('close', (code) => {
      log('Seed completed with code ' + code);
      resolve();
    });

    setTimeout(() => { child.kill(); resolve(); }, 30000);
  });
}

// Seed via API endpoint after server is running
async function seedViaApi() {
  try {
    const res = await fetch(`http://localhost:${nextPort}/api/seed`, { method: 'POST' });
    if (res.ok) {
      log('Database seeded via API successfully');
    } else {
      log('API seed returned status ' + res.status);
    }
  } catch (e) {
    log('API seed failed: ' + e.message);
  }
}

// ========== ERROR PAGE ==========
function showErrorPage(window, errorMsg) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 100vw; height: 100vh;
          background: #0F172A;
          display: flex; align-items: center; justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #E2E8F0;
          overflow: hidden;
        }
        .container {
          text-align: center;
          max-width: 500px;
          padding: 40px;
        }
        .icon {
          font-size: 60px;
          margin-bottom: 20px;
        }
        h1 { font-size: 24px; margin-bottom: 12px; color: #F87171; }
        p { font-size: 14px; color: #94A3B8; margin-bottom: 20px; line-height: 1.6; }
        .error-box {
          background: #1E293B;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 16px;
          text-align: left;
          font-family: 'Consolas', 'Courier New', monospace;
          font-size: 12px;
          color: #FB923C;
          max-height: 150px;
          overflow-y: auto;
          word-break: break-all;
        }
        .retry-btn {
          margin-top: 20px;
          padding: 12px 32px;
          background: linear-gradient(135deg, #14B8A6, #0D9488);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .retry-btn:hover { opacity: 0.9; }
        .log-path {
          margin-top: 16px;
          font-size: 11px;
          color: #475569;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">⚠️</div>
        <h1>Server Failed to Start</h1>
        <p>The application server could not be started. This might be a temporary issue.</p>
        <div class="error-box">${errorMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <button class="retry-btn" onclick="window.__retry()">🔄 Retry</button>
        <div class="log-path">Log file: ${logFile.replace(/\\/g, '\\\\')}</div>
      </div>
    </body>
    </html>
  `;
  window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

// ========== LOADING PAGE ==========
function showLoadingPage(window) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 100vw; height: 100vh;
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: white;
          overflow: hidden;
        }
        .container { text-align: center; }
        .logo {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, #14B8A6, #0D9488);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          font-size: 40px; font-weight: bold;
          margin: 0 auto 20px;
          box-shadow: 0 8px 32px rgba(20,184,166,0.3);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .subtitle { font-size: 14px; color: #94A3B8; margin-bottom: 30px; }
        .loader {
          width: 200px; height: 4px;
          background: #334155; border-radius: 2px;
          overflow: hidden; margin: 0 auto;
        }
        .loader-bar {
          width: 40%; height: 100%;
          background: linear-gradient(90deg, #14B8A6, #0D9488);
          border-radius: 2px;
          animation: loading 1.5s ease-in-out infinite;
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        .status { margin-top: 16px; font-size: 12px; color: #64748B; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">A</div>
        <div class="title">Attindo</div>
        <div class="subtitle">HR & Payroll System</div>
        <div class="loader"><div class="loader-bar"></div></div>
        <div class="status" id="status">Starting server...</div>
      </div>
    </body>
    </html>
  `;
  window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

// ========== SPLASH WINDOW ==========
function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 500,
    height: 350,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    center: true,
  });

  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 500px; height: 350px;
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: white; border-radius: 16px; overflow: hidden;
        }
        .logo {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, #14B8A6, #0D9488);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          font-size: 40px; font-weight: bold;
          margin-bottom: 20px;
          box-shadow: 0 8px 32px rgba(20,184,166,0.3);
        }
        .title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .subtitle { font-size: 14px; color: #94A3B8; margin-bottom: 30px; }
        .loader {
          width: 200px; height: 4px;
          background: #334155; border-radius: 2px; overflow: hidden;
        }
        .loader-bar {
          width: 40%; height: 100%;
          background: linear-gradient(90deg, #14B8A6, #0D9488);
          border-radius: 2px;
          animation: loading 1.5s ease-in-out infinite;
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        .version { margin-top: 20px; font-size: 11px; color: #475569; }
      </style>
    </head>
    <body>
      <div class="logo">A</div>
      <div class="title">Attindo</div>
      <div class="subtitle">HR & Payroll System</div>
      <div class="loader"><div class="loader-bar"></div></div>
      <div class="version">v1.0.0</div>
    </body>
    </html>
  `;

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
  return splash;
}

// ========== MAIN WINDOW ==========
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Attindo - HR & Payroll System',
    icon: path.join(isDev ? process.cwd() : process.resourcesPath, 'public', 'logo.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#0F172A',
  });

  // Show loading page first
  showLoadingPage(mainWindow);
  mainWindow.show();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ========== MENU ==========
function createMenu() {
  const template = [
    {
      label: 'Attindo',
      submenu: [
        {
          label: 'About Attindo',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Attindo',
              message: 'Attindo - HR & Payroll System',
              detail: 'Version 1.0.0\n\nProfessional HR & Payroll Management System\n\nLog file: ' + logFile,
            });
          },
        },
        { type: 'separator' },
        { label: 'Open Log Folder', click: () => { shell.showItemInFolder(logFile); } },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Attindo' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' }, { role: 'zoom' }, { role: 'close' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ========== IPC ==========
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-database-path', () => getDatabasePath());
ipcMain.handle('get-log-path', () => logFile);
ipcMain.handle('show-open-dialog', async (e, opts) => dialog.showOpenDialog(mainWindow, opts));
ipcMain.handle('show-save-dialog', async (e, opts) => dialog.showSaveDialog(mainWindow, opts));
ipcMain.handle('window-minimize', () => mainWindow?.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window-close', () => mainWindow?.close());
ipcMain.handle('retry-server', async () => {
  try {
    await startNextServer();
    await waitForServer(nextPort);
    mainWindow.loadURL(`http://localhost:${nextPort}`);
    return true;
  } catch (e) {
    return false;
  }
});

// ========== APP LIFECYCLE ==========
app.whenReady().then(async () => {
  let splash = null;

  try {
    if (!isDev) {
      splash = createSplashWindow();
    }

    // Ensure database exists
    const dbPath = ensureDatabase();
    log('Database path: ' + dbPath);
    log('Database URL: ' + getDatabaseUrl());

    // Start Next.js server
    let serverReady = false;

    if (!isDev) {
      try {
        log('Starting Next.js standalone server...');
        await startNextServer();
        log('Server started, waiting for HTTP response...');
        await waitForServer(nextPort, 30);
        serverReady = true;
        log('Next.js server is ready!');
      } catch (serverErr) {
        log('Server start failed: ' + serverErr.message);
        log('Will try to seed and retry...');
      }
    } else {
      try {
        await waitForServer(nextPort, 5);
        serverReady = true;
      } catch (e) {
        log('Dev server not detected');
      }
    }

    // Seed database
    if (serverReady) {
      await seedViaApi();
    }

    // Close splash, create main window
    if (splash) splash.close();
    createWindow();
    createMenu();

    if (serverReady) {
      // Load the actual Next.js app
      log('Loading http://localhost:' + nextPort);
      mainWindow.loadURL(`http://localhost:${nextPort}`);
    } else {
      // Show error page with retry option
      log('Showing error page - server not ready');
      showErrorPage(mainWindow, 'The application server failed to start.\n\nPlease check the log file for details.\n\nLog: ' + logFile);
    }

    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.focus();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

  } catch (error) {
    log('Fatal error: ' + error.message + '\n' + error.stack);
    if (splash) splash.close();

    // Show error in a dialog
    dialog.showErrorBox(
      'Attindo - Startup Error',
      `Failed to start: ${error.message}\n\nLog file: ${logFile}`
    );

    // Try to create window with error page anyway
    if (!mainWindow) {
      createWindow();
      createMenu();
      showErrorPage(mainWindow, error.message + '\n\nStack: ' + error.stack);
    }

    // Don't quit - let user see the error and retry
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (nextServer) {
    log('Stopping Next.js server...');
    nextServer.kill();
    nextServer = null;
  }
  logStream.end();
});

process.on('uncaughtException', (error) => {
  log('Uncaught exception: ' + error.message + '\n' + error.stack);
});
