/**
 * Authentication context — provides auth state and methods to the entire app.
 *
 * Follows the same pattern as ThemeContext.tsx:
 *   createContext → Provider component → useAuth hook
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { auth } from '../config/firebase';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
    signInWithGoogle as googleSignIn,
    signInWithApple as appleSignIn,
    enterGuestMode,
    isGuestMode,
    signOut as authSignOut,
} from '../services/auth';

// ─── Types ──────────────────────────────────────────────────────────────────

type AuthContextType = {
    user: FirebaseAuthTypes.User | null;
    isGuest: boolean;
    isLoading: boolean;
    isAuthenticated: boolean; // user !== null || isGuest
    signInWithGoogle: () => Promise<void>;
    signInWithApple: () => Promise<void>;
    continueAsGuest: () => Promise<void>;
    signOut: () => Promise<void>;
};

// ─── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
    user: null,
    isGuest: false,
    isLoading: true,
    isAuthenticated: false,
    signInWithGoogle: async () => {},
    signInWithApple: async () => {},
    continueAsGuest: async () => {},
    signOut: async () => {},
});

// ─── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = user !== null || isGuest;

    // On mount: check guest mode + subscribe to Firebase auth state
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const init = async () => {
            try {
                const guest = await isGuestMode();
                if (guest) {
                    setIsGuest(true);
                    setIsLoading(false);
                    return;
                }
            } catch {
                // Ignore AsyncStorage errors
            }

            // Subscribe to Firebase auth state changes
            unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
                setUser(firebaseUser);
                setIsLoading(false);
            });
        };

        init();

        return () => {
            unsubscribe?.();
        };
    }, []);

    // ─── Methods ────────────────────────────────────────────────────────────

    const handleSignInWithGoogle = useCallback(async () => {
        try {
            const firebaseUser = await googleSignIn();
            setUser(firebaseUser);
            setIsGuest(false);
        } catch (error: any) {
            const code = error?.code;
            if (code === 'SIGN_IN_CANCELLED' || code === '12501') return;
            if (code === '10' || code === 10 || code === 'DEVELOPER_ERROR') {
                Alert.alert(
                    'Google Sign-In Setup Required',
                    error?.message ||
                        'This APK was signed with a certificate that Firebase does not recognize. Add the EAS SHA-1 fingerprint in Firebase Console and rebuild.',
                );
                return;
            }
            Alert.alert('Sign-In Error', error?.message || 'Google sign-in failed. Please try again.');
        }
    }, []);

    const handleSignInWithApple = useCallback(async () => {
        try {
            const firebaseUser = await appleSignIn();
            setUser(firebaseUser);
            setIsGuest(false);
        } catch (error: any) {
            // Don't alert on user cancellation (ERR_CANCELED)
            if (error?.code === 'ERR_CANCELED') return;
            Alert.alert('Sign-In Error', error?.message || 'Apple sign-in failed. Please try again.');
        }
    }, []);

    const handleContinueAsGuest = useCallback(async () => {
        await enterGuestMode();
        setIsGuest(true);
    }, []);

    const handleSignOut = useCallback(async () => {
        try {
            await authSignOut();
            setUser(null);
            setIsGuest(false);
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Sign-out failed.');
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isGuest,
                isLoading,
                isAuthenticated,
                signInWithGoogle: handleSignInWithGoogle,
                signInWithApple: handleSignInWithApple,
                continueAsGuest: handleContinueAsGuest,
                signOut: handleSignOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export const useAuth = () => useContext(AuthContext);
