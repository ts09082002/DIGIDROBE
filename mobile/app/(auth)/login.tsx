import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows, Typography } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ScreenContainer from '../../components/ui/ScreenContainer';

type SigningIn = 'google' | 'apple' | 'guest' | null;

export default function LoginScreen() {
    const tc = useThemeColors();
    const { signInWithGoogle, signInWithApple, continueAsGuest } = useAuth();
    const [signingIn, setSigningIn] = useState<SigningIn>(null);

    const isLoading = signingIn !== null;

    const handleGoogle = async () => {
        setSigningIn('google');
        try {
            await signInWithGoogle();
        } finally {
            setSigningIn(null);
        }
    };

    const handleApple = async () => {
        setSigningIn('apple');
        try {
            await signInWithApple();
        } finally {
            setSigningIn(null);
        }
    };

    const handleGuest = async () => {
        setSigningIn('guest');
        try {
            await continueAsGuest();
        } finally {
            setSigningIn(null);
        }
    };

    return (
        <ScreenContainer>
            {/* ─── Hero Section ───────────────────────────────────────────── */}
            <View style={styles.hero}>
                <Image
                    source={require('../../assets/splash.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={[styles.appName, { color: tc.textPrimary }]}>VibeCheck</Text>
                <Text style={[styles.tagline, { color: tc.textSecondary }]}>
                    Your Digital Wardrobe
                </Text>
            </View>

            {/* ─── Sign-In Card ───────────────────────────────────────────── */}
            <View style={[styles.card, { backgroundColor: tc.card }]}>
                {/* Google Sign-In */}
                <TouchableOpacity
                    style={[styles.socialBtn, styles.googleBtn, { backgroundColor: tc.card, borderColor: tc.border }]}
                    onPress={handleGoogle}
                    disabled={isLoading}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Google"
                >
                    {signingIn === 'google' ? (
                        <ActivityIndicator size="small" color={tc.textPrimary} />
                    ) : (
                        <>
                            <View style={styles.googleIconContainer}>
                                <Text style={styles.googleG}>G</Text>
                            </View>
                            <Text style={[styles.socialBtnText, { color: tc.textPrimary }]}>
                                Continue with Google
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Apple Sign-In (iOS only) */}
                {Platform.OS === 'ios' && (
                    <TouchableOpacity
                        style={[styles.socialBtn, styles.appleBtn]}
                        onPress={handleApple}
                        disabled={isLoading}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Continue with Apple"
                    >
                        {signingIn === 'apple' ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                                <Text style={[styles.socialBtnText, { color: '#FFFFFF' }]}>
                                    Continue with Apple
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {/* Divider */}
                <View style={styles.dividerRow}>
                    <View style={[styles.dividerLine, { backgroundColor: tc.border }]} />
                    <Text style={[styles.dividerText, { color: tc.textMuted }]}>or</Text>
                    <View style={[styles.dividerLine, { backgroundColor: tc.border }]} />
                </View>

                {/* Continue as Guest */}
                <TouchableOpacity
                    style={styles.guestBtn}
                    onPress={handleGuest}
                    disabled={isLoading}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Continue as guest"
                >
                    {signingIn === 'guest' ? (
                        <ActivityIndicator size="small" color={tc.textSecondary} />
                    ) : (
                        <>
                            <Text style={[styles.guestBtnText, { color: tc.textSecondary }]}>
                                Continue as Guest
                            </Text>
                            <Ionicons name="arrow-forward" size={16} color={tc.textSecondary} />
                        </>
                    )}
                </TouchableOpacity>

                {/* Footer */}
                <Text style={[styles.footer, { color: tc.textMuted }]}>
                    By continuing, you agree to our Terms of Service & Privacy Policy
                </Text>
            </View>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    // ─── Hero ────────────────────────────────────────────────────────────
    hero: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    logo: {
        width: 96,
        height: 96,
        marginBottom: Spacing.lg,
    },
    appName: {
        ...Typography.heading1,
        fontSize: 36, // Keep custom size for app logo branding
        marginBottom: Spacing.xs,
    },
    tagline: {
        ...Typography.body,
        letterSpacing: 0.5,
    },

    // ─── Card ────────────────────────────────────────────────────────────
    card: {
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        paddingTop: Spacing.xxxl,
        paddingHorizontal: Spacing.xxl,
        paddingBottom: 48,
        ...Shadows.lg,
    },

    // ─── Social Buttons ─────────────────────────────────────────────────
    socialBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: BorderRadius.md,
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    googleBtn: {
        borderWidth: 1,
        ...Shadows.sm,
    },
    googleIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#4285F4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleG: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        fontFamily: FontFamily.bodyBold,
    },
    appleBtn: {
        backgroundColor: '#000000',
    },
    socialBtnText: {
        ...Typography.button,
    },

    // ─── Divider ─────────────────────────────────────────────────────────
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginVertical: Spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        ...Typography.caption,
        textTransform: 'lowercase',
    },

    // ─── Guest Button ────────────────────────────────────────────────────
    guestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    guestBtnText: {
        ...Typography.button,
        fontSize: 15,
    },

    // ─── Footer ──────────────────────────────────────────────────────────
    footer: {
        ...Typography.caption,
        textAlign: 'center',
    },
});