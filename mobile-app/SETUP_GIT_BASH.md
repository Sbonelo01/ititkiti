# Git Bash Setup Guide

## Issue: "node: not found" in Git Bash

Git Bash uses a different PATH than PowerShell/CMD. Even if Node.js is installed, Git Bash might not find it.

## Solution 1: Add Node.js to Git Bash PATH (Recommended)

1. **Find where Node.js is installed:**
   - Usually: `C:\Program Files\nodejs\`
   - Or: `C:\Users\YourUsername\AppData\Local\Programs\nodejs\`

2. **Add to Git Bash PATH:**
   
   Open Git Bash and run:
   ```bash
   echo 'export PATH="/c/Program Files/nodejs:$PATH"' >> ~/.bashrc
   ```
   
   Or if Node.js is in AppData:
   ```bash
   echo 'export PATH="/c/Users/$USER/AppData/Local/Programs/nodejs:$PATH"' >> ~/.bashrc
   ```

3. **Reload your bash profile:**
   ```bash
   source ~/.bashrc
   ```

4. **Verify:**
   ```bash
   node --version
   npm --version
   ```

## Solution 2: Use Full Path (Temporary)

If you just want to test quickly:
```bash
"/c/Program Files/nodejs/node.exe" --version
```

## Solution 3: Use PowerShell Instead

Git Bash can be tricky with Windows paths. Consider using PowerShell:
```powershell
cd mobile-app
npm start
```

## Solution 4: Install Node.js via Git Bash (if not installed)

If Node.js isn't installed at all:

1. **Download Node.js v20:**
   - Visit: https://nodejs.org/en/download/
   - Download Windows Installer (.msi) for v20 LTS

2. **Install it:**
   - Run the installer
   - Make sure "Add to PATH" is checked

3. **Restart Git Bash** and add to PATH (see Solution 1)

## Verify Installation

After setting up, verify in Git Bash:
```bash
node --version  # Should show v20.x.x
npm --version   # Should show version number
```

Then start the app:
```bash
cd mobile-app
npm start
```

## Troubleshooting

If `node --version` still doesn't work:

1. **Check if Node.js exists:**
   ```bash
   ls "/c/Program Files/nodejs/"
   ```

2. **Try different paths:**
   ```bash
   ls "/c/Users/$USER/AppData/Local/Programs/nodejs/"
   ```

3. **Check your current PATH:**
   ```bash
   echo $PATH
   ```

4. **Manually add to PATH for this session:**
   ```bash
   export PATH="/c/Program Files/nodejs:$PATH"
   node --version
   ```

