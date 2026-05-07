const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

// Handle IPC from preload
ipcMain.on('open-log-folder', () => {
  const logDir = path.dirname(logPath);
  shell.openPath(logDir);
});

let mainWindow;
let nextProcess;

const isDev = !app.isPackaged;

// ===== CRITICAL: Prevent multiple instances =====
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ===== Log file for debugging =====
const logPath = path.join(app.getPath('userData'), 'app.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  logStream.write(line);
  console.log(line.trim());
}

log('=== Application Starting ===');
log(`isDev: ${isDev}`);
log(`userData: ${app.getPath('userData')}`);
log(`resourcesPath: ${process.resourcesPath}`);
log(`execPath: ${process.execPath}`);
log(`platform: ${process.platform}`);
log(`arch: ${process.arch}`);
log(`Node.js version: ${process.version}`);

// ===== Database path =====
function getDatabasePath() {
  if (isDev) {
    return path.join(__dirname, '..', 'db', 'custom.db');
  }
  return path.join(app.getPath('userData'), 'custom.db');
}

// Convert Windows path to proper file:// URL for Prisma/SQLite
function getDatabaseUrl() {
  const dbPath = getDatabasePath();
  // Normalize to forward slashes for URL
  const normalized = dbPath.replace(/\\/g, '/');
  if (normalized.match(/^[A-Za-z]:/)) {
    return `file:///${normalized}`;
  }
  return `file:${normalized}`;
}

// ===== Write .env file with correct DATABASE_URL =====
// This ensures the standalone server gets the correct database path,
// overriding any stale .env that was copied from the build machine (Linux).
function writeEnvFile() {
  if (isDev) {
    log('writeEnvFile: Skipping in dev mode');
    return;
  }

  const standalonePath = path.join(process.resourcesPath, 'standalone');
  const envPath = path.join(standalonePath, '.env');
  const dbUrl = getDatabaseUrl();

  try {
    // Delete any existing .env (it may contain the Linux build path)
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
      log(`writeEnvFile: Deleted existing .env at ${envPath}`);
    }

    // Write a fresh .env with the correct Windows-compatible DATABASE_URL
    const envContent = `DATABASE_URL=${dbUrl}\n`;
    fs.writeFileSync(envPath, envContent, 'utf8');
    log(`writeEnvFile: Wrote .env with DATABASE_URL=${dbUrl}`);
  } catch (err) {
    log(`writeEnvFile: ERROR - ${err.message}`);
  }
}

// ===== Loading HTML =====
function getLoadingHTML() {
  return `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      display: flex; justify-content: center; align-items: center;
      height: 100vh; color: white;
    }
    .container { text-align: center; }
    .spinner {
      width: 60px; height: 60px; margin: 0 auto 24px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 28px; margin-bottom: 12px; }
    p { font-size: 16px; opacity: 0.9; }
    .status { margin-top: 20px; font-size: 14px; opacity: 0.7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>نظام الموارد البشرية والرواتب</h1>
    <p>جاري تشغيل النظام...</p>
    <p class="status" id="status">يرجى الانتظار</p>
  </div>
  <script>
    let dots = 0;
    setInterval(() => {
      dots = (dots + 1) % 4;
      document.getElementById('status').textContent = 'يرجى الانتظار' + '.'.repeat(dots);
    }, 500);
  </script>
</body>
</html>`;
}

