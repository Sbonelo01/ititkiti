# Quick Fix: Node.js Not Found in PowerShell

## Step 1: Check if nvm-windows is installed

Run this in PowerShell:
```powershell
nvm version
```

If you get an error, nvm-windows might not be in your PATH or not installed.

## Step 2: Try using nvm directly

Even if `nvm` command doesn't work, try these commands:

```powershell
# Try to list versions
nvm list

# If that works, install/use v20
nvm install 20.18.0
nvm use 20.18.0
```

## Step 3: If nvm doesn't work - Manual PATH fix

If nvm commands don't work, you can manually add Node.js to PATH:

1. **Find where Node.js is installed:**
   ```powershell
   Test-Path "C:\nvm4w\nodejs\v20.18.0\node.exe"
   Test-Path "C:\nvm4w\nodejs\node.exe"
   ```

2. **Add to PATH for this session:**
   ```powershell
   $env:Path += ";C:\nvm4w\nodejs\v20.18.0"
   node --version
   ```

3. **If that works, add permanently:**
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\nvm4w\nodejs\v20.18.0", "User")
   ```

## Step 4: Restart PowerShell

After adding to PATH, **close and reopen PowerShell**, then:
```powershell
node --version
npm --version
```

## Alternative: Reinstall nvm-windows

If nothing works:
1. Download nvm-windows: https://github.com/coreybutler/nvm-windows/releases
2. Run `nvm-setup.exe` as Administrator
3. Restart PowerShell
4. Run: `nvm install 20.18.0` and `nvm use 20.18.0`

