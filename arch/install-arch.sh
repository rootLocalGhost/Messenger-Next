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

TEMP_DIR="$(mktemp -d /tmp/messenger-install.XXXXXX)"
trap 'rm -rf "${TEMP_DIR}"' EXIT

echo "📡 Querying latest release from GitHub (${REPO})..."
RELEASE_JSON=$(curl -sL "https://api.github.com/repos/${REPO}/releases/latest" || true)

# 2. Priority 1: Check for pre-built .pkg.tar.zst package
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

# 3. Priority 2: Fallback to pre-built AppImage extraction (zero compilation needed)
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

echo "❌ Error: Could not retrieve release binary from GitHub. Please check your internet connection."
exit 1
