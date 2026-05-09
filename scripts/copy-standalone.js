// Copy script for Next.js standalone build
// Merges root node_modules into .next/node_modules so electron-builder won't prune them
// electron-builder prunes root-level node_modules even in extraResources,
// but it does NOT touch .next/node_modules

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

const standaloneDir = path.join(cwd, '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.error('❌ Standalone directory not found! Did you run `next build` first?');
  process.exit(1);
}

// 1. Copy .next/static
console.log('📁 Copying .next/static');
copyRecursiveSync(path.join(cwd, '.next', 'static'), path.join(standaloneDir, '.next', 'static'));

// 2. Copy public
console.log('📁 Copying public');
copyRecursiveSync(path.join(cwd, 'public'), path.join(standaloneDir, 'public'));

// 3. Copy prisma schema
console.log('📁 Copying prisma');
const prismaDest = path.join(standaloneDir, 'prisma');
if (!fs.existsSync(prismaDest)) fs.mkdirSync(prismaDest, { recursive: true });
const schemaSrc = path.join(cwd, 'prisma', 'schema.prisma');
if (fs.existsSync(schemaSrc)) {
  fs.copyFileSync(schemaSrc, path.join(prismaDest, 'schema.prisma'));
}

// 4. DO NOT copy .env file - it would override DATABASE_URL at runtime
// The Electron main.js sets DATABASE_URL via environment variable to point
// to the user's AppData directory. A .env file with a different path would
// cause "Error code 14: Unable to open the database file"
const envSrc = path.join(cwd, '.env');
if (fs.existsSync(envSrc)) {
  console.log('📄 Skipping .env copy (DATABASE_URL is set by Electron at runtime)');
}

// 5. CRITICAL: Merge root node_modules into .next/node_modules
// electron-builder prunes root-level node_modules in extraResources,
// but .next/node_modules is preserved. So we merge everything there.
const rootNm = path.join(standaloneDir, 'node_modules');
const nextNm = path.join(standaloneDir, '.next', 'node_modules');

if (fs.existsSync(rootNm)) {
  console.log('\n📦 Merging root node_modules into .next/node_modules...');
  if (!fs.existsSync(nextNm)) {
    fs.mkdirSync(nextNm, { recursive: true });
  }

  let mergedCount = 0;
  const entries = fs.readdirSync(rootNm, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(rootNm, entry.name);
    const destPath = path.join(nextNm, entry.name);

    // Skip if already exists in .next/node_modules (prefer existing)
    if (fs.existsSync(destPath)) {
      // If it's a scoped package directory, merge subdirectories
      if (entry.isDirectory() && entry.name.startsWith('@')) {
        const subEntries = fs.readdirSync(srcPath, { withFileTypes: true });
        for (const subEntry of subEntries) {
          const subSrc = path.join(srcPath, subEntry.name);
          const subDest = path.join(destPath, subEntry.name);
          if (!fs.existsSync(subDest)) {
            copyRecursiveSync(subSrc, subDest);
            mergedCount++;
          }
        }
      }
      continue;
    }

    copyRecursiveSync(srcPath, destPath);
    mergedCount++;
    console.log(`  ✅ Merged: ${entry.name}`);
  }
  console.log(`  Merged ${mergedCount} packages into .next/node_modules`);

  // Now remove the root node_modules to save space (it's all in .next/node_modules now)
  console.log('🗑️ Removing root node_modules (merged into .next/node_modules)...');
  fs.rmSync(rootNm, { recursive: true, force: true });
} else {
  console.log('\n⚠️ Root node_modules not found in standalone build!');
  console.log('   Attempting to copy from project node_modules as fallback...');

  // Fallback: copy essential packages from project node_modules
  const projectNm = path.join(cwd, 'node_modules');
  if (fs.existsSync(projectNm)) {
    if (!fs.existsSync(nextNm)) {
      fs.mkdirSync(nextNm, { recursive: true });
    }

    const essentialPkgs = ['next', 'react', 'react-dom', 'styled-jsx', 'client-only',
      'source-map', 'source-map-support', 'buffer-from', 'semver',
      '@next', '@swc', '@img'];

    for (const pkg of essentialPkgs) {
      const srcPath = path.join(projectNm, pkg);
      const destPath = path.join(nextNm, pkg);
      if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
        copyRecursiveSync(srcPath, destPath);
        console.log(`  ✅ Copied from project: ${pkg}`);
      }
    }

    // Also copy better-sqlite3 if it exists (for Prisma)
    const bsqlite = path.join(projectNm, 'better-sqlite3');
    if (fs.existsSync(bsqlite)) {
      copyRecursiveSync(bsqlite, path.join(nextNm, 'better-sqlite3'));
      console.log('  ✅ Copied from project: better-sqlite3');
    }
  }
}

