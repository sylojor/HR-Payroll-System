const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;

const isDev = !app.isPackaged;

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
    // In production, load from the standalone build
    mainWindow.loadFile(path.join(__dirname, '..', 'out', 'index.html'));
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
    // Start the standalone Next.js server in production
    const serverPath = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
    nextProcess = spawn(process.execPath, [serverPath], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: '3000', HOSTNAME: 'localhost' },
      stdio: 'pipe',
    });

    nextProcess.stdout?.on('data', (data) => {
      console.log(`[Next.js] ${data}`);
    });

    nextProcess.stderr?.on('data', (data) => {
      console.error(`[Next.js] ${data}`);
    });
  }
}

app.whenReady().then(() => {
  if (isDev) {
    createWindow();
  } else {
    startNextServer();
    // Wait a bit for the server to start
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
