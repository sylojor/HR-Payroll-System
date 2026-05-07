#!/bin/bash
# Build script for HR-Payroll-System Windows EXE
# This script builds the Next.js standalone output, assembles all files,
# and packages everything into a working Windows application.

set -e

echo "=========================================="
echo "  Building HR-Payroll-System Windows EXE"
echo "=========================================="

PROJECT_DIR="/home/z/my-project"
STANDALONE_DIR="$PROJECT_DIR/.next/standalone"
DIST_DIR="$PROJECT_DIR/dist-electron"

# Step 1: Build Next.js standalone
echo ""
echo ">>> Step 1: Building Next.js standalone..."
cd "$PROJECT_DIR"
bun run build

# Step 2: Copy static files into standalone
echo ""
echo ">>> Step 2: Copying static files into standalone..."
cp -r "$PROJECT_DIR/.next/static" "$STANDALONE_DIR/.next/static"
cp -r "$PROJECT_DIR/public" "$STANDALONE_DIR/public"

# Step 3: Copy additional modules into standalone's node_modules
echo ""
echo ">>> Step 3: Copying additional modules into standalone node_modules..."

# Copy full @prisma (includes Windows engines) - overwrite the traced version
echo "  - Copying @prisma (with Windows engines)..."
rm -rf "$STANDALONE_DIR/node_modules/@prisma"
cp -r "$PROJECT_DIR/node_modules/@prisma" "$STANDALONE_DIR/node_modules/@prisma"

# Copy full .prisma (includes generated client for Windows) - overwrite the traced version
echo "  - Copying .prisma (generated client)..."
rm -rf "$STANDALONE_DIR/node_modules/.prisma"
cp -r "$PROJECT_DIR/node_modules/.prisma" "$STANDALONE_DIR/node_modules/.prisma"

# Copy node-zklib (might not be traced by Next.js)
echo "  - Copying node-zklib..."
if [ ! -d "$STANDALONE_DIR/node_modules/node-zklib" ]; then
  cp -r "$PROJECT_DIR/node_modules/node-zklib" "$STANDALONE_DIR/node_modules/node-zklib"
fi

# Step 4: Copy database and prisma schema into standalone
echo ""
echo ">>> Step 4: Copying database and prisma schema..."
mkdir -p "$STANDALONE_DIR/db"
cp "$PROJECT_DIR/db/custom.db" "$STANDALONE_DIR/db/custom.db"
mkdir -p "$STANDALONE_DIR/prisma"
cp "$PROJECT_DIR/prisma/schema.prisma" "$STANDALONE_DIR/prisma/schema.prisma"

# Step 5: Verify critical files exist
echo ""
echo ">>> Step 5: Verifying critical files..."
CRITICAL_FILES=(
  "$STANDALONE_DIR/server.js"
  "$STANDALONE_DIR/node_modules/next/package.json"
  "$STANDALONE_DIR/node_modules/react/package.json"
  "$STANDALONE_DIR/node_modules/react-dom/package.json"
  "$STANDALONE_DIR/node_modules/@prisma/client/package.json"
  "$STANDALONE_DIR/node_modules/.prisma/client/index.js"
  "$STANDALONE_DIR/db/custom.db"
  "$STANDALONE_DIR/prisma/schema.prisma"
)

ALL_OK=true
for f in "${CRITICAL_FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "  ✓ $(basename $(dirname $f))/$(basename $f)"
  else
    echo "  ✗ MISSING: $f"
    ALL_OK=false
  fi
done

if [ "$ALL_OK" = false ]; then
  echo ""
  echo "❌ ERROR: Some critical files are missing!"
  exit 1
fi

echo ""
echo "  Standalone node_modules contents:"
ls "$STANDALONE_DIR/node_modules/"

echo ""
echo "  Standalone total size:"
du -sh "$STANDALONE_DIR"

# Step 6: Clean dist and run electron-builder
echo ""
echo ">>> Step 6: Running electron-builder..."
cd "$PROJECT_DIR"
rm -rf "$DIST_DIR"
npx electron-builder --win --x64 --dir

# Step 7: MANUALLY copy standalone directory (electron-builder extraResources is unreliable)
echo ""
echo ">>> Step 7: Manually copying standalone directory into output..."
OUTPUT_DIR="$DIST_DIR/HR-Payroll-System"
if [ -d "$OUTPUT_DIR" ]; then
  echo "  ✓ Output directory exists: $OUTPUT_DIR"
  
  # Remove any incomplete standalone directory that electron-builder might have created
  rm -rf "$OUTPUT_DIR/resources/standalone"
  mkdir -p "$OUTPUT_DIR/resources/standalone"
  
  # Copy everything from our prepared standalone directory
  echo "  Copying standalone files..."
  cp -r "$STANDALONE_DIR/"* "$OUTPUT_DIR/resources/standalone/"
  
  # Verify the copy
  if [ -d "$OUTPUT_DIR/resources/standalone/node_modules/next" ]; then
    echo "  ✓ next module found in output!"
  else
    echo "  ✗ next module NOT found in output after manual copy!"
    exit 1
  fi
  
  # Verify db and prisma in resources
  if [ ! -d "$OUTPUT_DIR/resources/db" ]; then
    echo "  Copying db directory..."
    mkdir -p "$OUTPUT_DIR/resources/db"
    cp "$PROJECT_DIR/db/custom.db" "$OUTPUT_DIR/resources/db/"
  fi
  if [ ! -d "$OUTPUT_DIR/resources/prisma" ]; then
    echo "  Copying prisma directory..."
    mkdir -p "$OUTPUT_DIR/resources/prisma"
    cp "$PROJECT_DIR/prisma/schema.prisma" "$OUTPUT_DIR/resources/prisma/"
  fi
  
  echo ""
  echo "  Output node_modules contents:"
  ls "$OUTPUT_DIR/resources/standalone/node_modules/"
  
  echo ""
  echo "  Output total size:"
  du -sh "$OUTPUT_DIR"
  
  # List the main EXE
  echo ""
  echo "  Main EXE:"
  ls -lh "$OUTPUT_DIR/HR-Payroll-System.exe" 2>/dev/null || echo "  (EXE not found - checking alternatives)"
  ls "$OUTPUT_DIR/" | head -20
else
  echo "  ✗ Output directory NOT found!"
  exit 1
fi

# Step 8: Create ZIP
echo ""
echo ">>> Step 8: Creating ZIP archive..."
cd "$DIST_DIR"
rm -f HR-Payroll-System-*.zip
ZIP_NAME="HR-Payroll-System-1.0.4-Windows.zip"
zip -r "$ZIP_NAME" "HR-Payroll-System/" -x "*.log"
echo "  ✓ Created: $DIST_DIR/$ZIP_NAME"
ls -lh "$ZIP_NAME"

echo ""
echo "=========================================="
echo "  Build complete!"
echo "=========================================="
