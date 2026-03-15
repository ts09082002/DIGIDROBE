/**
 * Google Sign-In button — uses dynamic require so the app doesn't crash
 * in Expo Go (where native ExpoWebBrowser module is unavailable).
 *
 * • Expo Go  → shows a friendly "use dev build" message
 * • Dev build (npx expo run:android) → full Google OAuth flow
 */
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

// ── Dynamic imports — these crash if native modules are missing (Expo Go) ──
let AuthSession: typeof import('expo-auth-session') | null = null;
let WebBrowser: typeof import('expo-web-browser') | null = null;

try {
    WebBrowser = require('expo-web-browser');
    AuthSession = require('expo-auth-session');
    WebBrowser!.maybeCompleteAuthSession();
} catch {
    AuthSession = null;
    WebBrowser = null;
}

const WEB_CLIENT_ID =
    '838322575800-lluotvoiimbfrftp44bphkrtmge8i2ii.apps.googleusercontent.com';

interface GoogleSignInButtonProps {
    label: string;
    style?: object;
    textStyle?: object;
    disabled?: boolean;
}

// ── Fallback shown in Expo Go ──
function FallbackButton({ label, style, textStyle, disabled }: GoogleSignInButtonProps) {
    return (
        <TouchableOpacity
            style={style}
            onPress={() =>
                Alert.alert(
                    'Google Sign-In',
                    'Google Sign-In requires a development build.\n\nRun this command to enable it:\nnpx expo run:android',
                )
            }
            disabled={disabled}
        >
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={textStyle}>{label}</Text>
        </TouchableOpacity>
    );
}

// ── Real Google Sign-In (only rendered when native modules are available) ──
function GoogleSignInButtonInner({ label, style, textStyle, disabled }: GoogleSignInButtonProps) {
    const [loading, setLoading] = useState(false);

    const redirectUri = AuthSession!.makeRedirectUri({
        scheme: 'digidrobe',
        path: 'redirect',
    });

    const discovery = AuthSession!.useAutoDiscovery('https://accounts.google.com');

    const [request, response, promptAsync] = AuthSession!.useAuthRequest(
        {
            clientId: WEB_CLIENT_ID,
            redirectUri,
            scopes: ['openid', 'profile', 'email'],
            responseType: AuthSession!.ResponseType.IdToken,
        },
        discovery,
    );

    useEffect(() => {
        if (!response) return;

        const handleResponse = async () => {
            if (response.type === 'success') {
                const idToken =
                    response.params?.id_token ||
                    (response as any).authentication?.idToken;

                if (!idToken) {
                    Alert.alert('Login Error', 'No ID token received from Google.');
                    return;
                }

                try {
                    const credential = GoogleAuthProvider.credential(idToken);
                    await signInWithCredential(auth, credential);
                } catch (error: any) {
                    console.error('Firebase credential error:', error);
                    Alert.alert(
                        'Google Sign-In Failed',
                        error?.message || 'Could not sign in with Google.',
                    );
                }
            } else if (response.type === 'error') {
                console.error('Google auth error:', response.error);
                Alert.alert('Google Error', response.error?.message || 'Authentication failed.');
            }
        };

        handleResponse();
    }, [response]);

    const handlePress = async () => {
        if (!request || !discovery) {
            Alert.alert('Please Wait', 'Google Sign-In is still loading. Try again in a moment.');
            return;
        }
        setLoading(true);
        try {
            await promptAsync();
        } catch (error: any) {
            console.error('Google promptAsync error:', error);
            Alert.alert(
                'Google Sign-In Error',
                error?.message || 'Could not open Google sign-in. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableOpacity
            style={style}
            onPress={handlePress}
            disabled={disabled || loading || !request}
        >
            {loading ? (
                <ActivityIndicator size={20} color="#EA4335" />
            ) : (
                <Ionicons name="logo-google" size={20} color="#EA4335" />
            )}
            <Text style={textStyle}>{label}</Text>
        </TouchableOpacity>
    );
}

// ── Exported component — picks the right version automatically ──
export default function GoogleSignInButton(props: GoogleSignInButtonProps) {
    if (!AuthSession || !WebBrowser) {
        return <FallbackButton {...props} />;
    }
    return <GoogleSignInButtonInner {...props} />;
}
