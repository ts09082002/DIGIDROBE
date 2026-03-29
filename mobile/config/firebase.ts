/**
 * Firebase Client SDK Configuration
 *
 * @react-native-firebase/app auto-initializes from native config files:
 *   - Android: android/app/google-services.json
 *   - iOS: ios/drobeo/GoogleService-Info.plist
 *
 * Download these from Firebase Console (project: digidrobe-backend).
 */

import { getAuth } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In with the web client ID from Firebase Console.
// Go to: Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration → Web client ID
// Replace the placeholder below with your actual web client ID.
GoogleSignin.configure({
    webClientId: '838322575800-lluotvoiimbfrftp44bphkrtmge8i2ii.apps.googleusercontent.com', // ✅ Ye asli Web Client ID hai
    offlineAccess: true,
});

const auth = getAuth();
export { auth };
