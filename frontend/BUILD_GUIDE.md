# 📱 Solar Empire - Mobile App Build Guide

## Overview
This guide will help you build iOS and Android apps for Solar Empire using Expo EAS Build.

---

## Prerequisites
- Node.js installed (v18 or higher)
- Your Expo account: **Strategic39**

---

## Step-by-Step Instructions

### Step 1: Download Your Code

1. In the Emergent chat, click the **"Download Code"** button (top right corner)
2. Extract the ZIP file to a folder on your computer
3. Open a terminal/command prompt

---

### Step 2: Navigate to Frontend Folder

```bash
cd path/to/extracted/folder/frontend
```

For example:
- **Mac/Linux:** `cd ~/Downloads/solar-empire/frontend`
- **Windows:** `cd C:\Users\YourName\Downloads\solar-empire\frontend`

---

### Step 3: Install Dependencies

```bash
npm install
```

Wait for this to complete (1-2 minutes).

---

### Step 4: Install EAS CLI

```bash
npm install -g eas-cli
```

---

### Step 5: Login to Expo

```bash
npx eas login
```

Enter your Expo credentials:
- **Username:** Strategic39
- **Password:** (your password)

---

### Step 6: Configure the Project

```bash
npx eas build:configure
```

When prompted:
- Select **"All"** for platforms
- Say **"Yes"** to create a new project on Expo

---

### Step 7: Start the Build! 🚀

**For Preview builds (recommended for testing):**

```bash
npx eas build --platform all --profile preview
```

This will:
- Build an **Android APK** (installable directly)
- Build an **iOS Simulator** build

**For Production builds (App Store/Play Store):**

```bash
npx eas build --platform all --profile production
```

---

### Step 8: Wait for Builds

- Builds run in Expo's cloud servers
- Takes approximately **15-20 minutes**
- You'll see a URL to track progress: `https://expo.dev/accounts/strategic39/projects/solar-empire/builds`

---

### Step 9: Download Your Apps

Once complete:

**Android:**
1. Go to your build page on expo.dev
2. Click "Download" on the Android build
3. Transfer APK to your phone
4. Install it (enable "Install from unknown sources" if needed)

**iOS (Simulator):**
1. Download the .tar.gz file
2. Extract it
3. Drag the .app file into your iOS Simulator

**iOS (Real Device):**
You'll need to set up TestFlight with an Apple Developer account ($99/year)

---

## Quick Reference Commands

| Command | Description |
|---------|-------------|
| `npx eas login` | Login to Expo |
| `npx eas whoami` | Check logged-in user |
| `npx eas build --platform android` | Build Android only |
| `npx eas build --platform ios` | Build iOS only |
| `npx eas build --platform all` | Build both platforms |
| `npx eas build:list` | List all your builds |

---

## Troubleshooting

### "Not logged in"
Run `npx eas login` again

### "Project not found"
Run `npx eas build:configure` first

### Build fails
Check the build logs on expo.dev for specific errors

---

## Need Help?

- Expo Documentation: https://docs.expo.dev/build/introduction/
- EAS Build: https://docs.expo.dev/build/setup/

---

## Your App Details

| Property | Value |
|----------|-------|
| App Name | Solar Empire |
| Bundle ID (iOS) | com.solarempire.app |
| Package (Android) | com.solarempire.app |
| Expo Owner | strategic39 |

---

Happy Building! ☀️👑
