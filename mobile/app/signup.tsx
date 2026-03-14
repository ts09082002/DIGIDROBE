import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function SignupScreen() {
    const { isDarkMode } = useTheme();
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const theme = {
        background: isDarkMode ? '#1A1410' : '#F8F9FA',
        card: isDarkMode ? '#2A2018' : Colors.white,
        text: isDarkMode ? '#FFFFFF' : Colors.charcoal,
        textSecondary: isDarkMode ? '#A09080' : Colors.darkGray,
        inputBg: isDarkMode ? '#332A1E' : '#F5F5F5',
        border: isDarkMode ? '#3A2E22' : Colors.lightGray,
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            const manipulated = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [{ resize: { width: 300, height: 300 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );
            setProfileImage(manipulated.uri);
        }
    };

    const handleSignup = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            let photoURL = null;
            if (profileImage) {
                const response = await fetch(profileImage);
                const blob = await response.blob();
                const storageRef = ref(storage, `profile_pictures/${user.uid}`);
                await uploadBytes(storageRef, blob);
                photoURL = await getDownloadURL(storageRef);
            }

            await updateProfile(user, { 
                displayName: name,
                photoURL: photoURL
            });
            
            // Router will automatically redirect to home due to auth state change
        } catch (error: any) {
            Alert.alert('Signup Failed', error.message || 'Could not create account');
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
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Back Button */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                        <Text style={[styles.backText, { color: theme.text }]}>Create Account</Text>
                    </TouchableOpacity>

                    <View style={styles.logoContainer}>
                        <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
                            {profileImage ? (
                                <RNImage source={{ uri: profileImage }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="camera" size={30} color="#FFF" />
                                </View>
                            )}
                            <View style={styles.addIconContainer}>
                                <Ionicons name="add" size={16} color="#FFF" />
                            </View>
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.text }]}>Join Wauderobe</Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Elevate your personal style today with your digital fashion sanctuary.</Text>
                    </View>

                    {/* Inputs */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }]}>
                            <Ionicons name="person" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Alex Thompson"
                                placeholderTextColor={theme.textSecondary}
                                autoCapitalize="words"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }]}>
                            <Ionicons name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="alex@example.com"
                                placeholderTextColor={theme.textSecondary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Password</Text>
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

                    {/* Sign Up Button */}
                    <TouchableOpacity 
                        style={styles.primaryButton}
                        onPress={handleSignup}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <>
                                <Text style={styles.primaryButtonText}>Create Account</Text>
                                <Ionicons name="arrow-forward" size={20} color="#FFF" style={styles.btnIcon} />
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                        <Text style={[styles.dividerText, { color: theme.textSecondary }]}>OR</Text>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    </View>

                    {/* Google Button */}
                    <GoogleSignInButton
                        label="Sign in with Google"
                        style={[styles.outlineButton, { borderColor: theme.border, backgroundColor: theme.card }]}
                        textStyle={[styles.outlineButtonText, { color: theme.text }]}
                        disabled={isLoading}
                    />

                    {/* Login Link */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: theme.textSecondary }]}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text style={styles.footerLink}>Log In</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Legal */}
                    <Text style={[styles.legalText, { color: theme.textSecondary }]}>
                        BY JOINING, YOU AGREE TO OUR{'\n'}
                        <Text style={styles.legalLink}>TERMS OF SERVICE</Text> & <Text style={styles.legalLink}>PRIVACY POLICY</Text>
                    </Text>

                </ScrollView>
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
    },
    scrollContent: {
        padding: 24,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        paddingBottom: 40,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        gap: 12,
    },
    backText: {
        fontSize: 18,
        fontWeight: '600',
    },
    /* Logo */
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarPicker: {
        position: 'relative',
        marginBottom: 20,
    },
    avatarPlaceholder: {
        backgroundColor: '#D4A843',
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    addIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#1C2B39',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    /* Inputs */
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        paddingHorizontal: 14,
        height: 52,
        borderWidth: 1,
        borderColor: 'transparent',
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
        flexDirection: 'row',
        backgroundColor: '#D4A843',
        height: 54,
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        ...Shadows.sm,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    btnIcon: {
        marginLeft: 8,
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
        fontSize: 13,
        fontWeight: '500',
    },
    /* Google Button */
    outlineButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        marginBottom: 30,
        gap: 12,
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
        marginBottom: 30,
    },
    footerText: {
        fontSize: 15,
    },
    footerLink: {
        fontSize: 15,
        fontWeight: '700',
        color: '#D4A843',
    },
    /* Legal */
    legalText: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 18,
        letterSpacing: 0.5,
    },
    legalLink: {
        textDecorationLine: 'underline',
    },
});
