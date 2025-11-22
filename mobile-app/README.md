# Tikiti Ticket Scanner

A React Native mobile app for scanning and validating event tickets via QR codes.

## Prerequisites

- **Node.js v20.x** (required) - Node.js v22 has compatibility issues with Metro bundler
- npm or yarn
- Expo Go app on your mobile device (for testing)

**Note for Git Bash users:** See `SETUP_GIT_BASH.md` for PATH configuration instructions.

### Installing Node.js v20

If you're using Node.js v22, you need to downgrade to v20:

**Windows Users (PowerShell):**
- If using nvm-windows, run: `.\setup-powershell.ps1` (or see `SETUP_WINDOWS.md`)
- **Easiest option:** Download Node.js v20 LTS from [nodejs.org](https://nodejs.org/) and install it

**Mac/Linux Users (using nvm):**
```bash
nvm install 20.18.0
nvm use 20.18.0
```

**Or download directly:**
- Visit [nodejs.org](https://nodejs.org/) and download Node.js v20 LTS

## Features

- ✅ QR Code Scanning
- ✅ Real-time ticket validation
- ✅ Status indicators for:
  - Valid tickets
  - Already used tickets
  - Invalid/not found tickets
- ✅ Platform agnostic (iOS & Android)

## Setup

1. **Ensure you're using Node.js v20:**
   ```bash
   node --version  # Should show v20.x.x
   ```
   
   **If you get "node: not found" in Git Bash:**
   ```bash
   bash fix-node-path.sh
   ```
   This script will automatically find and configure Node.js for Git Bash.

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update API Configuration:**
   - Open `src/services/api.ts`
   - Replace `API_BASE_URL` with your actual backend URL
   - (Optional) Set `MOBILE_API_KEY` if you've configured API key authentication

4. **Start the app:**
   ```bash
   npm start
   ```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- Scan QR code with Expo Go app on your device

## Troubleshooting

### Metro Bundler Error with Node.js v22

If you see an error like:
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './src/stores/FileStore' is not defined
```

This means you're using Node.js v22. **You must use Node.js v20** for this project. See Prerequisites above.

### Clear Cache

If you encounter issues, try clearing the cache:
```bash
npx expo start --clear
```

## Configuration

### API Endpoint
Update the `API_BASE_URL` in `src/services/api.ts` to point to your backend:
```typescript
const API_BASE_URL = 'https://your-domain.com/api';
```

### Permissions
The app requires camera permissions which are automatically requested on first launch.

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

## API Requirements

The app expects the `/api/validate-ticket-mobile` endpoint to return:
```json
{
  "success": boolean,
  "status": "valid" | "already_used" | "not_found" | "error",
  "ticket": {
    "attendee_name": string,
    "email": string,
    "event_id": string,
    "created_at": string
  },
  "error": string (optional)
}
```
