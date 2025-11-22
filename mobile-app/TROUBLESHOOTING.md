# Troubleshooting Node.js Installation on Windows

## Issue: "node.exe is not recognized"

This means Node.js is either:
1. Not installed
2. Installed but not in your PATH
3. Terminal needs to be restarted after installation

## Solutions

### Step 1: Verify Node.js Installation

Check if Node.js is installed in common locations:

**Option A: Check Program Files**
- Open File Explorer
- Navigate to `C:\Program Files\nodejs\`
- Look for `node.exe`

**Option B: Check User AppData**
- Navigate to `C:\Users\YourUsername\AppData\Local\Programs\nodejs\`
- Look for `node.exe`

### Step 2: If Node.js is NOT Installed

1. **Download Node.js v20 LTS:**
   - Go to: https://nodejs.org/en/download/
   - Click "Windows Installer (.msi)" for **v20.x.x LTS**
   - Download and run the installer

2. **During Installation:**
   - ✅ Check "Add to PATH" option (should be checked by default)
   - Complete the installation

3. **After Installation:**
   - **IMPORTANT:** Close ALL PowerShell/Command Prompt windows
   - Open a NEW PowerShell window
   - Test: `node --version`

### Step 3: If Node.js IS Installed but Not Found

**Option A: Restart Terminal (Easiest)**
1. Close ALL PowerShell windows
2. Open a NEW PowerShell window
3. Try: `node --version`

**Option B: Manually Add to PATH**
1. Find where Node.js is installed (usually `C:\Program Files\nodejs\`)
2. Open System Properties → Environment Variables
3. Edit "Path" in User variables
4. Add: `C:\Program Files\nodejs\`
5. Restart PowerShell

**Option C: Refresh PATH in Current Session**
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
node --version
```

### Step 4: Verify Installation

After fixing, verify:
```powershell
node --version    # Should show v20.x.x
npm --version     # Should show version number
```

### Step 5: Start the App

Once Node.js is working:
```powershell
cd mobile-app
npm start
```

## Still Having Issues?

1. **Uninstall old Node.js versions:**
   - Go to Settings → Apps
   - Uninstall any existing Node.js versions
   - Restart computer

2. **Clean install:**
   - Download fresh Node.js v20 installer
   - Run installer as Administrator
   - Restart computer after installation

3. **Check PATH manually:**
   ```powershell
   $env:Path -split ';' | Select-String nodejs
   ```
   Should show Node.js path if it's in PATH

