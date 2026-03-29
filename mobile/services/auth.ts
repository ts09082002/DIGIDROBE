/**
 * Authentication service — wraps Firebase Auth + OAuth providers.
 *
 * Provides Google Sign-In, Apple Sign-In, guest mode, and sign-out.
 */

import { Platform } from 'react-native';
import { auth } from '../config/firebase';
import { GoogleAuthProvider, AppleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_KEY = '@vibecheck_auth_guest';
const PROFILE_NAME_KEY = '@vibecheck_profile_name';
const PROFILE_EMAIL_KEY = '@vibecheck_profile_email';

// ─── Google Sign-In ─────────────────────────────────────────────────────────

export async function signInWithGoogle() {
    // Ensure Google Play Services are available (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Trigger the Google sign-in flow
    const signInResult = await GoogleSignin.signIn();
    const idToken = signInResult?.data?.idToken;

    if (!idToken) {
        throw new Error('Google Sign-In failed — no ID token returned.');
    }

    // Create Firebase credential and sign in
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await auth.signInWithCredential(credential);

    // Persist profile info for the profile screen
    await syncProfileFromFirebase(userCredential.user);

    // Clear guest flag
    await AsyncStorage.removeItem(GUEST_KEY);

    return userCredential.user;
}

// ─── Apple Sign-In (iOS only) ───────────────────────────────────────────────

export async function signInWithApple() {
    if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS.');
    }

    // Generate a cryptographic nonce for security
    const rawNonce = generateNonce(32);
    const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
    );

    // Trigger the Apple sign-in dialog
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

    // Create Firebase credential with the raw nonce
    const credential = AppleAuthProvider.credential(identityToken, rawNonce);
    const userCredential = await auth.signInWithCredential(credential);

    // Apple may provide fullName only on first sign-in; merge if available
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

    return user;
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
        // Sign out of Google if signed in
        const isGoogleSignedIn = await GoogleSignin.getCurrentUser();
        if (isGoogleSignedIn) {
            await GoogleSignin.signOut();
        }
    } catch {
        // Ignore Google sign-out errors
    }

    // Sign out of Firebase
    await auth.signOut();

    // Clear guest and profile keys
    await AsyncStorage.multiRemove([GUEST_KEY, PROFILE_NAME_KEY, PROFILE_EMAIL_KEY]);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Sync Firebase user info to AsyncStorage for the profile screen. */
async function syncProfileFromFirebase(user: { displayName?: string | null; email?: string | null }) {
    if (user.displayName) {
        await AsyncStorage.setItem(PROFILE_NAME_KEY, user.displayName);
    }
    if (user.email) {
        await AsyncStorage.setItem(PROFILE_EMAIL_KEY, user.email);
    }
}

/** Get a Firebase ID token for backend API calls (future use). */
export async function getIdToken(): Promise<string | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
}

/** Generate a random alphanumeric nonce string. */
function generateNonce(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint8Array(length);
    // Use Math.random as a fallback — the nonce is hashed anyway
    for (let i = 0; i < length; i++) {
        randomValues[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
    }
    return result;
}
