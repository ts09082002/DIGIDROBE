# Workflow: Generating VibeCheck APK for Sharing

To share the VibeCheck app with others for UAT, you need to generate a standalone APK.

## Option 1: EAS Build (Cloud - Recommended)
This is the easiest way as it runs in the cloud and gives you a downloadable link to share.

### Steps:
1.  **Install EAS CLI** (if not already installed):
    ```bash
    npm install -g eas-cli
    ```
2.  **Login to Expo**:
    ```bash
    eas login
    ```
3.  **Run the Build**:
    ```bash
    eas build -p android --profile preview
    ```
4.  **Wait & Download**: Once the build is complete (can take 10-15 mins), EAS will provide a link. Download the APK and share it!

---

## Option 2: Local Build (Windows - Fast)
Since you are already running `run:android` on your device, you have the Android SDK. You can build the APK locally.

### Steps:
1.  **Run Build Command**:
    ```bash
    cd mobile
    npx expo run:android --variant release
    ```
2.  **Locate APK**: Once finished, the APK will be located at:
    `mobile/android/app/build/outputs/apk/release/app-release.apk`
3.  **Share**: You can send this `app-release.apk` file via WhatsApp or Drive.

---

## Important Pre-build Check
Before building, make sure your `.env` has the correct `EXPO_PUBLIC_API_BASE_URL` pointing to your hosted or reachable backend IP if you plan to use sync features.
