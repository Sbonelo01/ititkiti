# Setting up Node.js with nvm-windows in Git Bash

## Your Node.js Location

Node.js is installed via nvm-windows at: `/c/nvm4w/nodejs/`

## Step 1: Find Your Active Node.js Version

nvm-windows stores different Node.js versions in subdirectories. First, find which version is active:

**In PowerShell or CMD:**
```powershell
nvm list
```

This will show you which version is currently active (marked with `*`).

## Step 2: Add Node.js to Git Bash PATH

Once you know your active version (e.g., `v20.18.0`), add it to Git Bash:

```bash
# Replace v20.18.0 with your actual version
echo 'export PATH="/c/nvm4w/nodejs/v20.18.0:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Or if you want to use the symlink (if nvm-windows created one):
```bash
echo 'export PATH="/c/nvm4w/nodejs:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Step 3: Verify

```bash
node --version
npm --version
```

## Step 4: Start the App

```bash
cd mobile-app
npm start
```

## Alternative: Use nvm-windows Commands

If you want to switch Node.js versions, use nvm-windows in PowerShell:

```powershell
nvm list              # List installed versions
nvm install 20.18.0   # Install Node.js v20
nvm use 20.18.0       # Switch to v20
```

Then in Git Bash, add that version to PATH as shown above.

## Quick Check

To see what's in your nvm directory:
```bash
ls -la /c/nvm4w/nodejs/
```

This will show you the available Node.js versions.

