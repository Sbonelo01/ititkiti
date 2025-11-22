# Windows Setup Guide

## Node.js v20 Installation for Windows

Since you're on Windows and don't have nvm, here are your options:

### Option 1: Download Node.js v20 Directly (Easiest)

1. Visit: https://nodejs.org/en/download/
2. Download the **Windows Installer (.msi)** for **Node.js v20 LTS**
3. Run the installer and follow the prompts
4. Restart your terminal/PowerShell
5. Verify installation:
   ```powershell
   node --version
   ```
   Should show `v20.x.x`

### Option 2: Install nvm-windows (For Managing Multiple Node Versions)

1. Download nvm-windows from: https://github.com/coreybutler/nvm-windows/releases
2. Download the `nvm-setup.exe` file
3. Run the installer
4. Restart your terminal/PowerShell
5. Install Node.js v20:
   ```powershell
   nvm install 20.18.0
   nvm use 20.18.0
   ```

### Option 3: Use Volta (Alternative Version Manager)

1. Install Volta: https://volta.sh/
2. Install Node.js v20:
   ```powershell
   volta install node@20
   ```

## After Installing Node.js v20

1. Navigate to the mobile-app directory:
   ```powershell
   cd mobile-app
   ```

2. Clear any existing cache:
   ```powershell
   Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
   ```

3. Start the Expo app:
   ```powershell
   npx expo start --clear
   ```

## Why Node.js v20?

Node.js v22 has breaking changes with package exports that Metro bundler (used by Expo) doesn't support yet. Node.js v20 is the current LTS version and is fully compatible with Expo SDK 50.

