/**
 * Google Sign-In configuration (single source of truth).
 *
 * webClientId MUST be the Firebase "Web client" OAuth ID (client_type 3 in
 * google-services.json), not the Android client ID.
 */
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const GOOGLE_WEB_CLIENT_ID =
    '838322575800-lluotvoiimbfrftp44bphkrtmge8i2ii.apps.googleusercontent.com';

let configured = false;

export function configureGoogleSignIn(): void {
    if (configured) return;

    GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
        scopes: ['profile', 'email'],
    });

    configured = true;
}
