import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function LoginScreen() {
    const { isDarkMode } = useTheme();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const theme = {
        background: isDarkMode ? '#000000' : '#F8F9FA',
        card: isDarkMode ? '#0D0D0D' : Colors.white,
        text: isDarkMode ? '#FFFFFF' : Colors.charcoal,
        textSecondary: isDarkMode ? '#A09080' : Colors.darkGray,
        inputBg: isDarkMode ? '#1A1A1A' : '#F5F5F5',
        border: isDarkMode ? '#3A2E22' : Colors.lightGray,
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Router will automatically redirect to home due to auth state change
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <KeyboardAvoidingView 
                style={styles.keyboardView} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoIconBg}>
                            <Ionicons name="diamond" size={24} color="#000" />
                        </View>
                        <Text style={[styles.title, { color: theme.text }]}>Wauderobe</Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Elevate your personal aesthetic</Text>
                    </View>

                    {/* Inputs */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }]}>
                            <Ionicons name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="name@example.com"
                                placeholderTextColor={theme.textSecondary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.passwordHeader}>
                            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
                            <TouchableOpacity>
                                <Text style={styles.forgotPassword}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }]}>
                            <Ionicons name="lock-closed" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="••••••••"
                                placeholderTextColor={theme.textSecondary}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Sign In Button */}
                    <TouchableOpacity 
                        style={styles.primaryButton}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                        <Text style={[styles.dividerText, { color: theme.textSecondary }]}>OR CONTINUE WITH</Text>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    </View>

                    {/* Google Button */}
                    <GoogleSignInButton
                        label="Sign in with Google"
                        style={[styles.outlineButton, { borderColor: theme.border }]}
                        textStyle={[styles.outlineButtonText, { color: theme.text }]}
                        disabled={isLoading}
                    />

                    {/* Sign Up Link */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: theme.textSecondary }]}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/signup')}>
                            <Text style={styles.footerLink}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    card: {
        padding: 30,
        borderRadius: BorderRadius.xl,
        ...Shadows.md,
    },
    /* Logo */
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoIconBg: {
        backgroundColor: '#F9ECD3',
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
    },
    /* Inputs */
    inputGroup: {
        marginBottom: 20,
    },
    passwordHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    forgotPassword: {
        fontSize: 12,
        color: '#5DADE2',
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        paddingHorizontal: 14,
        height: 50,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        height: '100%',
    },
    eyeIcon: {
        padding: 4,
    },
    /* Buttons */
    primaryButton: {
        backgroundColor: '#5DADE2',
        height: 50,
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    /* Divider */
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    divider: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 12,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
    },
    /* Google Button */
    outlineButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        marginBottom: 24,
        gap: 10,
    },
    outlineButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    /* Footer */
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
    },
    footerLink: {
        fontSize: 14,
        fontWeight: '700',
        color: '#5DADE2',
    },
});