// ===== Error HTML =====
function getErrorHTML(error, logPathStr) {
  const escapedError = (error || 'خطأ غير معروف')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const escapedLogPath = (logPathStr || '').replace(/\\/g, '\\\\');

  return `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #fef2f2; display: flex; justify-content: center; align-items: center;
      height: 100vh; color: #991b1b;
    }
    .container { text-align: center; max-width: 650px; padding: 40px; }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { font-size: 16px; margin-bottom: 8px; color: #b91c1c; }
    .details { 
      background: #fee2e2; border-radius: 8px; padding: 16px; 
      margin-top: 16px; text-align: right; font-size: 13px;
      font-family: monospace; direction: ltr; white-space: pre-wrap;
      max-height: 200px; overflow-y: auto;
    }
    .loginfo { margin-top: 16px; font-size: 13px; color: #7f1d1d; cursor: pointer; }
    .loginfo:hover { text-decoration: underline; }
    button {
      margin-top: 20px; padding: 12px 32px; background: #059669; color: white;
      border: none; border-radius: 8px; font-size: 16px; cursor: pointer;
      margin-left: 8px;
    }
    button:hover { background: #047857; }
    button.secondary { background: #6b7280; }
    button.secondary:hover { background: #4b5563; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>فشل تشغيل النظام</h1>
    <p>حدث خطأ أثناء تشغيل سيرفر النظام</p>
    <div class="details">${escapedError}</div>
    <div class="loginfo" onclick="openLog()">📄 فتح سجل الأخطاء: انقر هنا</div>
    <button onclick="location.reload()">🔄 إعادة المحاولة</button>
    <button class="secondary" onclick="openLog()">📄 فتح السجل</button>
  </div>
  <script>
    function openLog() {
      // Copy log path for user
      const logPath = '${escapedLogPath}';
      if (window.electronAPI) {
        window.electronAPI.openLogFolder();
      }
    }
  </script>
</body>
</html>`;
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'نظام الموارد البشرية والرواتب',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev,
    },
    show: false,
    backgroundColor: '#059669',
  });

  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  if (url) {
    mainWindow.loadURL(url);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Show loading page first
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getLoadingHTML())}`);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  if (isDev) {
    return true;
  }

  const standalonePath = path.join(process.resourcesPath, 'standalone');
  const serverPath = path.join(standalonePath, 'server.js');
  const dbUrl = getDatabaseUrl();
  
  log(`standalonePath: ${standalonePath}`);
  log(`serverPath: ${serverPath}`);
  log(`DATABASE_URL: ${dbUrl}`);
  log(`server.js exists: ${fs.existsSync(serverPath)}`);
  
  // Detailed verification of critical files
  const criticalPaths = [
    'server.js',
    'node_modules/next/package.json',
    'node_modules/next/dist/server/lib/start-server.js',
    'node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node',
    'node_modules/react/package.json',
    'node_modules/react-dom/package.json',
    'node_modules/@prisma/client/package.json',
    'node_modules/.prisma/client/index.js',
    'node_modules/.prisma/client/query_engine-windows.dll.node',
  ];

  log('=== Verifying critical files ===');
  for (const p of criticalPaths) {
    const fullPath = path.join(standalonePath, p);
    const exists = fs.existsSync(fullPath);
    log(`  ${exists ? '✓' : '✗'} ${p}`);
  }

  // List node_modules
  try {
    const nmPath = path.join(standalonePath, 'node_modules');
    if (fs.existsSync(nmPath)) {
      const nmFiles = fs.readdirSync(nmPath);
      log(`node_modules contents (${nmFiles.length}): ${nmFiles.join(', ')}`);
    } else {
      log('FATAL: node_modules directory does NOT exist!');
    }
  } catch (e) {
    log(`ERROR reading node_modules: ${e.message}`);
  }
  
  if (!fs.existsSync(serverPath)) {
    log('FATAL: server.js not found!');
    return false;
  }
  
  if (!fs.existsSync(path.join(standalonePath, 'node_modules', 'next'))) {
    log('FATAL: node_modules/next not found!');
    return false;
  }

  // Also write the .env file as double protection (in case server.js loads .env)
  writeEnvFile();

  // Use Electron with ELECTRON_RUN_AS_NODE to spawn the server
  const env = {
    ...process.env,
    PORT: '3000',
    HOSTNAME: 'localhost',
    NODE_ENV: 'production',
    DATABASE_URL: dbUrl,
    ELECTRON_RUN_AS_NODE: '1',
  };

  log(`Spawning server with ELECTRON_RUN_AS_NODE`);
  log(`  execPath: ${process.execPath}`);
  log(`  cwd: ${standalonePath}`);
  log(`  Node version: ${process.version}`);
  log(`  DATABASE_URL in env: ${dbUrl}`);

  try {
    nextProcess = spawn(process.execPath, [serverPath], {
      cwd: standalonePath,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let serverOutput = '';
    let serverError = '';
    let serverStarted = false;

    nextProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      log(`[Server] ${msg}`);
      serverOutput += msg + '\n';
    });

    nextProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      log(`[Server Err] ${msg}`);
      serverError += msg + '\n';
    });

    nextProcess.on('error', (err) => {
      log(`Server spawn error: ${err.message}`);
      serverError = `Spawn error: ${err.message}`;
    });

    nextProcess.on('exit', (code, signal) => {
      log(`Server exited with code=${code} signal=${signal}`);
      if (code !== 0 && code !== null && !serverStarted) {
        const errorMsg = serverError || serverOutput || `السيرفر توقف برمز: ${code}`;
        setTimeout(() => {
          if (mainWindow) {
            mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getErrorHTML(errorMsg, logPath))}`);
          }
        }, 1000);
      }
      nextProcess = null;
    });

    log('Server process spawned successfully (PID: ' + nextProcess.pid + ')');
    return true;
  } catch (err) {
    log(`Failed to spawn server: ${err.message}`);
    return false;
  }
}

