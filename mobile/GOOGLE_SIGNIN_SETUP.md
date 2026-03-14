# Google Sign-In Setup Guide

The app now loads correctly and shows the login/signup screens. The "Sign in with Google" button appears on both screens.

**To make Google sign-in actually work**, you need to run a **development build** (not Expo Go). Follow these steps:

---

## Step 1: Connect an Android Device or Start an Emulator

**Option A - Physical device:**
1. On your Android phone: **Settings → About phone** → tap "Build number" 7 times to enable Developer options
2. **Settings → Developer options** → enable **USB debugging**
3. Connect the phone to your PC with a USB cable

**Option B - Android emulator:**
1. Install [Android Studio](https://developer.android.com/studio)
2. Open **Device Manager** → create a virtual device (e.g. Pixel 6)
3. Start the emulator

---

## Step 2: Rebuild the App

Open a terminal in the project and run:

```bash
cd mobile
npx expo run:android
```

This will:
- Compile the native code (including ExpoApplication, ExpoWebBrowser)
- Build an APK
- Install it on your connected device/emulator
- Start the Metro bundler

**First build can take 5–10 minutes.**

---

## Step 3: Use the App

1. The app will open automatically on your device/emulator
2. Go to the Login or Signup screen
3. Tap **"Sign in with Google"**
4. Complete the Google sign-in flow

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No Android connected device found" | Connect a device via USB, or start an emulator first |
| Still seeing "Run npx expo run:android" when tapping Google button | You're using Expo Go. Close Expo Go and run `npx expo run:android` |
| "Google Sign-In Failed" | Check that the OAuth client IDs in the code match your [Google Cloud Console](https://console.cloud.google.com/) setup |
| Build fails | Run `npx expo prebuild --clean` then `npx expo run:android` again |

---

## Why This Is Required

Google sign-in uses **expo-auth-session** and **expo-web-browser**, which depend on native modules (ExpoApplication, ExpoWebBrowser). These modules are **not available in Expo Go**. A development build compiles them into your app.
