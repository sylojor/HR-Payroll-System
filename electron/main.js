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

function ensureDatabaseExists() {
  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);
  
  log(`Database path: ${dbPath}`);
  log(`Database URL: ${getDatabaseUrl()}`);
  
  if (!isDev) {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      log(`Created database directory: ${dbDir}`);
    }
    
    if (!fs.existsSync(dbPath)) {
      // Try multiple possible source locations
      const sources = [
        path.join(process.resourcesPath, 'db', 'custom.db'),
        path.join(process.resourcesPath, 'standalone', 'db', 'custom.db'),
      ];
      
      let copied = false;
      for (const src of sources) {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dbPath);
          log(`Database copied from ${src} to: ${dbPath}`);
          copied = true;
          break;
        }
      }
      
      if (!copied) {
        log('WARNING: Could not find default database to copy');
      }
    } else {
      log(`Database already exists at: ${dbPath}`);
    }
  }
}

function waitForServerAndLoad() {
  const maxRetries = 60;
  let retries = 0;
  
  function tryConnect() {
    const req = http.get('http://localhost:3000', (res) => {
      log(`Server responded: ${res.statusCode}`);
      if (res.statusCode >= 200 && res.statusCode < 400) {
        if (mainWindow) {
          mainWindow.loadURL('http://localhost:3000');
        } else {
          createWindow('http://localhost:3000');
        }
      } else {
        retry();
      }
    });
    
    req.on('error', (err) => {
      if (retries % 5 === 0) {
        log(`Waiting for server... (${retries}/${maxRetries}) err: ${err.message}`);
      }
      retry();
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      retry();
    });
  }
  
  function retry() {
    retries++;
    if (retries < maxRetries) {
      setTimeout(tryConnect, 1000);
    } else {
      log('ERROR: Server failed to start within timeout');
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
          'انتهت مهلة تشغيل السيرفر (60 ثانية)\n\nآخر سجلات النظام:\n' + logDetails, 
          logPath
        ))}`);
      }
    }
  }
  
  tryConnect();
}

app.whenReady().then(() => {
  log('App is ready');
  ensureDatabaseExists();
  
  if (isDev) {
    createWindow();
  } else {
    createWindow();
    const serverStarted = startNextServer();
    if (serverStarted) {
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
