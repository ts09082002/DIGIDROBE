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
import { configureGoogleSignIn } from './google-signin';

configureGoogleSignIn();

const auth = getAuth();
export { auth };
