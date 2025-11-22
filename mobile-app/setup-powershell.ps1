# PowerShell script to set up Node.js with nvm-windows

Write-Host "Setting up Node.js with nvm-windows..." -ForegroundColor Cyan

# Check if nvm is available
if (Get-Command nvm -ErrorAction SilentlyContinue) {
    Write-Host "nvm-windows is installed" -ForegroundColor Green
    
    # List installed versions
    Write-Host ""
    Write-Host "Installed Node.js versions:" -ForegroundColor Yellow
    nvm list
    
    # Check if v20 is installed
    $v20Installed = nvm list | Select-String "v20"
    
    if ($v20Installed) {
        Write-Host ""
        Write-Host "Node.js v20 is installed" -ForegroundColor Green
        Write-Host "Switching to Node.js v20..." -ForegroundColor Yellow
        
        # Try to use v20.18.0 first, then any v20.x
        $v20Versions = nvm list | Select-String "v20" | ForEach-Object { ($_ -split '\s+')[1] }
        
        if ($v20Versions -contains "v20.18.0") {
            nvm use 20.18.0
        } elseif ($v20Versions.Count -gt 0) {
            $firstV20 = ($v20Versions[0] -replace 'v', '')
            Write-Host "Using Node.js $firstV20..." -ForegroundColor Yellow
            nvm use $firstV20
        }
    } else {
        Write-Host ""
        Write-Host "Node.js v20 is not installed" -ForegroundColor Red
        Write-Host "Installing Node.js v20.18.0..." -ForegroundColor Yellow
        nvm install 20.18.0
        nvm use 20.18.0
    }
    
    # Verify
    Write-Host ""
    Write-Host "Verifying installation..." -ForegroundColor Cyan
    $nodeVersion = node --version 2>$null
    $npmVersion = npm --version 2>$null
    
    if ($nodeVersion) {
        Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
        Write-Host "npm version: $npmVersion" -ForegroundColor Green
        Write-Host ""
        Write-Host "Setup complete! You can now run: npm start" -ForegroundColor Green
    } else {
        Write-Host "Node.js is still not found. Please restart PowerShell." -ForegroundColor Red
        Write-Host "After restarting, run: nvm use 20.18.0" -ForegroundColor Yellow
    }
} else {
    Write-Host "nvm-windows is not found in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure nvm-windows is installed:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor White
    Write-Host "2. Install nvm-setup.exe" -ForegroundColor White
    Write-Host "3. Restart PowerShell" -ForegroundColor White
    Write-Host "4. Run this script again" -ForegroundColor White
}
