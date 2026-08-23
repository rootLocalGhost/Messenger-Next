# 💬 Messenger Desktop (Tauri v2 + SolidJS + Rust)

A modern, blazing-fast, memory-efficient desktop application for **Facebook Messenger** built with **Tauri v2**, **SolidJS**, **TypeScript**, and **Rust**.

---

## ✨ Features

- 🔔 **Native OS Desktop Notifications**: Intercepts web notifications and dispatches native Windows & Linux toast banners with sound and click-to-focus window functionality.
- 🔴 **Live Unread Badge Counter**: Synchronizes unread chat counts with the system tray icon, tooltip, and title bar.
- 🪟 **System Tray & Window Lifecycle**: Close to tray, minimize to tray, and toggle window visibility with one click.
- 🔗 **Smart Link Routing**: External chat links automatically open in your default browser instead of navigating within Messenger.
- 🚀 **System Startup (Autostart)**: Easily configure Messenger to start automatically when your PC boots.
- ⚡ **Lightweight & High Performance**: Uses native WebView2 (Windows) and WebKitGTK (Linux) with a minuscule memory footprint compared to Electron.
- 🎨 **Sleek Native UI**: Modern dark theme, glassmorphic styling, and native controls using Vanilla CSS.

---

## 📦 Installation & Packaging

### 🪟 Windows
1. Run the NSIS installer: `Messenger_1.0.0_x64-setup.exe` (or `Messenger_1.0.0_x64_en-US.msi`).
2. Follow the setup wizard to install Messenger to your system.

### 🐧 Linux
- **AppImage (Universal Linux)**:
  ```bash
  chmod +x Messenger_1.0.0_amd64.AppImage
  ./Messenger_1.0.0_amd64.AppImage
  ```
- **Debian / Ubuntu (`.deb`)**:
  ```bash
  sudo dpkg -i messenger_1.0.0_amd64.deb
  sudo apt-get install -f # Fix any missing dependencies
  ```

### 🏹 Arch Linux / Manjaro / EndeavourOS

#### ⚡ One-Command Instant Install (Zero compilation / No build tools needed):
```bash
curl -fsSL https://raw.githubusercontent.com/rootLocalGhost/Messenger-Next/main/arch/install-arch.sh | bash
```
*(Or run `./arch/install-arch.sh` from the repository)*

#### 📦 Using PKGBUILD with makepkg:
```bash
cd arch
makepkg -si
```

---

## 🛠️ Development & Building Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+) & `npm`
- [Rust](https://www.rust-lang.org/) & `cargo`

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
```bash
npm run tauri dev
```

### 3. Build Production Installers
```bash
npm run tauri build
```
The generated installers will be located in:
- `src-tauri/target/release/bundle/nsis/` (Windows `.exe`)
- `src-tauri/target/release/bundle/msi/` (Windows `.msi`)
- `src-tauri/target/release/bundle/appimage/` (Linux `.AppImage`)
- `src-tauri/target/release/bundle/deb/` (Linux `.deb`)

---

## 🚀 Automated GitHub Actions Releases

This repository includes a fully automated release pipeline in [`.github/workflows/release.yml`](.github/workflows/release.yml).

### To trigger a new release:
1. Push a git tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. Or trigger the **Release Messenger Desktop** workflow manually from the **Actions** tab in GitHub.
3. GitHub Actions will build installers for Windows and Linux, format rich release notes with emojis, and publish the release assets automatically.

---

## 📄 License
MIT License
