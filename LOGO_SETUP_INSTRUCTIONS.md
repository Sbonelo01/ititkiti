# Logo Setup Instructions

## Step 1: Save Your Logo Image

Please save your logo image (the one with the QR code and "tikiti." text) as:
- **File name:** `tikiti-logo.png`
- **Location:** `public/tikiti-logo.png`

## Step 2: Create Favicon (Optional but Recommended)

For the browser tab favicon, you have two options:

### Option A: Use the same logo
Save a smaller version (32x32 or 64x64 pixels) as:
- `public/favicon.ico` or
- `src/app/icon.png` (Next.js will automatically use this)

### Option B: Create a simple icon
Create a simplified version of just the "tikiti." logo part (without the QR code) for the favicon.

## What Has Been Updated

The following components have been updated to use the new logo:

1. ✅ **Navbar** (`src/components/Navbar.tsx`)
   - Mobile header logo
   - Desktop navbar logo

2. ✅ **Footer** (`src/components/Footer.tsx`)
   - Brand section logo

3. ✅ **Favicon** (`src/app/layout.tsx`)
   - Browser tab icon metadata

4. ✅ **App Icon** (`src/app/icon.svg`)
   - Next.js app icon (placeholder created)

## Image Requirements

- **Format:** PNG (recommended) or SVG
- **Recommended size:** 
  - Logo: 200x200px or larger (will be scaled down)
  - Favicon: 32x32px or 64x64px
- **Background:** Transparent (if possible) or white

## Testing

After saving the image:
1. Restart your development server
2. Check the navbar - logo should appear
3. Check the footer - logo should appear
4. Check browser tab - favicon should appear

If the logo doesn't appear:
- Verify the file is saved as `public/tikiti-logo.png`
- Check browser console for 404 errors
- Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

