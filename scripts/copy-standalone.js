// Cross-platform copy script for Next.js standalone build
// Works on both Windows and Linux/macOS

const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️ Source not found: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (e) {
        console.warn(`⚠️ Failed to copy ${srcPath}: ${e.message}`);
      }
    }
  }
}

function copyModule(name) {
  const src = path.join(process.cwd(), 'node_modules', name);
  const dest = path.join(process.cwd(), '.next', 'standalone', 'node_modules', name);
  if (fs.existsSync(src)) {
    console.log(`📦 Copying ${name}`);
    copyRecursiveSync(src, dest);
  } else {
    console.warn(`⚠️ Module not found: ${name}`);
  }
}

console.log('🔄 Copying standalone build files...');

const cwd = process.cwd();

// 1. Copy .next/static
const staticSrc = path.join(cwd, '.next', 'static');
const staticDest = path.join(cwd, '.next', 'standalone', '.next', 'static');
console.log('📁 Copying .next/static');
copyRecursiveSync(staticSrc, staticDest);

// 2. Copy public
const publicSrc = path.join(cwd, 'public');
const publicDest = path.join(cwd, '.next', 'standalone', 'public');
console.log('📁 Copying public');
copyRecursiveSync(publicSrc, publicDest);

// 3. Copy prisma schema
const prismaSrc = path.join(cwd, 'prisma');
const prismaDest = path.join(cwd, '.next', 'standalone', 'prisma');
console.log('📁 Copying prisma');
copyRecursiveSync(prismaSrc, prismaDest);

// 4. Copy scripts
const scriptsSrc = path.join(cwd, 'scripts');
const scriptsDest = path.join(cwd, '.next', 'standalone', 'scripts');
console.log('📁 Copying scripts');
copyRecursiveSync(scriptsSrc, scriptsDest);

// 5. Copy .env file
const envSrc = path.join(cwd, '.env');
const envDest = path.join(cwd, '.next', 'standalone', '.env');
if (fs.existsSync(envSrc)) {
  console.log('📄 Copying .env');
  fs.copyFileSync(envSrc, envDest);
}

// 6. Copy Prisma Client (generated)
console.log('📦 Copying Prisma client');
copyModule('.prisma');
copyModule('@prisma');

// 7. Copy native modules needed for SQLite
const nativeModules = [
  'better-sqlite3',
  'binding',
  'file-uri-to-path',
  'prebuild-install',
  'node-gyp-build',
  'node-addon-api',
];

for (const mod of nativeModules) {
  copyModule(mod);
}

// 8. Verify key files
const keyFiles = [
  '.next/standalone/server.js',
  '.next/standalone/.next/static',
  '.next/standalone/public',
  '.next/standalone/prisma/schema.prisma',
  '.next/standalone/node_modules/.prisma',
];

console.log('\n🔍 Verifying build...');
let allGood = true;
for (const f of keyFiles) {
  const fullPath = path.join(cwd, f);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${f}`);
  } else {
    console.log(`  ❌ ${f} - MISSING`);
    allGood = false;
  }
}

// List standalone/node_modules
const nmDir = path.join(cwd, '.next', 'standalone', 'node_modules');
if (fs.existsSync(nmDir)) {
  const dirs = fs.readdirSync(nmDir).filter(d => {
    return fs.statSync(path.join(nmDir, d)).isDirectory();
  });
  console.log(`\n📦 standalone/node_modules contains ${dirs.length} packages`);
  console.log('  First 20: ' + dirs.slice(0, 20).join(', '));
}

if (allGood) {
  console.log('\n✅ All files copied successfully!');
} else {
  console.log('\n⚠️ Some files are missing - the app may not work correctly');
}
