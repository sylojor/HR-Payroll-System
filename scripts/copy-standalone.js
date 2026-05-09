// Cross-platform copy script for Next.js standalone build
// Optimized for minimum installer size

const fs = require('fs');
const path = require('path');

// Files/patterns to skip to reduce size
const SKIP_PATTERNS = [
  /\.md$/i,
  /\.tsbuildinfo$/i,
  /\.map$/i,
  /CHANGELOG/i,
  /LICENSE/i,
  /README/i,
  /\.github$/i,
  /__tests__/i,
  /__test__/i,
  /\.spec\./i,
  /\.test\./i,
  /tsconfig\.json$/i,
  /\.d\.ts$/i,
  /eslint/i,
  /prettier/i,
  /\.ts$/i, // Skip TypeScript source files (only need compiled JS)
  /Makefile$/i,
  /Dockerfile$/i,
  /\.dockerignore$/i,
  /\.npmignore$/i,
  /\.gitignore$/i,
  /\.editorconfig$/i,
  /\.babelrc/i,
  /\.eslintrc/i,
  /\.prettierrc/i,
  /node_modules\/\.cache/i,
  /\.pnpm/i,
];

// Only copy specific subdirectories from packages (not entire package with tests/docs)
const MINIMAL_COPY_PACKAGES = {
  'next': ['dist', 'package.json'],
  'react': ['cjs', 'package.json'],
  'react-dom': ['cjs', 'package.json', 'index.js'],
  'styled-jsx': ['dist', 'package.json', 'index.js', 'server.js', 'style.js'],
  'caniuse-lite': ['data.json', 'dist', 'package.json'],
};

function shouldSkip(filePath) {
  const basename = path.basename(filePath);
  return SKIP_PATTERNS.some(pattern => pattern.test(basename));
}

function copyRecursiveSync(src, dest, skipPatterns = true) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️ Source not found: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (skipPatterns && shouldSkip(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Skip certain directories
      if (skipPatterns && /^(test|tests|__tests__|__test__|docs|doc|example|examples|\.github|src)$/i.test(entry.name)) {
        continue;
      }
      copyRecursiveSync(srcPath, destPath, skipPatterns);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (e) {
        // Ignore errors for individual files
      }
    }
  }
}

function copyModule(name) {
  const src = path.join(process.cwd(), 'node_modules', name);
  const dest = path.join(process.cwd(), '.next', 'standalone', 'node_modules', name);
  if (fs.existsSync(src)) {
    // Check if we should do a minimal copy
    if (MINIMAL_COPY_PACKAGES[name]) {
      console.log(`📦 Copying ${name} (minimal)`);
      const items = MINIMAL_COPY_PACKAGES[name];
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      for (const item of items) {
        const srcItem = path.join(src, item);
        const destItem = path.join(dest, item);
        if (fs.existsSync(srcItem)) {
          if (fs.statSync(srcItem).isDirectory()) {
            copyRecursiveSync(srcItem, destItem, true);
          } else {
            fs.copyFileSync(srcItem, destItem);
          }
        }
      }
    } else {
      console.log(`📦 Copying ${name}`);
      copyRecursiveSync(src, dest, true);
    }
  } else {
    console.warn(`⚠️ Module not found: ${name}`);
  }
}

// Ensure a module exists in standalone, copy from project if missing
function ensureModule(name) {
  const dest = path.join(process.cwd(), '.next', 'standalone', 'node_modules', name);
  if (!fs.existsSync(dest)) {
    console.log(`📦 Module ${name} missing in standalone, copying from project`);
    copyModule(name);
  } else {
    console.log(`✅ Module ${name} already exists in standalone`);
  }
}

console.log('🔄 Copying standalone build files (optimized)...');

const cwd = process.cwd();

// 1. Copy .next/static
const staticSrc = path.join(cwd, '.next', 'static');
const staticDest = path.join(cwd, '.next', 'standalone', '.next', 'static');
console.log('📁 Copying .next/static');
copyRecursiveSync(staticSrc, staticDest, false); // Don't skip anything for static

// 2. Copy public
const publicSrc = path.join(cwd, 'public');
const publicDest = path.join(cwd, '.next', 'standalone', 'public');
console.log('📁 Copying public');
copyRecursiveSync(publicSrc, publicDest, false);

// 3. Copy prisma schema (only schema, not migrations)
const prismaSrc = path.join(cwd, 'prisma');
const prismaDest = path.join(cwd, '.next', 'standalone', 'prisma');
console.log('📁 Copying prisma');
if (!fs.existsSync(prismaDest)) fs.mkdirSync(prismaDest, { recursive: true });
// Only copy schema file and migration lock
for (const f of ['schema.prisma', 'migration_lock.toml']) {
  const src = path.join(prismaSrc, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(prismaDest, f));
  }
}
// Copy migrations directory if exists (needed for prisma)
const migSrc = path.join(prismaSrc, 'migrations');
const migDest = path.join(prismaDest, 'migrations');
if (fs.existsSync(migSrc)) {
  copyRecursiveSync(migSrc, migDest, true);
}

