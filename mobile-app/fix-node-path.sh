#!/bin/bash
# Quick fix to add Node.js to Git Bash PATH

echo "Fixing Node.js PATH for Git Bash..."

# Check common nvm-windows locations
NVM_PATHS=(
    "/c/nvm4w/nodejs"
    "/c/nvm4w/nodejs/v20.18.0"
    "/c/nvm4w/nodejs/v20.18.1"
    "/c/nvm4w/nodejs/v20.19.0"
    "/c/Program Files/nodejs"
    "/c/Users/$USER/AppData/Local/Programs/nodejs"
)

FOUND_PATH=""

# Try to find node.exe
for path in "${NVM_PATHS[@]}"; do
    if [ -f "$path/node.exe" ]; then
        FOUND_PATH="$path"
        echo "✓ Found Node.js at: $path"
        break
    fi
done

# If not found, list what's available
if [ -z "$FOUND_PATH" ]; then
    echo "Checking /c/nvm4w/nodejs/ structure..."
    if [ -d "/c/nvm4w/nodejs" ]; then
        echo "Available in /c/nvm4w/nodejs/:"
        ls -la /c/nvm4w/nodejs/ 2>/dev/null | head -20
        
        # Try to find any version
        for version_dir in /c/nvm4w/nodejs/*/; do
            if [ -f "${version_dir}node.exe" ]; then
                FOUND_PATH="${version_dir%/}"
                echo "✓ Found Node.js at: $FOUND_PATH"
                break
            fi
        done
    fi
fi

if [ -n "$FOUND_PATH" ]; then
    # Convert Windows path to Git Bash format if needed
    GITBASH_PATH=$(echo "$FOUND_PATH" | sed 's|\\|/|g' | sed 's|^C:|/c|' | sed 's|^c:|/c|')
    
    # Add to PATH for current session
    export PATH="$GITBASH_PATH:$PATH"
    echo "✓ Added to PATH for this session"
    
    # Add to .bashrc if not already there
    if ! grep -q "$GITBASH_PATH" ~/.bashrc 2>/dev/null; then
        echo "" >> ~/.bashrc
        echo "# Node.js path (added by fix-node-path.sh)" >> ~/.bashrc
        echo "export PATH=\"$GITBASH_PATH:\$PATH\"" >> ~/.bashrc
        echo "✓ Added to ~/.bashrc for future sessions"
    else
        echo "✓ Already in ~/.bashrc"
    fi
    
    # Verify
    if command -v node &> /dev/null; then
        echo ""
        echo "✓ SUCCESS! Node.js is now available:"
        node --version
        npm --version
        echo ""
        echo "You can now run: npm start"
    else
        echo "✗ Node.js still not found. Please check the path manually."
    fi
else
    echo ""
    echo "✗ Could not find Node.js automatically."
    echo ""
    echo "Please run this in PowerShell first to set the active Node.js version:"
    echo "  nvm use 20.18.0"
    echo ""
    echo "Then manually add the path. For example:"
    echo "  export PATH=\"/c/nvm4w/nodejs/v20.18.0:\$PATH\""
    echo "  echo 'export PATH=\"/c/nvm4w/nodejs/v20.18.0:\$PATH\"' >> ~/.bashrc"
fi

