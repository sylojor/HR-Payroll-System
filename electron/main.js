const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let nextProcess;

const isDev = !app.isPackaged;

// ===== CRITICAL: Prevent multiple instances =====
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Database path - use AppData on Windows for production
function getDatabasePath() {
  if (isDev) {
    return path.join(__dirname, '..', 'db', 'custom.db');
  }
  // On Windows production, store DB in AppData
  const appDataPath = app.getPath('userData');
  return path.join(appDataPath, 'custom.db');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'نظام الموارد البشرية والرواتب',
    icon: path.join(__dirname, '..', 'public', 'logo.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev,
    },
    show: false,
    backgroundColor: '#ffffff',
  });

  // Remove default menu in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, connect to the local Next.js server
    mainWindow.loadURL('http://localhost:3000');
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
    
    // ===== FIX: Use ELECTRON_RUN_AS_NODE=1 to run as Node.js =====
    // Without this, spawn(process.execPath) launches another Electron instance
    // which creates an infinite loop and crashes the computer!
    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',  // Makes Electron run as plain Node.js
      PORT: '3000',
      HOSTNAME: 'localhost',
      NODE_ENV: 'production',
      DATABASE_URL: `file:${getDatabasePath()}`,
    };

    nextProcess = spawn(process.execPath, [serverPath], {
      cwd: standalonePath,
      env,
      stdio: 'pipe',
    });

    nextProcess.stdout?.on('data', (data) => {
      console.log(`[Next.js] ${data}`);
    });

    nextProcess.stderr?.on('data', (data) => {
      console.error(`[Next.js Error] ${data}`);
    });

    nextProcess.on('error', (err) => {
      console.error('Failed to start Next.js server:', err);
    });

    nextProcess.on('exit', (code) => {
      console.log(`Next.js server exited with code ${code}`);
    });
  }
}

function ensureDatabaseExists() {
  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);
  
  if (!isDev) {
    // Ensure AppData directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // If no DB exists in AppData, copy the default one
    if (!fs.existsSync(dbPath)) {
      const defaultDbPath = path.join(process.resourcesPath, 'db', 'custom.db');
      if (fs.existsSync(defaultDbPath)) {
        fs.copyFileSync(defaultDbPath, dbPath);
        console.log('Database copied to:', dbPath);
      } else {
        console.warn('Default database not found at:', defaultDbPath);
        // Create empty database file if not exists
        // The Prisma migration will handle schema
      }
    }
  }
}

// ===== Wait for server then create window =====
function waitForServerAndCreateWindow() {
  const maxRetries = 30; // 30 * 1s = 30 seconds max
  let retries = 0;
  
  function tryConnect() {
    const http = require('http');
    const req = http.get('http://localhost:3000', (res) => {
      if (res.statusCode === 200 || res.statusCode === 302) {
        console.log('Server is ready!');
        createWindow();
      } else {
        retry();
      }
    });
    
    req.on('error', () => {
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
      console.log(`Waiting for server... (attempt ${retries}/${maxRetries})`);
      setTimeout(tryConnect, 1000);
    } else {
      console.error('Server failed to start within timeout');
      // Create window anyway - user can refresh
      createWindow();
    }
  }
  
  tryConnect();
}

app.whenReady().then(() => {
  ensureDatabaseExists();
  
  if (isDev) {
    createWindow();
  } else {
    startNextServer();
    // Wait for the Next.js server to be ready before opening window
    waitForServerAndCreateWindow();
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
  if (nextProcess) {
    nextProcess.kill();
    // Force kill after 3 seconds if still running
    setTimeout(() => {
      try { nextProcess.kill('SIGKILL'); } catch {}
    }, 3000);
  }
});
