const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let nextProcess;
let serverReady = false;

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
log(`app.getPath('userData'): ${app.getPath('userData')}`);
log(`process.resourcesPath: ${process.resourcesPath}`);
log(`process.execPath: ${process.execPath}`);

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
  // Convert backslashes to forward slashes for URL
  const normalized = dbPath.replace(/\\/g, '/');
  // Ensure proper file URL format
  if (normalized.startsWith('/') || normalized.match(/^[A-Za-z]:/)) {
    return `file://${normalized}`;
  }
  return `file:${normalized}`;
}

// ===== Loading HTML shown while server starts =====
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

// ===== Error HTML shown if server fails =====
function getErrorHTML(error) {
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
    .container { text-align: center; max-width: 500px; padding: 40px; }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { font-size: 16px; margin-bottom: 8px; color: #b91c1c; }
    .details { 
      background: #fee2e2; border-radius: 8px; padding: 16px; 
      margin-top: 16px; text-align: right; font-size: 13px;
      font-family: monospace; direction: ltr; white-space: pre-wrap;
    }
    button {
      margin-top: 24px; padding: 12px 32px; background: #059669; color: white;
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
    <button onclick="location.reload()">إعادة المحاولة</button>
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

  // Remove default menu in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Load the URL or loading page
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

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  if (!isDev) {
    const standalonePath = path.join(process.resourcesPath, 'standalone');
    const serverPath = path.join(standalonePath, 'server.js');
    const dbUrl = getDatabaseUrl();
    
    log(`standalonePath: ${standalonePath}`);
    log(`serverPath: ${serverPath}`);
    log(`DATABASE_URL: ${dbUrl}`);
    log(`server.js exists: ${fs.existsSync(serverPath)}`);
    
    if (!fs.existsSync(serverPath)) {
      log('ERROR: server.js not found!');
      return false;
    }
    
    // ===== Use ELECTRON_RUN_AS_NODE=1 =====
    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: '3000',
      HOSTNAME: 'localhost',
      NODE_ENV: 'production',
      DATABASE_URL: dbUrl,
    };

    try {
      nextProcess = spawn(process.execPath, [serverPath], {
        cwd: standalonePath,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      nextProcess.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        log(`[Server] ${msg}`);
        if (msg.includes('Ready') || msg.includes('started') || msg.includes('listening')) {
          serverReady = true;
        }
      });

      nextProcess.stderr.on('data', (data) => {
        log(`[Server Err] ${data.toString().trim()}`);
      });

      nextProcess.on('error', (err) => {
        log(`Server spawn error: ${err.message}`);
      });

      nextProcess.on('exit', (code, signal) => {
        log(`Server exited with code=${code} signal=${signal}`);
        nextProcess = null;
      });

      log('Server process spawned successfully');
      return true;
    } catch (err) {
      log(`Failed to spawn server: ${err.message}`);
      return false;
    }
  }
  return true;
}

function ensureDatabaseExists() {
  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);
  
  log(`Database path: ${dbPath}`);
  
  if (!isDev) {
    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      log(`Created database directory: ${dbDir}`);
    }
    
    // If no DB exists, copy the default one
    if (!fs.existsSync(dbPath)) {
      const defaultDbPath = path.join(process.resourcesPath, 'db', 'custom.db');
      log(`Default DB path: ${defaultDbPath}`);
      log(`Default DB exists: ${fs.existsSync(defaultDbPath)}`);
      
      if (fs.existsSync(defaultDbPath)) {
        fs.copyFileSync(defaultDbPath, dbPath);
        log(`Database copied to: ${dbPath}`);
      } else {
        log(`WARNING: Default database not found`);
      }
    } else {
      log(`Database already exists at: ${dbPath}`);
    }
  }
}

// ===== Wait for server then load the app =====
function waitForServerAndLoad() {
  const maxRetries = 40; // 40 * 1s = 40 seconds max
  let retries = 0;
  
  function tryConnect() {
    const req = http.get('http://localhost:3000', (res) => {
      log(`Server responded with status: ${res.statusCode}`);
      if (res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 304) {
        serverReady = true;
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
      log(`Connection error: ${err.message}`);
      retry();
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      retry();
    });
  }
  
  function retry() {
    retries++;
    if (retries < maxRetries) {
      log(`Waiting for server... (${retries}/${maxRetries})`);
      setTimeout(tryConnect, 1000);
    } else {
      log('ERROR: Server failed to start within timeout');
      if (mainWindow) {
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getErrorHTML('انتهت مهلة تشغيل السيرفر. تأكد من أن المنفذ 3000 غير مستخدم من تطبيق آخر.'))}`);
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
    // Create window with loading page first
    createWindow();
    
    // Start the Next.js server
    const serverStarted = startNextServer();
    if (serverStarted) {
      // Wait for server then navigate to it
      waitForServerAndLoad();
    } else {
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getErrorHTML('فشل بدء تشغيل سيرفر Next.js'))}`);
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
      // On Windows, use taskkill for force
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(nextProcess.pid), '/f', '/t'], { stdio: 'ignore' });
      }
    } catch (err) {
      log(`Error killing server: ${err.message}`);
    }
  }
});