// ===== Ensure database file exists =====
// Returns true if the database was newly created (needs schema push), false otherwise.
function ensureDatabaseExists() {
  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);
  let newlyCreated = false;

  log(`ensureDatabaseExists: Database path: ${dbPath}`);
  log(`ensureDatabaseExists: Database URL: ${getDatabaseUrl()}`);

  if (!isDev) {
    // Ensure the directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      log(`ensureDatabaseExists: Created database directory: ${dbDir}`);
    }

    if (!fs.existsSync(dbPath)) {
      // Try multiple possible source locations for a pre-populated database
      const sources = [
        path.join(process.resourcesPath, 'db', 'custom.db'),
        path.join(process.resourcesPath, 'standalone', 'db', 'custom.db'),
      ];

      let copied = false;
      for (const src of sources) {
        log(`ensureDatabaseExists: Checking source: ${src} (exists: ${fs.existsSync(src)})`);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dbPath);
          log(`ensureDatabaseExists: Database copied from ${src} to: ${dbPath}`);
          copied = true;
          break;
        }
      }

      if (!copied) {
        // No source database found - create an empty SQLite file
        // Prisma will push the schema to it via runPrismaDbPush()
        log('ensureDatabaseExists: No source database found, creating empty SQLite file');
        try {
          fs.writeFileSync(dbPath, '');
          log(`ensureDatabaseExists: Created empty database file at: ${dbPath}`);
          newlyCreated = true;
        } catch (writeErr) {
          log(`ensureDatabaseExists: ERROR creating empty database - ${writeErr.message}`);
        }
      }
    } else {
      log(`ensureDatabaseExists: Database already exists at: ${dbPath}`);
      // Check if the file has any content (might be an empty file needing schema)
      try {
        const stats = fs.statSync(dbPath);
        if (stats.size === 0) {
          log('ensureDatabaseExists: Database file is empty, needs schema push');
          newlyCreated = true;
        }
      } catch (statErr) {
        log(`ensureDatabaseExists: Could not stat database file - ${statErr.message}`);
      }
    }

    // Verify the file exists now
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      log(`ensureDatabaseExists: Database file confirmed - size: ${stats.size} bytes`);
    } else {
      log('ensureDatabaseExists: ERROR - Database file does not exist after setup!');
    }
  }

  return newlyCreated;
}

