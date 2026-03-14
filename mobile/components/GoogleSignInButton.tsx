/**
 * Google Sign-In button - safely loads expo-auth-session.
 * If native modules (ExpoApplication, ExpoWebBrowser) are unavailable,
 * shows the button but displays a helpful message on press.
 * 
 * To enable Google sign-in: run "npx expo run:android" with device/emulator connected.
 */
import React, { useEffect } from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

let GoogleModule: typeof import('expo-auth-session/providers/google') | null = null;
try {
    GoogleModule = require('expo-auth-session/providers/google');
} catch {
    GoogleModule = null;
}

const GOOGLE_CONFIG = {
    webClientId: '838322575800-lluotvoiimbfrftp44bphkrtmge8i2ii.apps.googleusercontent.com',
    androidClientId: '838322575800-lluotvoiimbfrftp44bphkrtmge8i2ii.apps.googleusercontent.com',
};

interface GoogleSignInButtonProps {
    label: string;
    style?: object;
    textStyle?: object;
    disabled?: boolean;
}

function FallbackButton({ label, style, textStyle, disabled }: GoogleSignInButtonProps) {
    return (
        <TouchableOpacity
            style={style}
            onPress={() =>
                Alert.alert(
                    'Google Sign-In',
                    'Run "npx expo run:android" (with device/emulator) to enable Google sign-in. Expo Go does not support this feature.'
                )
            }
            disabled={disabled}
        >
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={textStyle}>{label}</Text>
        </TouchableOpacity>
    );
}

function GoogleSignInButtonInner({ label, style, textStyle, disabled }: GoogleSignInButtonProps) {
    const [request, response, promptAsync] = GoogleModule!.useAuthRequest(GOOGLE_CONFIG);

    useEffect(() => {
        try {
            require('expo-web-browser').maybeCompleteAuthSession();
        } catch {
            // Ignore - WebBrowser not available
        }
    }, []);

    useEffect(() => {
        const handleResponse = async () => {
            if (response?.type === 'success') {
                const { id_token } = response.params;
                if (!id_token) {
                    Alert.alert('Login Error', 'No ID token received from Google');
                    return;
                }
                
                try {
                    const credential = GoogleAuthProvider.credential(id_token);
                    await signInWithCredential(auth, credential);
                } catch (error: any) {
                    Alert.alert('Google Sign-In Failed', error.message);
                }
            } else if (response?.type === 'error') {
                Alert.alert('Google Error', response.error?.message || 'Failed to authenticate');
            }
        };
        
        handleResponse();
    }, [response]);

    const handlePress = async () => {
        if (!request) {
            Alert.alert('Auth Error', 'Google Auth request is not ready. Please try again.');
            return;
        }
        await promptAsync();
    };

    return (
        <TouchableOpacity style={style} onPress={handlePress} disabled={disabled || !request}>
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={textStyle}>{label}</Text>
        </TouchableOpacity>
    );
}

export default function GoogleSignInButton(props: GoogleSignInButtonProps) {
    if (!GoogleModule) {
        return <FallbackButton {...props} />;
    }
    return <GoogleSignInButtonInner {...props} />;
}
