const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
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
log('Version: 1.7.0');
log('Mode: ' + (isDev ? 'Development' : 'Production'));
log('App Path: ' + app.getAppPath());
log('Resources: ' + process.resourcesPath);
log('User Data: ' + app.getPath('userData'));
log('Platform: ' + process.platform);
log('Arch: ' + process.arch);

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

function getDatabaseUrl() {
  const dbPath = getDatabasePath();
  let normalizedPath = dbPath.replace(/\\/g, '/');
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }
  return 'file:' + normalizedPath;
}

/**
 * Initialize the database by copying the template database from resources.
 * This is the MOST RELIABLE way to ensure the database has all tables:
 * we pre-create the database during the CI build and bundle it.
 * No need for `prisma db push` at runtime!
 */
function initializeDatabase() {
  const dbPath = getDatabasePath();
  const dataDir = getAppDataDir();

  // If database already exists and has content, check if it's valid
  if (fs.existsSync(dbPath)) {
    const stat = fs.statSync(dbPath);
    if (stat.size > 100) {
      log('Database already exists (' + stat.size + ' bytes) ✅');
      return true;
    } else {
      log('Database file is empty/corrupt (' + stat.size + ' bytes), removing...');
      try { fs.unlinkSync(dbPath); } catch (e) {
        log('Failed to remove corrupt database: ' + e.message);
        return false;
      }
    }
  }

  // Try to copy the template database from resources
  const templatePaths = [
    path.join(process.resourcesPath, 'db', 'template.db'),
    path.join(process.resourcesPath, 'app', 'db', 'template.db'),
    path.join(__dirname, '..', 'db', 'template.db'),
  ];

  for (const templatePath of templatePaths) {
    if (fs.existsSync(templatePath)) {
      try {
        fs.copyFileSync(templatePath, dbPath);
        const stat = fs.statSync(dbPath);
        log('Database initialized from template (' + stat.size + ' bytes) ✅');
        return true;
      } catch (e) {
        log('Failed to copy template database from ' + templatePath + ': ' + e.message);
      }
    }
  }

  log('⚠️ No template database found in resources');
  log('Will attempt prisma db push as fallback...');

  // Fallback: try prisma db push
  return runPrismaDbPush();
}

// ========== PRISMA DB PUSH (FALLBACK) ==========
function runPrismaDbPush() {
  return new Promise((resolve) => {
    const standaloneDir = findStandaloneDir();
    if (!standaloneDir) {
      log('Standalone directory not found, cannot run prisma db push');
      resolve(false);
      return;
    }

    const nodeBinary = findNodeBinary();
    const dbUrl = getDatabaseUrl();

    // Find prisma CLI
    const prismaLocations = [
      path.join(standaloneDir, '.next', 'node_modules', 'prisma', 'build', 'index.js'),
      path.join(standaloneDir, 'node_modules', 'prisma', 'build', 'index.js'),
    ];

    let prismaCli = null;
    for (const loc of prismaLocations) {
      if (fs.existsSync(loc)) {
        prismaCli = loc;
        log('Found Prisma CLI at: ' + loc);
        break;
      }
    }

    const schemaPath = path.join(standaloneDir, 'prisma', 'schema.prisma');
    if (!fs.existsSync(schemaPath)) {
      log('⚠️ Prisma schema not found, skipping db push');
      resolve(false);
      return;
    }

    if (!prismaCli) {
      log('⚠️ Prisma CLI not found, skipping db push');
      resolve(false);
      return;
    }

    log('Running prisma db push (fallback)...');
    log('  DATABASE_URL: ' + dbUrl);

    const env = {
      ...process.env,
      DATABASE_URL: dbUrl,
      NODE_ENV: 'production',
    };

    if (nodeBinary === process.execPath) {
      env.ELECTRON_RUN_AS_NODE = '1';
    }

    const prismaProc = spawn(nodeBinary, [prismaCli, 'db', 'push', '--schema', schemaPath, '--skip-generate', '--accept-data-loss'], {
      env,
      cwd: standaloneDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';

    prismaProc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      log('[prisma] ' + text.trim());
    });

    prismaProc.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      log('[prisma stderr] ' + text.trim());
    });

    prismaProc.on('error', (err) => {
      log('prisma db push spawn error: ' + err.message);
      resolve(false);
    });

    prismaProc.on('close', (code) => {
      if (code === 0) {
        log('✅ prisma db push completed');
        resolve(true);
      } else {
        log('⚠️ prisma db push exited with code ' + code);
        const dbPath = getDatabasePath();
        if (fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0) {
          log('Database file exists with content, continuing...');
          resolve(true);
        } else {
          resolve(false);
        }
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      log('prisma db push timeout, killing process');
      prismaProc.kill();
      resolve(false);
    }, 30000);
  });
}

