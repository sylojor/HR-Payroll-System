const { app, BrowserWindow, globalShortcut, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let nextServer = null;
const nextPort = 3000;

// Determine if we're in development or production
const isDev = !app.isPackaged;

// Get the app data directory for database
function getAppDataDir() {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

// Get the database path
function getDatabasePath() {
  return path.join(getAppDataDir(), 'attindo.db');
}

// Ensure database exists
function ensureDatabase() {
  const dbPath = getDatabasePath();
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '');
    console.log('[Attindo] Created new database at:', dbPath);
  }
  return dbPath;
}

// Seed database if empty (first run)
function seedDatabase() {
  return new Promise((resolve) => {
    const dbPath = getDatabasePath();
    const dbSize = fs.statSync(dbPath).size;

    // If database has data, skip seeding
    if (dbSize > 1024) {
      console.log('[Attindo] Database already has data, skipping seed');
      resolve();
      return;
    }

    console.log('[Attindo] First run detected, seeding database...');

    const env = {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
    };

    // Try to find the seed script
    const possibleSeedPaths = isDev
      ? [path.join(process.cwd(), 'scripts', 'seed.ts')]
      : [
          path.join(process.resourcesPath, 'scripts', 'seed.ts'),
          path.join(process.resourcesPath, 'next-standalone', 'scripts', 'seed.ts'),
        ];

    let seedPath = null;
    for (const p of possibleSeedPaths) {
      if (fs.existsSync(p)) {
        seedPath = p;
        break;
      }
    }

    if (!seedPath) {
      console.warn('[Attindo] Seed script not found, skipping seed');
      resolve();
      return;
    }

    // Run with bun or tsx
    const cmd = process.platform === 'win32' ? 'npx' : 'npx';
    const child = spawn(cmd, ['tsx', seedPath], {
      env,
      shell: true,
      stdio: 'pipe',
      cwd: isDev ? process.cwd() : path.dirname(seedPath),
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('[Seed]', data.toString());
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('[Seed Error]', data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('[Attindo] Database seeded successfully');
      } else {
        console.warn('[Attindo] Seed failed with code', code, stderr);
      }
      resolve();
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill();
      resolve();
    }, 30000);
  });
}

// Run Prisma db push
function initDatabase() {
  return new Promise((resolve) => {
    const dbPath = getDatabasePath();

    if (isDev) {
      // In dev mode, just make sure the database file exists
      ensureDatabase();
      resolve();
      return;
    }

    // In production, use prisma db push with the bundled schema
    const prismaSchemaPath = path.join(process.resourcesPath, 'prisma', 'schema.prisma');

    if (!fs.existsSync(prismaSchemaPath)) {
      console.warn('[Attindo] Prisma schema not found, skipping db push');
      ensureDatabase();
      resolve();
      return;
    }

    const env = {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
    };

    const prismaBin = path.join(
      process.resourcesPath,
      'next-standalone',
      'node_modules',
      '.bin',
      'prisma'
    );

    const cmd = `"${prismaBin}" db push --schema="${prismaSchemaPath}" --skip-generate`;
    console.log('[Attindo] Running:', cmd);

    const child = spawn(cmd, [], {
      env,
      shell: true,
      stdio: 'pipe',
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.stdout.on('data', (data) => {
      console.log('[Prisma]', data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('[Attindo] Database schema applied successfully');
      } else {
        console.warn('[Attindo] Prisma push failed, continuing:', stderr);
        ensureDatabase();
      }
      resolve();
    });

    setTimeout(() => {
      child.kill();
      resolve();
    }, 20000);
  });
}

// Start Next.js server
function startNextServer() {
  return new Promise((resolve, reject) => {
    const dbPath = getDatabasePath();
    const env = {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
      PORT: String(nextPort),
      HOSTNAME: 'localhost',
      NODE_ENV: 'production',
    };

    if (isDev) {
      console.log('[Attindo] Development mode - assuming Next.js is running on port', nextPort);
      resolve(nextPort);
      return;
    }

    // In production, start the standalone Next.js server
    const serverPath = path.join(process.resourcesPath, 'next-standalone', 'server.js');
    console.log('[Attindo] Starting Next.js server from:', serverPath);

    if (!fs.existsSync(serverPath)) {
      console.error('[Attindo] Server file not found at:', serverPath);
      reject(new Error('Server file not found'));
      return;
    }

    nextServer = spawn('node', [serverPath], {
      env,
      cwd: path.join(process.resourcesPath, 'next-standalone'),
      stdio: 'pipe',
    });

    nextServer.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Next.js]', output.trim());
    });

    nextServer.stderr.on('data', (data) => {
      console.error('[Next.js Error]', data.toString().trim());
    });

    nextServer.on('close', (code) => {
      console.log('[Next.js] Server exited with code', code);
    });

    // Timeout
    setTimeout(() => {
      resolve(nextPort);
    }, 30000);
  });
}

