/**
 * Authentication service — wraps Firebase Auth + OAuth providers.
 *
 * Provides Google Sign-In, Apple Sign-In, guest mode, and sign-out.
 */

import { Platform } from 'react-native';
import { auth } from '../config/firebase';
import { GoogleAuthProvider, AppleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureGoogleSignIn } from '../config/google-signin';

const GUEST_KEY = '@vibecheck_auth_guest';
const PROFILE_NAME_KEY = '@vibecheck_profile_name';
const PROFILE_EMAIL_KEY = '@vibecheck_profile_email';

const DEVELOPER_ERROR_MESSAGE =
    'Google Sign-In is not configured for this APK build. ' +
    'Add your EAS release SHA-1 to Firebase Console, re-download google-services.json, and rebuild. ' +
    'Run: npm run android:firebase-sha';

// ─── Google Sign-In ─────────────────────────────────────────────────────────

async function clearStaleGoogleSession(): Promise<void> {
    try {
        await GoogleSignin.signOut();
    } catch {
        // Ignore — no active Google session
    }
}

function isDeveloperError(error: unknown): boolean {
    const code = (error as { code?: string | number })?.code;
    return code === '10' || code === 10 || code === 'DEVELOPER_ERROR';
}

function mapGoogleSignInError(error: unknown): Error {
    if (isDeveloperError(error)) {
        return new Error(DEVELOPER_ERROR_MESSAGE);
    }

    const code = (error as { code?: string | number })?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED || code === '12501') {
        const cancelled = new Error('Sign-in cancelled');
        (cancelled as { code?: string }).code = String(code);
        return cancelled;
    }

    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return new Error('Google Play Services are not available on this device.');
    }

    const message = (error as { message?: string })?.message;
    return new Error(message || 'Google sign-in failed. Please try again.');
}

async function requestGoogleIdToken(): Promise<string> {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await clearStaleGoogleSession();

    let signInResult;
    try {
        signInResult = await GoogleSignin.signIn();
    } catch (error) {
        throw mapGoogleSignInError(error);
    }

    let idToken = signInResult?.data?.idToken;
    if (idToken) return idToken;

    // Retry once after clearing cached Google credentials (common after long idle)
    await GoogleSignin.revokeAccess().catch(() => undefined);
    await clearStaleGoogleSession();

    try {
        const retryResult = await GoogleSignin.signIn();
        idToken = retryResult?.data?.idToken;
    } catch (error) {
        throw mapGoogleSignInError(error);
    }

    if (!idToken) {
        throw new Error('Google Sign-In failed — no ID token returned. Please try again.');
    }

    return idToken;
}

export async function signInWithGoogle() {
    const idToken = await requestGoogleIdToken();

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await auth.signInWithCredential(credential);

    await syncProfileFromFirebase(userCredential.user);
    await AsyncStorage.removeItem(GUEST_KEY);

    return userCredential.user;
}

// ─── Apple Sign-In (iOS only) ───────────────────────────────────────────────

export async function signInWithApple() {
    if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS.');
    }

    const rawNonce = generateNonce(32);
    const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
    );

    const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
    });

    const { identityToken } = appleCredential;
    if (!identityToken) {
        throw new Error('Apple Sign-In failed — no identity token returned.');
    }

    const credential = AppleAuthProvider.credential(identityToken, rawNonce);
    const userCredential = await auth.signInWithCredential(credential);

    const user = userCredential.user;
    if (appleCredential.fullName) {
        const { givenName, familyName } = appleCredential.fullName;
        const displayName = [givenName, familyName].filter(Boolean).join(' ');
        if (displayName && !user.displayName) {
            await user.updateProfile({ displayName });
        }
    }

    await syncProfileFromFirebase(user);
    await AsyncStorage.removeItem(GUEST_KEY);

    return userCredential.user;
}

// ─── Guest Mode ─────────────────────────────────────────────────────────────

export async function enterGuestMode(): Promise<void> {
    await AsyncStorage.setItem(GUEST_KEY, 'true');
}

export async function isGuestMode(): Promise<boolean> {
    const value = await AsyncStorage.getItem(GUEST_KEY);
    return value === 'true';
}

// ─── Sign Out ───────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
    try {
        configureGoogleSignIn();
        const isGoogleSignedIn = await GoogleSignin.getCurrentUser();
        if (isGoogleSignedIn) {
            await GoogleSignin.signOut();
        }
    } catch {
        // Ignore Google sign-out errors
    }

    await auth.signOut();
    await AsyncStorage.multiRemove([GUEST_KEY, PROFILE_NAME_KEY, PROFILE_EMAIL_KEY]);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function syncProfileFromFirebase(user: { displayName?: string | null; email?: string | null }) {
    if (user.displayName) {
        await AsyncStorage.setItem(PROFILE_NAME_KEY, user.displayName);
    }
    if (user.email) {
        await AsyncStorage.setItem(PROFILE_EMAIL_KEY, user.email);
    }
}

/** Get a Firebase ID token for backend API calls. Force refresh after long idle. */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken(forceRefresh);
}

function generateNonce(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        randomValues[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
    }
    return result;
}