// ========== FIND NODE.JS BINARY ==========
function findNodeBinary() {
  const possiblePaths = [
    path.join(process.resourcesPath, 'node', 'node.exe'),
    path.join(process.resourcesPath, 'node', 'node'),
    path.join(process.resourcesPath, 'app', 'node', 'node.exe'),
    path.join(process.resourcesPath, 'app', 'node', 'node'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      log('Found bundled Node.js: ' + p);
      return p;
    }
  }

  log('No bundled Node.js found, will use Electron as Node.js fallback');
  return process.execPath;
}

// ========== STANDALONE SERVER SETUP ==========
function findServerPath() {
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

// ========== ENSURE NODE_MODULES IS ACCESSIBLE ==========
function ensureNodeModulesAccessible(standaloneDir) {
  const rootNm = path.join(standaloneDir, 'node_modules');
  const nextNm = path.join(standaloneDir, '.next', 'node_modules');

  if (fs.existsSync(rootNm)) {
    const nextMod = path.join(rootNm, 'next');
    if (fs.existsSync(nextMod)) {
      log('Root node_modules exists with next module ✅');
      return rootNm;
    }
  }

  log('Root node_modules missing or incomplete');

  if (fs.existsSync(nextNm)) {
    const nextMod = path.join(nextNm, 'next');
    if (fs.existsSync(nextMod)) {
      log('Found .next/node_modules with next module ✅');
      try {
        if (fs.existsSync(rootNm)) {
          fs.rmSync(rootNm, { recursive: true, force: true });
        }
        fs.symlinkSync(nextNm, rootNm, 'junction');
        log('Created node_modules junction -> .next/node_modules ✅');
        return rootNm;
      } catch (symlinkErr) {
        log('Failed to create junction: ' + symlinkErr.message);
        return nextNm;
      }
    } else {
      log('.next/node_modules exists but next module NOT found!');
      try {
        const entries = fs.readdirSync(nextNm);
        log('  .next/node_modules has ' + entries.length + ' entries: ' + entries.slice(0, 20).join(', '));
      } catch (e) {}
    }
  } else {
    log('.next/node_modules NOT found!');
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
      reject(new Error('Next.js server not found'));
      return;
    }

    log('Server path: ' + serverPath);
    log('Standalone dir: ' + standaloneDir);

    const nodeModulesPath = ensureNodeModulesAccessible(standaloneDir);

    const dbUrl = getDatabaseUrl();
    log('Database URL: ' + dbUrl);

    const nodeBinary = findNodeBinary();
    const usingElectronAsNode = (nodeBinary === process.execPath);
    log('Node binary: ' + nodeBinary);
    log('Using Electron as Node: ' + usingElectronAsNode);

    // Build NODE_PATH
    const nodePathParts = [];
    if (nodeModulesPath) {
      nodePathParts.push(nodeModulesPath);
    }
    const nextNm = path.join(standaloneDir, '.next', 'node_modules');
    if (fs.existsSync(nextNm) && !nodePathParts.includes(nextNm)) {
      nodePathParts.push(nextNm);
    }
    const nodePathValue = nodePathParts.join(path.delimiter);
    log('NODE_PATH will be: ' + nodePathValue);

    // IMPORTANT: Remove any .env file in the standalone directory that could
    // override our DATABASE_URL. We set DATABASE_URL via environment variable.
    const envFile = path.join(standaloneDir, '.env');
    if (fs.existsSync(envFile)) {
      try {
        const envContent = fs.readFileSync(envFile, 'utf8');
        if (envContent.includes('DATABASE_URL')) {
          log('⚠️ Removing .env file with DATABASE_URL to avoid conflict with runtime DB path');
          fs.unlinkSync(envFile);
        }
      } catch (e) {
        log('Could not check/remove .env: ' + e.message);
      }
    }

    // Build environment for the server process
    const serverEnv = {
      ...process.env,
      DATABASE_URL: dbUrl,
      PORT: String(nextPort),
      HOSTNAME: '0.0.0.0',
      NODE_ENV: 'production',
      NODE_PATH: nodePathValue,
    };

    if (usingElectronAsNode) {
      serverEnv.ELECTRON_RUN_AS_NODE = '1';
    }

    log('Starting server with env PORT=' + nextPort + ' HOSTNAME=0.0.0.0');

    try {
      nextServer = spawn(nodeBinary, [serverPath], {
        env: serverEnv,
        cwd: standaloneDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let serverStarted = false;

      nextServer.stdout.on('data', (data) => {
        const output = data.toString();
        log('[Next.js] ' + output.trim());

        if (!serverStarted && (output.includes('Ready') || output.includes('started') || output.includes('Listening') || output.includes('Local:'))) {
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
        if (!serverStarted) {
          reject(err);
        }
      });

      nextServer.on('close', (code, signal) => {
        log('[Next.js] Server exited with code=' + code + ' signal=' + signal);
        nextServer = null;
        if (!serverStarted) {
          reject(new Error('Server exited before becoming ready with code ' + code));
        }
      });

      // Timeout
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

// ========== AUTO-INITIALIZE DATABASE ==========
// After the server starts, check if setup is needed and auto-create admin user
async function autoInitializeDatabase() {
  try {
    // Check if setup is needed
    const checkRes = await fetch(`http://localhost:${nextPort}/api/setup/check`);
    if (!checkRes.ok) {
      log('Setup check returned status ' + checkRes.status);
      return false;
    }
    const checkData = await checkRes.json();

    if (!checkData.needsSetup) {
      log('Database already has users, no auto-init needed ✅');
      return true;
    }

    log('No users found, auto-creating default admin user...');

    // Auto-create a default admin user with sensible defaults
    const setupRes = await fetch(`http://localhost:${nextPort}/api/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: {
          name: 'My Company',
          nameAr: 'شركتي',
          address: '',
          phone: '',
          email: '',
          currency: 'JOD',
          currencySymbol: 'د.ا',
        },
        adminUser: {
          username: 'admin',
          password: 'admin123',
          name: 'Administrator',
          email: '',
        },
        settings: {
          workingHoursPerDay: 8,
          overtimeRate: 1.5,
        },
      }),
    });

    if (setupRes.ok) {
      const data = await setupRes.json();
      log('✅ Default admin user created successfully');
      log('  Username: admin');
      log('  Password: admin123');
      return true;
    } else {
      const errData = await setupRes.json().catch(() => ({}));
      log('⚠️ Auto-init failed: ' + (errData.error || 'Unknown error'));
      return false;
    }
  } catch (e) {
    log('Auto-initialization error: ' + e.message);
    return false;
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
        .icon { font-size: 60px; margin-bottom: 20px; }
        h1 { font-size: 24px; margin-bottom: 12px; color: #F87171; }
        p { font-size: 14px; color: #94A3B8; margin-bottom: 20px; line-height: 1.6; }
        .error-box {
          background: #1E293B; border: 1px solid #334155; border-radius: 8px;
          padding: 16px; text-align: left;
          font-family: 'Consolas', 'Courier New', monospace; font-size: 12px;
          color: #FB923C; max-height: 150px; overflow-y: auto; word-break: break-all;
        }
        .retry-btn {
          margin-top: 20px; padding: 12px 32px;
          background: linear-gradient(135deg, #14B8A6, #0D9488);
          color: white; border: none; border-radius: 8px; font-size: 16px;
          cursor: pointer; transition: opacity 0.2s;
        }
        .retry-btn:hover { opacity: 0.9; }
        .log-path { margin-top: 16px; font-size: 11px; color: #475569; }
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
          color: white; overflow: hidden;
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
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .subtitle { font-size: 14px; color: #94A3B8; margin-bottom: 30px; }
        .loader { width: 200px; height: 4px; background: #334155; border-radius: 2px; overflow: hidden; margin: 0 auto; }
        .loader-bar { width: 40%; height: 100%; background: linear-gradient(90deg, #14B8A6, #0D9488); border-radius: 2px; animation: loading 1.5s ease-in-out infinite; }
        @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
        .status { margin-top: 16px; font-size: 12px; color: #64748B; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">A</div>
        <div class="title">Attindo</div>
        <div class="subtitle">HR & Payroll System</div>
        <div class="loader"><div class="loader-bar"></div></div>
        <div class="status">Starting server...</div>
      </div>
    </body>
    </html>
  `;
  window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

// ========== SPLASH WINDOW ==========
function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 500, height: 350, transparent: true, frame: false,
    alwaysOnTop: true, resizable: false, center: true,
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
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: white; border-radius: 16px; overflow: hidden;
        }
        .logo {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, #14B8A6, #0D9488);
          border-radius: 20px; display: flex; align-items: center; justify-content: center;
          font-size: 40px; font-weight: bold; margin-bottom: 20px;
          box-shadow: 0 8px 32px rgba(20,184,166,0.3);
        }
        .title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .subtitle { font-size: 14px; color: #94A3B8; margin-bottom: 30px; }
        .loader { width: 200px; height: 4px; background: #334155; border-radius: 2px; overflow: hidden; }
        .loader-bar { width: 40%; height: 100%; background: linear-gradient(90deg, #14B8A6, #0D9488); border-radius: 2px; animation: loading 1.5s ease-in-out infinite; }
        @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
        .version { margin-top: 20px; font-size: 11px; color: #475569; }
      </style>
    </head>
    <body>
      <div class="logo">A</div>
      <div class="title">Attindo</div>
      <div class="subtitle">HR & Payroll System</div>
      <div class="loader"><div class="loader-bar"></div></div>
      <div class="version">v1.7.0</div>
    </body>
    </html>
  `;

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
  return splash;
}

// ========== MAIN WINDOW ==========
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1024, minHeight: 700,
    title: 'Attindo - HR & Payroll System',
    icon: path.join(isDev ? process.cwd() : process.resourcesPath, 'public', 'logo.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true,
    },
    show: false, backgroundColor: '#0F172A',
  });

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
              type: 'info', title: 'About Attindo',
              message: 'Attindo - HR & Payroll System',
              detail: 'Version 1.7.0\n\nProfessional HR & Payroll Management System\n\nLog file: ' + logFile,
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
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ========== IPC ==========
ipcMain.handle('get-app-version', () => '1.7.0');
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
    showLoadingPage(mainWindow);
    await startNextServer();
    await waitForServer(nextPort, 20);
    mainWindow.loadURL(`http://localhost:${nextPort}`);
    return true;
  } catch (e) {
    log('Retry failed: ' + e.message);
    showErrorPage(mainWindow, 'Retry failed: ' + e.message);
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

    // Step 1: Initialize database
    log('--- Step 1: Initialize Database ---');
    const dbInitialized = initializeDatabase();
    log('Database initialization result: ' + (dbInitialized ? 'SUCCESS' : 'FALLBACK NEEDED'));

    // Step 2: Start Next.js server
    let serverReady = false;

    if (!isDev) {
      log('--- Step 2: Start Next.js Server ---');
      try {
        await startNextServer();
        await waitForServer(nextPort, 30);
        serverReady = true;
        log('✅ Next.js server is ready!');
      } catch (serverErr) {
        log('Server start failed: ' + serverErr.message);
        // Try one more time after a short delay
        try {
          log('Retrying server start in 3 seconds...');
          await new Promise(r => setTimeout(r, 3000));
          await startNextServer();
          await waitForServer(nextPort, 20);
          serverReady = true;
          log('✅ Server started on retry!');
        } catch (retryErr) {
          log('Server retry also failed: ' + retryErr.message);
        }
      }
    } else {
      try {
        await waitForServer(nextPort, 5);
        serverReady = true;
      } catch (e) {
        log('Dev server not detected');
      }
    }

    // Step 3: Auto-initialize database (create default admin if needed)
    if (serverReady) {
      log('--- Step 3: Auto-initialize Database ---');
      await autoInitializeDatabase();
    }

    // Step 4: Show main window
    if (splash) splash.close();
    createWindow();
    createMenu();

    if (serverReady) {
      log('Loading http://localhost:' + nextPort);
      mainWindow.loadURL(`http://localhost:${nextPort}`);
    } else {
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

    dialog.showErrorBox(
      'Attindo - Startup Error',
      `Failed to start: ${error.message}\n\nLog file: ${logFile}`
    );

    if (!mainWindow) {
      createWindow();
      createMenu();
      showErrorPage(mainWindow, error.message + '\n\nStack: ' + error.stack);
    }
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
