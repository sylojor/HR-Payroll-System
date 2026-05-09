const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const SERVER_PORT = 3000;
const DB_URL = 'file:/home/z/my-project/db/custom.db';

function startServer() {
  console.log('[next-server] Starting production server...');
  
  const server = spawn('node', [path.join(__dirname, '..', '..', '.next', 'standalone', 'server.js')], {
    env: {
      ...process.env,
      DATABASE_URL: DB_URL,
      PORT: String(SERVER_PORT),
      HOSTNAME: '0.0.0.0',
    },
    cwd: path.join(__dirname, '..', '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (data) => {
    console.log('[next-server]', data.toString().trim());
  });

  server.stderr.on('data', (data) => {
    console.error('[next-server stderr]', data.toString().trim());
  });

  server.on('close', (code) => {
    console.log(`[next-server] Server exited with code ${code}. Restarting in 3 seconds...`);
    setTimeout(startServer, 3000);
  });

  server.on('error', (err) => {
    console.error('[next-server] Error:', err.message);
    setTimeout(startServer, 3000);
  });

  // Keep-alive ping every 5 seconds
  const keepAlive = setInterval(() => {
    http.get(`http://localhost:${SERVER_PORT}/api/setup/check`, (res) => {
      // Server is responding
    }).on('error', () => {
      // Server might be starting up
    });
  }, 5000);

  // Cleanup on exit
  process.on('SIGTERM', () => {
    clearInterval(keepAlive);
    server.kill();
    process.exit(0);
  });
  process.on('SIGINT', () => {
    clearInterval(keepAlive);
    server.kill();
    process.exit(0);
  });
}

startServer();
