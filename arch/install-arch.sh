#!/usr/bin/env bash
# ==============================================================================
# One-Command Binary Installer for Messenger Desktop (Arch Linux / Manjaro)
# Installs pre-built binary packages without requiring build tools or compilers.
# ==============================================================================
set -e

REPO="rootLocalGhost/Messenger-Next"
APP_NAME="Messenger Desktop"
BIN_NAME="messenger-desktop"

echo "========================================================="
echo " 🚀 Installing ${APP_NAME} for Arch Linux"
echo "========================================================="

if ! command -v pacman &>/dev/null; then
    echo "❌ Error: pacman not found. This script requires an Arch Linux based system."
    exit 1
fi

# 1. Install lightweight runtime dependencies (no build tools like rust/node needed)
echo "📦 Ensuring runtime dependencies are installed..."
sudo pacman -S --needed --noconfirm webkit2gtk-4.1 libayatana-appindicator gtk3 openssl hicolor-icon-theme cairo gdk-pixbuf2 glib2 pango

# 2. Clean up any unmanaged legacy files from previous manual installs to avoid file conflicts
echo "🧹 Removing legacy unmanaged files (if any)..."
sudo rm -f /usr/share/applications/${BIN_NAME}.desktop \
           /usr/share/icons/hicolor/*/apps/${BIN_NAME}.png \
           /usr/local/bin/${BIN_NAME} 2>/dev/null || true

TEMP_DIR="$(mktemp -d /tmp/messenger-install.XXXXXX)"
trap 'rm -rf "${TEMP_DIR}"' EXIT

echo "📡 Querying latest release from GitHub (${REPO})..."
RELEASE_JSON=$(curl -sL "https://api.github.com/repos/${REPO}/releases/latest" || true)

# 3. Priority 1: Check for pre-built .pkg.tar.zst package
ZST_URL=$(echo "${RELEASE_JSON}" | grep -o -E 'https://[^\"]+\.pkg\.tar\.zst' | head -n 1 || true)

if [ -n "${ZST_URL}" ]; then
    FILENAME=$(basename "${ZST_URL}")
    TARGET_FILE="${TEMP_DIR}/${FILENAME}"
    
    echo "📥 Downloading pre-built Arch package (${FILENAME})..."
    curl -L --progress-bar -o "${TARGET_FILE}" "${ZST_URL}"
    
    echo "📦 Installing package via pacman..."
    sudo pacman -U --needed --noconfirm --overwrite '*' "${TARGET_FILE}"
    
    echo "========================================================="
    echo " ✨ ${APP_NAME} installed successfully!"
    echo " 🚀 Run '${BIN_NAME}' or open it from your app launcher."
    echo "========================================================="
    exit 0
fi

# 4. Priority 2: Fallback to pre-built AppImage extraction (zero compilation needed)
APPIMAGE_URL=$(echo "${RELEASE_JSON}" | grep -o -E 'https://[^\"]+\.AppImage' | head -n 1 || true)

if [ -n "${APPIMAGE_URL}" ]; then
    FILENAME=$(basename "${APPIMAGE_URL}")
    TARGET_APPIMAGE="${TEMP_DIR}/${FILENAME}"
    
    echo "📥 Downloading pre-built binary (${FILENAME})..."
    curl -L --progress-bar -o "${TARGET_APPIMAGE}" "${APPIMAGE_URL}"
    chmod +x "${TARGET_APPIMAGE}"
    
    echo "⚙️  Extracting pre-built application files..."
    cd "${TEMP_DIR}"
    "${TARGET_APPIMAGE}" --appimage-extract >/dev/null 2>&1
    
    echo "📥 Installing binary, desktop entry, and icons..."
    sudo install -Dm755 "squashfs-root/usr/bin/${BIN_NAME}" "/usr/local/bin/${BIN_NAME}" 2>/dev/null || \
    sudo install -Dm755 "squashfs-root/${BIN_NAME}" "/usr/local/bin/${BIN_NAME}" 2>/dev/null || \
    sudo install -Dm755 "${TARGET_APPIMAGE}" "/usr/local/bin/${BIN_NAME}"
    
    # Desktop entry & icons
    if [ -f "squashfs-root/usr/share/applications/${BIN_NAME}.desktop" ]; then
        sudo install -Dm644 "squashfs-root/usr/share/applications/${BIN_NAME}.desktop" "/usr/share/applications/${BIN_NAME}.desktop"
    elif [ -f "squashfs-root/${BIN_NAME}.desktop" ]; then
        sudo install -Dm644 "squashfs-root/${BIN_NAME}.desktop" "/usr/share/applications/${BIN_NAME}.desktop"
    else
        sudo tee "/usr/share/applications/${BIN_NAME}.desktop" > /dev/null <<EOF
[Desktop Entry]
Name=Messenger
Comment=Facebook Messenger Desktop App
Exec=/usr/local/bin/${BIN_NAME} %u
Icon=${BIN_NAME}
Terminal=false
Type=Application
Categories=Network;InstantMessaging;Chat;
StartupWMClass=Messenger
MimeType=x-scheme-handler/messenger;
Keywords=messenger;facebook;chat;im;messaging;
EOF
    fi
    
    # Icons
    for size in 32x32 128x128 256x256 512x512; do
        ICON_SRC=$(find squashfs-root -name "${size}.png" -o -name "${BIN_NAME}.png" -o -name "icon.png" | head -n 1 || true)
        if [ -n "${ICON_SRC}" ] && [ -f "${ICON_SRC}" ]; then
            sudo install -Dm644 "${ICON_SRC}" "/usr/share/icons/hicolor/${size}/apps/${BIN_NAME}.png" 2>/dev/null || true
        fi
    done
    
    if command -v gtk-update-icon-cache &>/dev/null; then
        sudo gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor 2>/dev/null || true
    fi
    if command -v update-desktop-database &>/dev/null; then
        sudo update-desktop-database -q /usr/share/applications 2>/dev/null || true
    fi
    
    echo "========================================================="
    echo " ✨ ${APP_NAME} installed successfully!"
    echo " 🚀 Run '${BIN_NAME}' or open it from your app launcher."
    echo "========================================================="
    exit 0
fi

# 5. Priority 3: Fallback to local build if running from cloned repository
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${REPO_ROOT}/package.json" ] && [ -d "${REPO_ROOT}/src-tauri" ]; then
    echo "ℹ️  No GitHub release found (repo may be private or unreleased). Building locally from repository source..."
    sudo pacman -S --needed --noconfirm nodejs npm rust
    
    cd "${REPO_ROOT}"
    npm ci || npm install
    npx tauri build --no-bundle
    
    sudo install -Dm755 "${REPO_ROOT}/src-tauri/target/release/${BIN_NAME}" "/usr/local/bin/${BIN_NAME}"
    sudo install -Dm644 "${SCRIPT_DIR}/messenger-desktop.desktop" "/usr/share/applications/messenger-desktop.desktop"
    sudo install -Dm644 "${REPO_ROOT}/src-tauri/icons/32x32.png" "/usr/share/icons/hicolor/32x32/apps/${BIN_NAME}.png"
    sudo install -Dm644 "${REPO_ROOT}/src-tauri/icons/128x128.png" "/usr/share/icons/hicolor/128x128/apps/${BIN_NAME}.png"
    sudo install -Dm644 "${REPO_ROOT}/src-tauri/icons/128x128@2x.png" "/usr/share/icons/hicolor/256x256/apps/${BIN_NAME}.png"
    sudo install -Dm644 "${REPO_ROOT}/src-tauri/icons/icon.png" "/usr/share/icons/hicolor/512x512/apps/${BIN_NAME}.png"
    
    if command -v gtk-update-icon-cache &>/dev/null; then
        sudo gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor 2>/dev/null || true
    fi
    if command -v update-desktop-database &>/dev/null; then
        sudo update-desktop-database -q /usr/share/applications 2>/dev/null || true
    fi
    
    echo "========================================================="
    echo " ✨ ${APP_NAME} installed successfully!"
    echo " 🚀 Run '${BIN_NAME}' or open it from your app launcher."
    echo "========================================================="
    exit 0
fi

echo "❌ Error: Could not retrieve release binary from GitHub."
echo "💡 If rootLocalGhost/Messenger-Next is a private repository, please publish a GitHub release or make the repository public."
exit 1
