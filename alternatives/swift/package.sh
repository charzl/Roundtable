#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$BASE_DIR/dist"
APP_NAME="Roundtable-Swift"
APP_DIR="$DIST_DIR/$APP_NAME.app"

echo "📦 [Swift] 编译与打包 macOS 原生应用 / Compiling and packaging Swift Native App..."
START_TIME=$(date +%s)

# 1. Swift build release
swift build -c release --package-path "$BASE_DIR"

BIN_PATH="$BASE_DIR/.build/release/RoundtableSwift"
if [[ ! -f "$BIN_PATH" ]]; then
    echo "❌ 找不到编译产物 / Binary not found at $BIN_PATH"
    exit 1
fi

# 2. Assemble .app bundle structure
rm -rf "$DIST_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

cp "$BIN_PATH" "$APP_DIR/Contents/MacOS/RoundtableSwift"
chmod +x "$APP_DIR/Contents/MacOS/RoundtableSwift"

cat <<EOF > "$APP_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>RoundtableSwift</string>
    <key>CFBundleIdentifier</key>
    <string>com.roundtable.RoundtableSwift</string>
    <key>CFBundleName</key>
    <string>Roundtable</string>
    <key>CFBundleDisplayName</key>
    <string>Roundtable (Swift)</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>0.2.2</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

echo "APPL????" > "$APP_DIR/Contents/PkgInfo"

# 3. Measure sizes
APP_SIZE_KB=$(du -sk "$APP_DIR" | awk '{print $1}')
APP_SIZE_MB=$(echo "scale=2; $APP_SIZE_KB / 1024" | bc)

ZIP_PATH="$DIST_DIR/$APP_NAME-mac-arm64.zip"
ditto -c -k --keepParent "$APP_DIR" "$ZIP_PATH"
ZIP_SIZE_BYTES=$(stat -f%z "$ZIP_PATH")
ZIP_SIZE_MB=$(echo "scale=2; $ZIP_SIZE_BYTES / 1048576" | bc)

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "✅ [Swift] 打包完成 / Build completed in ${ELAPSED}s!"
echo "   - Native Binary: $BIN_PATH ($(du -h "$BIN_PATH" | awk '{print $1}'))"
echo "   - App Bundle: $APP_DIR (${APP_SIZE_MB} MB)"
echo "   - Distribution ZIP: $ZIP_PATH (${ZIP_SIZE_MB} MB)"
