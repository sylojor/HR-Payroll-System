// Minimal copy script for Next.js standalone build
// No more _deps or node_modules copying - just static files and prisma schema
// All server modules are in .next/node_modules/ which is preserved by electron-builder

const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      try { fs.copyFileSync(srcPath, destPath); } catch (e) {}
    }
  }
}

const cwd = process.cwd();
console.log('🔄 Copying standalone build files...\n');

// 1. Copy .next/static
console.log('📁 Copying .next/static');
copyRecursiveSync(path.join(cwd, '.next', 'static'), path.join(cwd, '.next', 'standalone', '.next', 'static'));

// 2. Copy public
console.log('📁 Copying public');
copyRecursiveSync(path.join(cwd, 'public'), path.join(cwd, '.next', 'standalone', 'public'));

// 3. Copy prisma schema only
console.log('📁 Copying prisma');
const prismaDest = path.join(cwd, '.next', 'standalone', 'prisma');
if (!fs.existsSync(prismaDest)) fs.mkdirSync(prismaDest, { recursive: true });
const schemaSrc = path.join(cwd, 'prisma', 'schema.prisma');
if (fs.existsSync(schemaSrc)) {
  fs.copyFileSync(schemaSrc, path.join(prismaDest, 'schema.prisma'));
}

// 4. Copy .env file
const envSrc = path.join(cwd, '.env');
if (fs.existsSync(envSrc)) {
  console.log('📄 Copying .env');
  fs.copyFileSync(envSrc, path.join(cwd, '.next', 'standalone', '.env'));
}

// 5. Verify and report
console.log('\n🔍 Verifying build...');
const standaloneDir = path.join(cwd, '.next', 'standalone');

// Check for .next/node_modules (where Next.js puts all traced deps)
const nextNm = path.join(standaloneDir, '.next', 'node_modules');
if (fs.existsSync(nextNm)) {
  try {
    const entries = fs.readdirSync(nextNm);
    console.log(`  ✅ .next/node_modules has ${entries.length} packages`);
    // Check for key modules
    for (const mod of ['next', '@prisma', 'better-sqlite3']) {
      if (fs.existsSync(path.join(nextNm, mod))) {
        console.log(`  ✅ ${mod} found in .next/node_modules`);
      } else {
        console.log(`  ⚠️ ${mod} NOT found in .next/node_modules`);
      }
    }
  } catch (e) {
    console.log(`  ❌ Cannot read .next/node_modules: ${e.message}`);
  }
} else {
  console.log('  ❌ .next/node_modules NOT found - this is critical!');
}

// Report size
function getDirSize(dir) {
  let size = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    size += entry.isDirectory() ? getDirSize(fullPath) : fs.statSync(fullPath).size;
  }
  return size;
}

console.log(`\n📦 Standalone size: ${(getDirSize(standaloneDir) / (1024 * 1024)).toFixed(2)} MB`);
console.log('✅ Build prepared!');