// 4. Skip scripts - not needed at runtime

// 5. Copy .env file
const envSrc = path.join(cwd, '.env');
const envDest = path.join(cwd, '.next', 'standalone', '.env');
if (fs.existsSync(envSrc)) {
  console.log('📄 Copying .env');
  fs.copyFileSync(envSrc, envDest);
}

// 6. Copy Prisma Client (generated) - only runtime files
console.log('📦 Copying Prisma client');
copyModule('.prisma');
copyModule('@prisma');

// 7. Copy native modules needed for SQLite
const nativeModules = [
  'better-sqlite3',
  'file-uri-to-path',
  'node-addon-api',
  'node-gyp-build',
  'binding',
];

for (const mod of nativeModules) {
  copyModule(mod);
}

// 8. CRITICAL: Ensure the 'next' module exists in standalone
// Only copy what's actually needed at runtime
console.log('\n🔍 Ensuring critical server modules exist...');
const criticalModules = [
  'next',
  'react',
  'react-dom',
  'styled-jsx',
  'caniuse-lite',
  'busboy',
  'semver',
  'undici',
];

for (const mod of criticalModules) {
  ensureModule(mod);
}

// Also ensure @next namespace modules
const nextNsDir = path.join(cwd, 'node_modules', '@next');
if (fs.existsSync(nextNsDir)) {
  try {
    const nextNamespaced = fs.readdirSync(nextNsDir);
    for (const sub of nextNamespaced) {
      ensureModule('@next/' + sub);
    }
  } catch (e) {
    console.warn('⚠️ Cannot read @next directory: ' + e.message);
  }
}

// 9. Clean up: Remove unnecessary files from standalone to reduce installer size
console.log('\n🧹 Cleaning up standalone build...');
let removedCount = 0;
function cleanupDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Remove known large/unnecessary directories
      if (/^(test|tests|__tests__|docs|doc|example|examples|\.github|src|coverage|\.cache)$/i.test(entry.name)) {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
          removedCount++;
        } catch (e) {}
      } else {
        cleanupDir(fullPath);
      }
    } else {
      // Remove known unnecessary files
      if (/\.(md|ts|map|tsbuildinfo|d\.ts)$/i.test(entry.name) ||
          /^(CHANGELOG|LICENSE|README|Makefile|Dockerfile|\.npmignore|\.gitignore|\.editorconfig|\.babelrc|\.eslintrc|\.prettierrc)/i.test(entry.name)) {
        try {
          fs.unlinkSync(fullPath);
          removedCount++;
        } catch (e) {}
      }
    }
  }
}
cleanupDir(path.join(cwd, '.next', 'standalone', 'node_modules'));
console.log(`  Removed ${removedCount} unnecessary files/dirs`);

// 10. Verify key files
const keyFiles = [
  '.next/standalone/server.js',
  '.next/standalone/.next/static',
  '.next/standalone/public',
  '.next/standalone/prisma/schema.prisma',
  '.next/standalone/node_modules/.prisma',
  '.next/standalone/node_modules/next',
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

// Calculate standalone size
function getDirSize(dir) {
  let size = 0;
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      try { size += fs.statSync(fullPath).size; } catch(e) {}
    }
  }
  return size;
}

const standaloneSize = getDirSize(path.join(cwd, '.next', 'standalone'));
console.log(`\n📦 Standalone build size: ${(standaloneSize / (1024 * 1024)).toFixed(2)} MB`);

// List standalone/node_modules
const nmDir = path.join(cwd, '.next', 'standalone', 'node_modules');
if (fs.existsSync(nmDir)) {
  const dirs = fs.readdirSync(nmDir).filter(d => {
    return fs.statSync(path.join(nmDir, d)).isDirectory();
  });
  console.log(`📦 standalone/node_modules contains ${dirs.length} packages`);

  // Check if next module has its key files
  const nextDir = path.join(nmDir, 'next');
  if (fs.existsSync(nextDir)) {
    const nextPkg = path.join(nextDir, 'package.json');
    if (fs.existsSync(nextPkg)) {
      const pkg = JSON.parse(fs.readFileSync(nextPkg, 'utf-8'));
      console.log(`  next module version: ${pkg.version}`);
    }
    const nextServerDir = path.join(nextDir, 'dist', 'server');
    if (fs.existsSync(nextServerDir)) {
      console.log('  ✅ next/dist/server exists');
    } else {
      console.log('  ❌ next/dist/server MISSING - next module is incomplete!');
    }
  }
} else {
  console.log('\n❌ standalone/node_modules DOES NOT EXIST - this is a critical issue!');
  allGood = false;
}

if (allGood) {
  console.log('\n✅ All files copied successfully!');
} else {
  console.log('\n⚠️ Some files are missing - the app may not work correctly');
}