// Wait for server to be ready
function waitForServer(port, maxRetries = 30) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        resolve(true);
      });
      req.on('error', () => {
        retries++;
        if (retries >= maxRetries) {
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(check, 1000);
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        retries++;
        if (retries >= maxRetries) {
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(check, 1000);
        }
      });
    };
    check();
  });
}

// Create splash window
function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 500,
    height: 350,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
  });

  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 500px;
          height: 350px;
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: white;
          border-radius: 16px;
          overflow: hidden;
        }
        .logo {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #14B8A6, #0D9488);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          font-weight: bold;
          margin-bottom: 20px;
          box-shadow: 0 8px 32px rgba(20, 184, 166, 0.3);
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        .subtitle {
          font-size: 14px;
          color: #94A3B8;
          margin-bottom: 30px;
        }
        .loader {
          width: 200px;
          height: 4px;
          background: #334155;
          border-radius: 2px;
          overflow: hidden;
        }
        .loader-bar {
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, #14B8A6, #0D9488);
          border-radius: 2px;
          animation: loading 1.5s ease-in-out infinite;
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        .version {
          margin-top: 20px;
          font-size: 11px;
          color: #475569;
        }
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

// Create main window
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
    titleBarStyle: 'default',
  });

  const url = `http://localhost:${nextPort}`;
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create application menu
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
              detail:
                'Version 1.0.0\n\nProfessional HR & Payroll Management System with ZK Fingerprint Support\n\n© 2025 Attindo. All rights reserved.',
            });
          },
        },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Attindo' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'selectAll', label: 'Select All' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { role: 'toggleDevTools', label: 'Developer Tools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Reset Zoom' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Full Screen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'zoom', label: 'Zoom' },
        { role: 'close', label: 'Close' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-database-path', () => getDatabasePath());
ipcMain.handle('show-open-dialog', async (event, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});
ipcMain.handle('show-save-dialog', async (event, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});
ipcMain.handle('window-minimize', () => mainWindow?.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window-close', () => mainWindow?.close());

// App lifecycle
app.whenReady().then(async () => {
  let splash = null;

  try {
    // Show splash screen in production
    if (!isDev) {
      splash = createSplashWindow();
    }

    console.log('[Attindo] Starting Attindo HR & Payroll System...');
    console.log('[Attindo] Mode:', isDev ? 'Development' : 'Production');
    console.log('[Attindo] App Path:', app.getAppPath());
    console.log('[Attindo] Resources:', process.resourcesPath);

    // Ensure database directory exists
    const dbPath = ensureDatabase();
    console.log('[Attindo] Database path:', dbPath);

    // Initialize database schema
    await initDatabase();

    // Seed database if first run
    await seedDatabase();

    // Start Next.js server
    if (!isDev) {
      await startNextServer();
      try {
        await waitForServer(nextPort);
        console.log('[Attindo] Next.js server is ready');
      } catch (e) {
        console.warn('[Attindo] Server readiness check timed out, trying to load anyway...');
      }
    } else {
      // In dev mode, wait for existing server
      try {
        await waitForServer(nextPort, 5);
      } catch (e) {
        console.warn('[Attindo] Next.js dev server not detected. Make sure to run "bun run dev" separately.');
      }
    }

    // Close splash and create main window
    if (splash) {
      splash.close();
    }
    createWindow();
    createMenu();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('[Attindo] Failed to start:', error);
    if (splash) splash.close();
    dialog.showErrorBox(
      'Attindo - Startup Error',
      `Failed to start Attindo: ${error.message}\n\nPlease try reinstalling the application.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    console.log('[Attindo] Stopping Next.js server...');
    nextServer.kill();
    nextServer = null;
  }
});

process.on('uncaughtException', (error) => {
  console.error('[Attindo] Uncaught exception:', error);
});
