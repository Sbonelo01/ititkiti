# Final Setup Instructions

## Current Situation

✅ Node.js is found at: `C:\nvm4w\nodejs\`
❌ Currently using Node.js v22.11.0 (has compatibility issues with Expo)
❌ nvm-windows command is not working

## Solution Options

### Option 1: Use Node.js v20 if it exists

If you have v20 installed in a subdirectory, add it to PATH:

```powershell
# Check if v20 exists
Test-Path "C:\nvm4w\nodejs\v20.18.0\node.exe"

# If it exists, add to PATH
$env:Path = "C:\nvm4w\nodejs\v20.18.0;" + $env:Path
node --version  # Should show v20.x.x
```

### Option 2: Download Node.js v20 Directly (Recommended)

Since nvm-windows isn't working properly:

1. **Download Node.js v20 LTS:**
   - Go to: https://nodejs.org/en/download/
   - Download "Windows Installer (.msi)" for **v20.x.x LTS**

2. **Install it:**
   - Run the installer
   - It will replace v22 or install alongside it
   - Make sure "Add to PATH" is checked

3. **Restart PowerShell** and verify:
   ```powershell
   node --version  # Should show v20.x.x
   ```

4. **Start the app:**
   ```powershell
   cd mobile-app
   npm start
   ```

### Option 3: Fix nvm-windows

If you want to use nvm-windows:

1. **Reinstall nvm-windows:**
   - Download: https://github.com/coreybutler/nvm-windows/releases
   - Run `nvm-setup.exe` **as Administrator**
   - Restart PowerShell

2. **Then use nvm:**
   ```powershell
   nvm install 20.18.0
   nvm use 20.18.0
   node --version
   ```

## Quick Test

After switching to v20, test if Expo works:

```powershell
cd mobile-app
npm start
```

If you still get Metro bundler errors, you're still on v22. Make sure you're using v20!