// ===== Run Prisma db push to create schema =====
function runPrismaDbPush() {
  return new Promise((resolve) => {
    if (isDev) {
      log('runPrismaDbPush: Skipping in dev mode');
      return resolve(true);
    }

    const standalonePath = path.join(process.resourcesPath, 'standalone');
    const dbUrl = getDatabaseUrl();

    // Try multiple possible paths for the Prisma CLI JavaScript entry point
    // (.bin/prisma is a shell script/cmd, we need the JS file for ELECTRON_RUN_AS_NODE)
    const prismaCliCandidates = [
      path.join(standalonePath, 'node_modules', 'prisma', 'build', 'index.js'),
      path.join(process.resourcesPath, 'prisma', 'node_modules', 'prisma', 'build', 'index.js'),
      path.join(standalonePath, 'node_modules', '.bin', 'prisma'),
    ];

    // Also try multiple schema paths
    const schemaCandidates = [
      path.join(standalonePath, 'prisma', 'schema.prisma'),
      path.join(process.resourcesPath, 'prisma', 'schema.prisma'),
    ];

    let prismaCliPath = null;
    for (const candidate of prismaCliCandidates) {
      log(`runPrismaDbPush: Checking CLI path: ${candidate} (exists: ${fs.existsSync(candidate)})`);
      if (fs.existsSync(candidate)) {
        prismaCliPath = candidate;
        break;
      }
    }

    let schemaPath = null;
    for (const candidate of schemaCandidates) {
      if (fs.existsSync(candidate)) {
        schemaPath = candidate;
        break;
      }
    }

    log(`runPrismaDbPush: Using CLI path: ${prismaCliPath}`);
    log(`runPrismaDbPush: Using schema path: ${schemaPath}`);
    log(`runPrismaDbPush: DATABASE_URL: ${dbUrl}`);

    if (!prismaCliPath) {
      log('runPrismaDbPush: ERROR - Prisma CLI not found, cannot push schema');
      log('runPrismaDbPush: The app will continue but may not work correctly without database schema');
      return resolve(false);
    }

    if (!schemaPath) {
      log('runPrismaDbPush: ERROR - Prisma schema not found, cannot push schema');
      return resolve(false);
    }

    const env = {
      ...process.env,
      DATABASE_URL: dbUrl,
      ELECTRON_RUN_AS_NODE: '1',
    };

    log('runPrismaDbPush: Spawning prisma db push...');

    const prismaProcess = spawn(
      process.execPath,
      [prismaCliPath, 'db', 'push', '--schema', schemaPath, '--skip-generate', '--accept-data-loss'],
      {
        cwd: standalonePath,
        env: env,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stderr = '';

    prismaProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      log(`[Prisma] ${msg}`);
      stdout += msg + '\n';
    });

    prismaProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      log(`[Prisma Err] ${msg}`);
      stderr += msg + '\n';
    });

    // 30-second timeout
    const timeout = setTimeout(() => {
      log('runPrismaDbPush: TIMEOUT after 30 seconds, killing process');
      prismaProcess.kill();
      resolve(false);
    }, 30000);

    prismaProcess.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        log('runPrismaDbPush: Schema push completed successfully');
        resolve(true);
      } else {
        log(`runPrismaDbPush: Schema push failed with exit code ${code}`);
        log(`runPrismaDbPush: stderr: ${stderr}`);
        resolve(false);
      }
    });

    prismaProcess.on('error', (err) => {
      clearTimeout(timeout);
      log(`runPrismaDbPush: Process error - ${err.message}`);
      resolve(false);
    });
  });
}

