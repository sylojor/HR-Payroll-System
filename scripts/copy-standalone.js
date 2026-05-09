// Cross-platform copy script for Next.js standalone build
// Works on both Windows and Linux/macOS

const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Source path does not exist: ${src}`);
    return;
  }

  // Create destination directory
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
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying standalone build files...');

// Copy .next/static to .next/standalone/.next/static
const staticSrc = path.join(process.cwd(), '.next', 'static');
const staticDest = path.join(process.cwd(), '.next', 'standalone', '.next', 'static');
console.log(`Copying ${staticSrc} -> ${staticDest}`);
copyRecursiveSync(staticSrc, staticDest);

// Copy public to .next/standalone/public
const publicSrc = path.join(process.cwd(), 'public');
const publicDest = path.join(process.cwd(), '.next', 'standalone', 'public');
console.log(`Copying ${publicSrc} -> ${publicDest}`);
copyRecursiveSync(publicSrc, publicDest);

// Copy prisma to .next/standalone/prisma
const prismaSrc = path.join(process.cwd(), 'prisma');
const prismaDest = path.join(process.cwd(), '.next', 'standalone', 'prisma');
console.log(`Copying ${prismaSrc} -> ${prismaDest}`);
copyRecursiveSync(prismaSrc, prismaDest);

// Copy node_modules/.prisma to standalone
const prismaClientSrc = path.join(process.cwd(), 'node_modules', '.prisma');
const prismaClientDest = path.join(process.cwd(), '.next', 'standalone', 'node_modules', '.prisma');
if (fs.existsSync(prismaClientSrc)) {
  console.log(`Copying ${prismaClientSrc} -> ${prismaClientDest}`);
  copyRecursiveSync(prismaClientSrc, prismaClientDest);
}

// Copy node_modules/@prisma to standalone
const prismaPkgSrc = path.join(process.cwd(), 'node_modules', '@prisma');
const prismaPkgDest = path.join(process.cwd(), '.next', 'standalone', 'node_modules', '@prisma');
if (fs.existsSync(prismaPkgSrc)) {
  console.log(`Copying ${prismaPkgSrc} -> ${prismaPkgDest}`);
  copyRecursiveSync(prismaPkgSrc, prismaPkgDest);
}

// Copy better-sqlite3 native module
const bsqlite3Src = path.join(process.cwd(), 'node_modules', 'better-sqlite3');
const bsqlite3Dest = path.join(process.cwd(), '.next', 'standalone', 'node_modules', 'better-sqlite3');
if (fs.existsSync(bsqlite3Src)) {
  console.log(`Copying ${bsqlite3Src} -> ${bsqlite3Dest}`);
  copyRecursiveSync(bsqlite3Src, bsqlite3Dest);
}

// Copy binding dependency (required by better-sqlite3)
const bindingSrc = path.join(process.cwd(), 'node_modules', 'binding');
const bindingDest = path.join(process.cwd(), '.next', 'standalone', 'node_modules', 'binding');
if (fs.existsSync(bindingSrc)) {
  console.log(`Copying ${bindingSrc} -> ${bindingDest}`);
  copyRecursiveSync(bindingSrc, bindingDest);
}

// Copy file-uri-to-path (required by prisma)
const fileUriSrc = path.join(process.cwd(), 'node_modules', 'file-uri-to-path');
const fileUriDest = path.join(process.cwd(), '.next', 'standalone', 'node_modules', 'file-uri-to-path');
if (fs.existsSync(fileUriSrc)) {
  console.log(`Copying ${fileUriSrc} -> ${fileUriDest}`);
  copyRecursiveSync(fileUriSrc, fileUriDest);
}

console.log('✅ All files copied successfully!');
