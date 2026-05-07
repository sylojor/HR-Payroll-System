const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;

const isDev = !app.isPackaged;

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
    
    // Set up environment for the Next.js server
    const env = {
      ...process.env,
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
  }
}

function ensureDatabaseExists() {
  const fs = require('fs');
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
      }
    }
  }
}

app.whenReady().then(() => {
  ensureDatabaseExists();
  
  if (isDev) {
    createWindow();
  } else {
    startNextServer();
    // Wait for the server to start
    setTimeout(() => {
      createWindow();
    }, 3000);
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
  }
});