function waitForServerAndLoad() {
  const maxRetries = 45; // 45 * 2s = 90 seconds total
  let retries = 0;

  function tryConnect() {
    log(`waitForServerAndLoad: Attempt ${retries + 1}/${maxRetries}`);

    const req = http.get('http://localhost:3000', (res) => {
      log(`waitForServerAndLoad: Server responded with status ${res.statusCode}`);
      // Consume response data to free the connection
      res.resume();

      if (res.statusCode >= 200 && res.statusCode < 400) {
        // Success - load the page
        loadApp();
      } else if (res.statusCode >= 400 && res.statusCode < 500) {
        // Client error - server is up but page might have issues
        // Try the API health check as secondary
        tryApiHealthCheck();
      } else {
        // Other status codes - retry
        retry();
      }
    });

    req.on('error', (err) => {
      if (retries % 5 === 0) {
        log(`waitForServerAndLoad: Waiting for server... (${retries}/${maxRetries}) err: ${err.message}`);
      }
      retry();
    });

    req.setTimeout(5000, () => {
      req.destroy();
      log(`waitForServerAndLoad: Request timed out, retrying...`);
      retry();
    });
  }

  function tryApiHealthCheck() {
    log('waitForServerAndLoad: Trying secondary health check at /api/dashboard');
    const req = http.get('http://localhost:3000/api/dashboard', (res) => {
      log(`waitForServerAndLoad: API health check responded with status ${res.statusCode}`);
      res.resume();
      // If the API responds at all, the server is up - load the page
      loadApp();
    });

    req.on('error', (err) => {
      log(`waitForServerAndLoad: API health check failed - ${err.message}`);
      // Server is up but API failed - still load the page, it might work partially
      loadApp();
    });

    req.setTimeout(5000, () => {
      req.destroy();
      loadApp();
    });
  }

  function loadApp() {
    log('waitForServerAndLoad: Loading app in browser window');
    if (mainWindow) {
      mainWindow.loadURL('http://localhost:3000');
    } else {
      createWindow('http://localhost:3000');
    }
  }

  function retry() {
    retries++;
    if (retries < maxRetries) {
      setTimeout(tryConnect, 2000); // 2 second interval
    } else {
      log('ERROR: Server failed to start within timeout (90 seconds)');
      // Read the log file and show last 20 lines as error details
      let logDetails = '';
      try {
        const logContent = fs.readFileSync(logPath, 'utf8');
        const lines = logContent.trim().split('\n').slice(-20);
        logDetails = lines.join('\n');
      } catch (e) {
        logDetails = 'Could not read log file';
      }

      if (mainWindow) {
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getErrorHTML(
          'انتهت مهلة تشغيل السيرفر (90 ثانية)\n\nآخر سجلات النظام:\n' + logDetails,
          logPath
        ))}`);
      }
    }
  }

  tryConnect();
}

app.whenReady().then(async () => {
  log('App is ready');

  // Step 1: Ensure the database file exists (returns true if newly created)
  const dbNewlyCreated = ensureDatabaseExists();
  log(`App startup: Database newly created = ${dbNewlyCreated}`);

  // Step 2: Write the correct .env file (overrides stale Linux paths)
  writeEnvFile();

  // Step 3: If database was newly created, push the Prisma schema
  if (dbNewlyCreated) {
    log('App startup: Database is new, running prisma db push...');
    const pushSuccess = await runPrismaDbPush();
    if (pushSuccess) {
      log('App startup: Schema push completed successfully');
    } else {
      log('App startup: WARNING - Schema push failed, app may not work correctly');
    }
  }

  if (isDev) {
    createWindow();
  } else {
    createWindow();
    // Step 4: Start the Next.js server
    const serverStarted = startNextServer();
    if (serverStarted) {
      // Step 5: Wait for server to be ready, then load the app
      waitForServerAndLoad();
    } else {
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getErrorHTML('فشل بدء تشغيل سيرفر النظام\n\nملفات التطبيق غير مكتملة\nيرجى إعادة تحميل التطبيق', logPath))}`);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log('App is quitting...');
  if (nextProcess) {
    try {
      nextProcess.kill();
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(nextProcess.pid), '/f', '/t'], { stdio: 'ignore' });
      }
    } catch (err) {
      log(`Error killing server: ${err.message}`);
    }
  }
});
