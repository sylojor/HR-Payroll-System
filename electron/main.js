const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

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

// ===== Find Node.js executable =====
function getNodePath() {
  if (isDev) {
    return 'node'; // Use system node in dev
  }
  // In production, use bundled node.exe next to the app exe
  const appDir = path.dirname(process.execPath);
  const bundledNode = path.join(appDir, 'node.exe');
  if (fs.existsSync(bundledNode)) {
    log(`Using bundled node: ${bundledNode}`);
    return bundledNode;
  }
  // Fallback: try ELECTRON_RUN_AS_NODE
  log(`WARNING: node.exe not found at ${bundledNode}, falling back to ELECTRON_RUN_AS_NODE`);
  return null;
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
function getErrorHTML(error, logPath) {
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
    .container { text-align: center; max-width: 600px; padding: 40px; }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { font-size: 16px; margin-bottom: 8px; color: #b91c1c; }
    .details { 
      background: #fee2e2; border-radius: 8px; padding: 16px; 
      margin-top: 16px; text-align: right; font-size: 13px;
      font-family: monospace; direction: ltr; white-space: pre-wrap;
      max-height: 200px; overflow-y: auto;
    }
    .loginfo { margin-top: 16px; font-size: 13px; color: #7f1d1d; }
    button {
      margin-top: 20px; padding: 12px 32px; background: #059669; color: white;
      border: none; border-radius: 8px; font-size: 16px; cursor: pointer;
    }
    button:hover { background: #047857; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>فشل تشغيل النظام</h1>
    <p>حدث خطأ أثناء تشغيل سيرفر النظام</p>
    <div class="details">${error || 'خطأ غير معروف'}</div>
    <div class="loginfo">📄 سجل الأخطاء: ${logPath || 'غير متوفر'}</div>
    <button onclick="location.reload()">🔄 إعادة المحاولة</button>
  </div>
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
  
  // List some files in standalone to verify
  try {
    const files = fs.readdirSync(standalonePath);
    log(`standalone contents: ${files.join(', ')}`);
  } catch (e) {
    log(`ERROR reading standalone dir: ${e.message}`);
  }
  
  if (!fs.existsSync(serverPath)) {
    log('FATAL: server.js not found!');
    return false;
  }
  
  // Find Node.js executable
  const nodePath = getNodePath();
  
  const env = {
    ...process.env,
    PORT: '3000',
    HOSTNAME: 'localhost',
    NODE_ENV: 'production',
    DATABASE_URL: dbUrl,
  };

  let spawnPath, spawnArgs, spawnOptions;

  if (nodePath) {
    // Use bundled node.exe
    env.ELECTRON_RUN_AS_NODE = ''; // Unset this
    spawnPath = nodePath;
    spawnArgs = [serverPath];
    spawnOptions = { cwd: standalonePath, env, stdio: ['pipe', 'pipe', 'pipe'] };
    log(`Spawning server with bundled node: ${nodePath} ${serverPath}`);
  } else {
    // Fallback: use Electron with ELECTRON_RUN_AS_NODE
    env.ELECTRON_RUN_AS_NODE = '1';
    spawnPath = process.execPath;
    spawnArgs = [serverPath];
    spawnOptions = { cwd: standalonePath, env, stdio: ['pipe', 'pipe', 'pipe'] };
    log(`Spawning server with ELECTRON_RUN_AS_NODE: ${process.execPath} ${serverPath}`);
  }

  try {
    nextProcess = spawn(spawnPath, spawnArgs, spawnOptions);

    let lastError = '';

    nextProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      log(`[Server] ${msg}`);
    });

    nextProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      log(`[Server Err] ${msg}`);
      lastError = msg;
    });

    nextProcess.on('error', (err) => {
      log(`Server spawn error: ${err.message}`);
    });

    nextProcess.on('exit', (code, signal) => {
      log(`Server exited with code=${code} signal=${signal}`);
      if (code !== 0 && code !== null) {
        // Server crashed - show error after window is created
        setTimeout(() => {
          if (mainWindow) {
            mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getErrorHTML(`السيرفر توقف برمز: ${code}\n${lastError}`, logPath))}`);
          }
        }, 1000);
      }
      nextProcess = null;
    });

    log('Server process spawned successfully');
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
      const defaultDbPath = path.join(process.resourcesPath, 'db', 'custom.db');
      log(`Default DB: ${defaultDbPath} exists=${fs.existsSync(defaultDbPath)}`);
      
      if (fs.existsSync(defaultDbPath)) {
        fs.copyFileSync(defaultDbPath, dbPath);
        log(`Database copied to: ${dbPath}`);
      } else {
        log(`WARNING: Default database not found at ${defaultDbPath}`);
      }
    } else {
      log(`Database already exists at: ${dbPath}`);
    }
  }
}

function waitForServerAndLoad() {
  const maxRetries = 50; // 50 * 1s = 50 seconds
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
      if (mainWindow) {
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getErrorHTML('انتهت مهلة تشغيل السيرفر (50 ثانية).\n\nالحلول الممكنة:\n1. تأكد أن المنفذ 3000 غير مستخدم\n2. أغلق أي تطبيق يستخدم المنفذ 3000\n3. شغّل التطبيق كمسؤول', logPath))}`);
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
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getErrorHTML('فشل بدء تشغيل سيرفر Next.js\n\nقد يكون node.exe غير موجود بجانب التطبيق', logPath))}`);
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
