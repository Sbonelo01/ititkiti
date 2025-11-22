#!/bin/bash
# Quick setup script for Git Bash with nvm-windows

echo "Setting up Node.js PATH for Git Bash..."

# Check if Node.js exists in nvm directory
if [ -d "/c/nvm4w/nodejs" ]; then
    echo "Found nvm-windows installation at /c/nvm4w/nodejs/"
    
    # Try to find the active Node.js version
    # Check common locations
    if [ -f "/c/nvm4w/nodejs/node.exe" ]; then
        echo "Found node.exe in /c/nvm4w/nodejs/"
        export PATH="/c/nvm4w/nodejs:$PATH"
    else
        # List available versions
        echo "Available Node.js versions:"
        ls -d /c/nvm4w/nodejs/*/ 2>/dev/null | sed 's|/c/nvm4w/nodejs/||' | sed 's|/$||'
        echo ""
        echo "Please specify which version to use (e.g., v20.18.0):"
        read VERSION
        if [ -f "/c/nvm4w/nodejs/$VERSION/node.exe" ]; then
            export PATH="/c/nvm4w/nodejs/$VERSION:$PATH"
            echo "Added $VERSION to PATH"
        else
            echo "Version $VERSION not found!"
            exit 1
        fi
    fi
    
    # Add to .bashrc for future sessions
    if ! grep -q "nvm4w/nodejs" ~/.bashrc 2>/dev/null; then
        echo 'export PATH="/c/nvm4w/nodejs:$PATH"' >> ~/.bashrc
        echo "Added to ~/.bashrc for future sessions"
    fi
    
    # Verify
    if command -v node &> /dev/null; then
        echo "✓ Node.js is now available!"
        node --version
        npm --version
    else
        echo "✗ Node.js still not found. Please check the path manually."
    fi
else
    echo "nvm-windows directory not found at /c/nvm4w/nodejs/"
    echo "Please check your nvm-windows installation."
fi

