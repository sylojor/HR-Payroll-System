// Cross-platform copy script for Next.js standalone build
// Uses _deps/ instead of node_modules/ to avoid electron-builder pruning

const fs = require('fs');
const path = require('path');

// Files/patterns to skip to reduce size
const SKIP_PATTERNS = [
  /\.md$/i, /\.tsbuildinfo$/i, /\.map$/i, /CHANGELOG/i,
  /LICENSE/i, /README/i, /\.github$/i, /__tests__/i,
  /\.spec\./i, /\.test\./i, /tsconfig\.json$/i,
  /\.d\.ts$/i, /eslint/i, /prettier/i, /\.ts$/i,
  /Makefile$/i, /Dockerfile$/i, /\.npmignore$/i,
  /\.gitignore$/i, /\.editorconfig$/i, /\.babelrc/i,
  /\.eslintrc/i, /\.prettierrc/i, /node_modules\/\.cache/i,
];

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
      if (skipPatterns && /^(test|tests|__tests__|docs|doc|example|examples|\.github|src)$/i.test(entry.name)) {
        continue;
      }
      copyRecursiveSync(srcPath, destPath, skipPatterns);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (e) {}
    }
  }
}

// Copy module to _deps/ instead of node_modules/ to avoid electron-builder pruning
function copyModuleToDeps(name) {
  const src = path.join(process.cwd(), 'node_modules', name);
  const dest = path.join(process.cwd(), '.next', 'standalone', '_deps', name);
  if (fs.existsSync(src)) {
    console.log(`📦 Copying ${name} to _deps/`);
    copyRecursiveSync(src, dest, true);
  } else {
    console.warn(`⚠️ Module not found: ${name}`);
  }
}

// Ensure a module exists in standalone, copy to _deps/ if missing everywhere
function ensureModuleInDeps(name) {
  const standaloneDir = path.join(process.cwd(), '.next', 'standalone');
  // Check if module exists in any node_modules location
  const possibleLocations = [
    path.join(standaloneDir, 'node_modules', name),
    path.join(standaloneDir, '.next', 'node_modules', name),
    path.join(standaloneDir, '_deps', name),
  ];

  for (const loc of possibleLocations) {
    if (fs.existsSync(loc)) {
      console.log(`✅ Module ${name} already exists at: ${loc}`);
      return;
    }
  }

  // Module not found anywhere, copy it to _deps
  console.log(`📦 Module ${name} missing, copying to _deps/`);
  copyModuleToDeps(name);
}

console.log('🔄 Copying standalone build files (optimized with _deps/)...\n');

const cwd = process.cwd();

// 1. Copy .next/static
console.log('📁 Copying .next/static');
copyRecursiveSync(path.join(cwd, '.next', 'static'), path.join(cwd, '.next', 'standalone', '.next', 'static'), false);

// 2. Copy public
console.log('📁 Copying public');
copyRecursiveSync(path.join(cwd, 'public'), path.join(cwd, '.next', 'standalone', 'public'), false);

// 3. Copy prisma schema
console.log('📁 Copying prisma');
const prismaDest = path.join(cwd, '.next', 'standalone', 'prisma');
if (!fs.existsSync(prismaDest)) fs.mkdirSync(prismaDest, { recursive: true });
for (const f of ['schema.prisma']) {
  const src = path.join(cwd, 'prisma', f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(prismaDest, f));
  }
}

// 4. Copy .env file
const envSrc = path.join(cwd, '.env');
const envDest = path.join(cwd, '.next', 'standalone', '.env');
if (fs.existsSync(envSrc)) {
  console.log('📄 Copying .env');
  fs.copyFileSync(envSrc, envDest);
}

// 5. Copy extra modules to _deps/ (NOT node_modules/ - electron-builder prunes those!)
console.log('\n📦 Copying extra modules to _deps/ (avoids electron-builder pruning)...');

// Prisma Client - always needed
copyModuleToDeps('.prisma');
copyModuleToDeps('@prisma');

// Native modules for SQLite
const nativeModules = ['better-sqlite3', 'file-uri-to-path', 'node-addon-api', 'node-gyp-build', 'binding'];
for (const mod of nativeModules) {
  copyModuleToDeps(mod);
}

// 6. Ensure critical modules exist somewhere (in .next/node_modules or _deps)
console.log('\n🔍 Ensuring critical server modules exist...');
const criticalModules = [
  'next', 'react', 'react-dom', 'styled-jsx', 'caniuse-lite',
  'busboy', 'semver', 'undici',
];

for (const mod of criticalModules) {
  ensureModuleInDeps(mod);
}

// Also ensure @next namespace modules
const nextNsDir = path.join(cwd, 'node_modules', '@next');
if (fs.existsSync(nextNsDir)) {
  try {
    for (const sub of fs.readdirSync(nextNsDir)) {
      ensureModuleInDeps('@next/' + sub);
    }
  } catch (e) {
    console.warn('⚠️ Cannot read @next directory: ' + e.message);
  }
}

// Also ensure @prisma namespace modules in _deps
const prismaNsDir = path.join(cwd, 'node_modules', '@prisma');
if (fs.existsSync(prismaNsDir)) {
  try {
    for (const sub of fs.readdirSync(prismaNsDir)) {
      ensureModuleInDeps('@prisma/' + sub);
    }
  } catch (e) {}
}

// 7. Verify key files
console.log('\n🔍 Verifying build...');
const keyFiles = [
  '.next/standalone/server.js',
  '.next/standalone/.next/static',
  '.next/standalone/public',
  '.next/standalone/prisma/schema.prisma',
];

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

// Check where 'next' module is
const nextLocations = [
  path.join(cwd, '.next', 'standalone', 'node_modules', 'next'),
  path.join(cwd, '.next', 'standalone', '.next', 'node_modules', 'next'),
  path.join(cwd, '.next', 'standalone', '_deps', 'next'),
];
console.log('\n📦 next module locations:');
for (const loc of nextLocations) {
  if (fs.existsSync(loc)) {
    console.log(`  ✅ ${loc}`);
  }
}

// Check _deps contents
const depsDir = path.join(cwd, '.next', 'standalone', '_deps');
if (fs.existsSync(depsDir)) {
  const entries = fs.readdirSync(depsDir);
  console.log(`\n📦 _deps contains ${entries.length} entries: ${entries.slice(0, 20).join(', ')}`);
}

// Calculate standalone size
function getDirSize(dir) {
  let size = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    size += entry.isDirectory() ? getDirSize(fullPath) : fs.statSync(fullPath).size;
  }
  return size;
}

const standaloneSize = getDirSize(path.join(cwd, '.next', 'standalone'));
console.log(`\n📦 Standalone build size: ${(standaloneSize / (1024 * 1024)).toFixed(2)} MB`);

if (allGood) {
  console.log('\n✅ Build prepared successfully!');
} else {
  console.log('\n⚠️ Some files are missing');
}