// 6. Copy init-db.js script for database initialization at runtime
console.log('\n📦 Copying init-db.js script...');
const scriptsDest = path.join(standaloneDir, 'scripts');
if (!fs.existsSync(scriptsDest)) fs.mkdirSync(scriptsDest, { recursive: true });
const initDbSrc = path.join(cwd, 'scripts', 'init-db.js');
if (fs.existsSync(initDbSrc)) {
  fs.copyFileSync(initDbSrc, path.join(scriptsDest, 'init-db.js'));
  console.log('  ✅ Copied scripts/init-db.js');
} else {
  console.log('  ⚠️ scripts/init-db.js not found');
}

// 7. Copy prisma CLI from project node_modules (not included in standalone trace)
// Note: We no longer need prisma CLI for db push (using better-sqlite3 directly),
// but keep it for potential future use
console.log('\n📦 Copying prisma CLI (optional)...');
const projectNm = path.join(cwd, 'node_modules');
const prismaCliSrc = path.join(projectNm, 'prisma');
const prismaCliDest = path.join(nextNm, 'prisma');
if (fs.existsSync(prismaCliSrc) && !fs.existsSync(prismaCliDest)) {
  copyRecursiveSync(prismaCliSrc, prismaCliDest);
  console.log('  ✅ Copied prisma CLI to .next/node_modules/prisma');
} else if (fs.existsSync(prismaCliDest)) {
  console.log('  ✅ prisma CLI already exists in .next/node_modules');
} else {
  console.log('  ⚠️ prisma CLI not found in project node_modules');
}

// Also copy @prisma/engines if not already present (has the query engine binary)
const prismaEnginesSrc = path.join(projectNm, '@prisma', 'engines');
const prismaEnginesDest = path.join(nextNm, '@prisma', 'engines');
if (fs.existsSync(prismaEnginesSrc) && !fs.existsSync(prismaEnginesDest)) {
  copyRecursiveSync(prismaEnginesSrc, prismaEnginesDest);
  console.log('  ✅ Copied @prisma/engines to .next/node_modules/@prisma/engines');
}

// Copy prisma-engines (the CLI dependency) if it exists
const prismaEnginesPkg = path.join(projectNm, 'prisma-engines');
if (fs.existsSync(prismaEnginesPkg)) {
  const dest = path.join(nextNm, 'prisma-engines');
  if (!fs.existsSync(dest)) {
    copyRecursiveSync(prismaEnginesPkg, dest);
    console.log('  ✅ Copied prisma-engines');
  }
}

// Create .bin symlink for prisma CLI
const binDir = path.join(nextNm, '.bin');
if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

// 7. Verify and report
console.log('\n🔍 Verifying build...');

if (fs.existsSync(nextNm)) {
  try {
    const entries = fs.readdirSync(nextNm);
    console.log(`  ✅ .next/node_modules has ${entries.length} packages`);

    // Check for key modules
    const keyModules = ['next', '@prisma', 'react', 'react-dom', 'prisma'];
    for (const mod of keyModules) {
      if (fs.existsSync(path.join(nextNm, mod))) {
        console.log(`  ✅ ${mod} found in .next/node_modules`);
      } else {
        console.log(`  ❌ ${mod} NOT found in .next/node_modules`);
      }
    }

    // Check for prisma CLI entry point specifically
    const prismaBuild = path.join(nextNm, 'prisma', 'build', 'index.js');
    if (fs.existsSync(prismaBuild)) {
      console.log('  ✅ prisma CLI build/index.js found');
    } else {
      console.log('  ❌ prisma CLI build/index.js NOT found');
    }
  } catch (e) {
    console.log(`  ❌ Cannot read .next/node_modules: ${e.message}`);
  }
} else {
  console.log('  ❌ .next/node_modules NOT found - this is critical!');
}

// Check for server.js
const serverJs = path.join(standaloneDir, 'server.js');
if (fs.existsSync(serverJs)) {
  console.log('  ✅ server.js found');
} else {
  console.log('  ❌ server.js NOT found!');
}

// Report size
function getDirSize(dir) {
  let size = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    try {
      size += entry.isDirectory() ? getDirSize(fullPath) : fs.statSync(fullPath).size;
    } catch (e) {
      // Skip broken symlinks or inaccessible files
    }
  }
  return size;
}

console.log(`\n📦 Standalone size: ${(getDirSize(standaloneDir) / (1024 * 1024)).toFixed(2)} MB`);
console.log('✅ Build prepared!');
