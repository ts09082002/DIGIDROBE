import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Platform,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { auth, storage } from '../../config/firebase';
import { signOut, updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { api, WardrobeStats, OOTDStats } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STYLE_DNA = [
    { label: 'Chic', active: false },
    { label: 'Sustainable', active: true },
    { label: 'Neutral Palette', active: false },
    { label: 'Linen & Silk', active: false },
    { label: 'Capsule Wardrobe', active: false },
];

const ESSENTIAL_LINKS = [
    { id: 'edit', icon: 'person', label: 'Edit Profile' },
    { id: 'measurements', icon: 'body', label: 'Avatar Measurements' },
    { id: 'security', icon: 'lock-closed', label: 'Privacy & Security' },
    { id: 'logout', icon: 'log-out', label: 'Logout', color: '#FF4B4B' },
];

export default function ProfileScreen() {
    const { isDarkMode } = useTheme();
    const { user, isLoading: authLoading } = useAuth();
    const [stats, setStats] = useState<WardrobeStats | null>(null);
    const [ootdStats, setOotdStats] = useState<OOTDStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.displayName || '');
    const [isUpdating, setIsUpdating] = useState(false);

    // Password change state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [passLoading, setPassLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setNewName(user.displayName || '');
            loadStats();
        }
    }, [user]);

    const loadStats = async () => {
        try {
            const [wStats, oStats] = await Promise.all([
                api.getStats(),
                api.getOOTDStats(30)
            ]);
            setStats(wStats);
            setOotdStats(oStats);
        } catch (error) {
            console.error('Error loading profile stats', error);
        } finally {
            setLoading(false);
        }
    };

    const theme = {
        background: isDarkMode ? '#1A1410' : '#FEFCF9', // Creamy white
        card: isDarkMode ? '#2A2018' : Colors.white,
        textPrimary: isDarkMode ? '#FFFFFF' : '#1C2B39', // Navy-ish dark blue
        textSecondary: isDarkMode ? '#A09080' : '#6B7A8B',
        textGold: isDarkMode ? '#EAD699' : '#D4A843',
        pillBg: isDarkMode ? '#332A1E' : '#FAF6ED',
        divider: isDarkMode ? '#3A2E22' : '#EAE8E3',
        inputBg: isDarkMode ? '#332A1E' : '#F9F9F9',
    };

    const handleUpdateName = async () => {
        if (!user || !newName.trim()) return;
        setIsUpdating(true);
        try {
            await updateProfile(user, { displayName: newName });
            setIsEditingName(false);
            Alert.alert('Success', 'Profile name updated!');
        } catch (error) {
            Alert.alert('Error', 'Failed to update name');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!user || !user.email) return;
        if (!currentPassword || !newPass || !confirmPass) {
            Alert.alert('Error', 'Please fill all password fields');
            return;
        }
        if (newPass !== confirmPass) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (newPass.length < 6) {
            Alert.alert('Error', 'Password should be at least 6 characters');
            return;
        }

        setPassLoading(true);
        try {
            // Re-authenticate user first
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            
            // Update password
            await updatePassword(user, newPass);
            
            Alert.alert('Success', 'Password updated successfully!');
            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPass('');
            setConfirmPass('');
        } catch (error: any) {
            console.error('Password update error:', error);
            const msg = error.code === 'auth/wrong-password' 
                ? 'Current password is incorrect' 
                : (error.message || 'Failed to update password');
            Alert.alert('Error', msg);
        } finally {
            setPassLoading(false);
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled && user) {
            setIsUpdating(true);
            try {
                const manipulated = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 300, height: 300 } }],
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );
                
                const response = await fetch(manipulated.uri);
                const blob = await response.blob();
                const storageRef = ref(storage, `profile_pictures/${user.uid}`);
                await uploadBytes(storageRef, blob);
                const photoURL = await getDownloadURL(storageRef);
                
                await updateProfile(user, { photoURL });
                Alert.alert('Success', 'Profile picture updated!');
            } catch (error: any) {
                console.error('Update profile picture error:', error);
                Alert.alert('Error', `Failed to update profile picture: ${error.message || 'Unknown error'}`);
            } finally {
                setIsUpdating(false);
            }
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error', error);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>WAUDEROBE</Text>
                    <TouchableOpacity onPress={handleLogout}>
                        <Ionicons name="settings-sharp" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Profile Info */}
                <View style={styles.profileSection}>
                    <TouchableOpacity 
                        style={styles.avatarContainer} 
                        onPress={handlePickImage}
                        disabled={isUpdating}
                    >
                        <View style={styles.avatarRing1}>
                            <View style={styles.avatarRing2}>
                                {user?.photoURL ? (
                                    <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
                                ) : (
                                    <View style={[styles.avatarImage, { backgroundColor: '#F0D4A0', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Ionicons name="person" size={50} color="#D4A843" />
                                    </View>
                                )}
                            </View>
                        </View>
                        <View style={styles.avatarEditBadge}>
                            <Ionicons name="camera" size={14} color="#FFF" />
                        </View>
                        {isUpdating && (
                            <View style={styles.avatarLoader}>
                                <ActivityIndicator color="#D4A843" />
                            </View>
                        )}
                    </TouchableOpacity>

                    {isEditingName ? (
                        <View style={styles.editNameRow}>
                            <TextInput
                                style={[styles.nameInput, { color: theme.textPrimary, borderBottomColor: theme.textGold }]}
                                value={newName}
                                onChangeText={setNewName}
                                autoFocus
                            />
                            <TouchableOpacity onPress={handleUpdateName} style={styles.saveBtn}>
                                <Ionicons name="checkmark-circle" size={24} color={theme.textGold} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsEditingName(false)}>
                                <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.nameContainer} onPress={() => setIsEditingName(true)}>
                            <Text style={[styles.profileName, { color: theme.textPrimary }]}>
                                {user?.displayName || 'Fashionista'}
                            </Text>
                            <Ionicons name="pencil" size={14} color={theme.textSecondary} style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    )}

                    <Text style={[styles.profileEmail, { color: theme.textGold }]}>
                        {user?.email}
                    </Text>

                    <Text style={[styles.profileBio, { color: theme.textSecondary }]}>
                        "Curating a timeless, sustainable wardrobe."
                    </Text>
                    <View style={styles.locationContainer}>
                        <Ionicons name="location" size={12} color={theme.textGold} />
                        <Text style={[styles.locationText, { color: theme.textGold }]}>PARIS, FRANCE</Text>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                        <Text style={[styles.statNumber, { color: theme.textGold }]}>
                            {stats?.totalItems || 0}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>ITEMS</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                        <Text style={[styles.statNumber, { color: theme.textGold }]}>
                            {ootdStats?.mostWorn.length || 0}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>OUTFITS</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                        <Text style={[styles.statNumber, { color: theme.textGold, fontSize: 16 }]}>
                            Minimal
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>MOST WORN</Text>
                    </View>
                </View>

                {/* Style DNA */}
                <View style={styles.sectionContainer}>
                    <div className="sectionHeader" style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>STYLE DNA</Text>
                        <View style={[styles.sectionLine, { backgroundColor: theme.divider }]} />
                    </div>
                    <View style={styles.dnaPills}>
                        {STYLE_DNA.map((pill, index) => (
                            <View 
                                key={index} 
                                style={[
                                    styles.dnaPill, 
                                    { 
                                        backgroundColor: pill.active ? theme.textGold : theme.pillBg,
                                        borderColor: theme.textGold,
                                        borderWidth: pill.active ? 0 : 1
                                    }
                                ]}
                            >
                                <Text style={[
                                    styles.dnaPillText, 
                                    { color: pill.active ? '#FFF' : theme.textGold }
                                ]}>
                                    {pill.label}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Essential Links */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>ESSENTIAL LINKS</Text>
                        <View style={[styles.sectionLine, { backgroundColor: theme.divider }]} />
                    </View>
                    <View style={styles.linksContainer}>
                        {ESSENTIAL_LINKS.map((link) => (
                            <TouchableOpacity 
                                key={link.id} 
                                style={[styles.linkCard, { backgroundColor: theme.card }]}
                                onPress={() => {
                                    if (link.id === 'logout') handleLogout();
                                    if (link.id === 'edit') setIsEditingName(true);
                                    if (link.id === 'security') setShowPasswordModal(true);
                                }}
                            >
                                <View style={styles.linkLeft}>
                                    <Ionicons name={link.icon as any} size={20} color={link.color || theme.textGold} />
                                    <Text style={[styles.linkLabel, { color: link.color || theme.textPrimary }]}>{link.label}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Change Password Modal */}
            <Modal
                visible={showPasswordModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Change Password</Text>
                            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                                <Ionicons name="close" size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Current Password</Text>
                        <TextInput
                            style={[styles.passwordInput, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
                            secureTextEntry
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="Enter current password"
                            placeholderTextColor={theme.textSecondary}
                        />

                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>New Password</Text>
                        <TextInput
                            style={[styles.passwordInput, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
                            secureTextEntry
                            value={newPass}
                            onChangeText={setNewPass}
                            placeholder="Enter new password (min 6 chars)"
                            placeholderTextColor={theme.textSecondary}
                        />

                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confirm New Password</Text>
                        <TextInput
                            style={[styles.passwordInput, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
                            secureTextEntry
                            value={confirmPass}
                            onChangeText={setConfirmPass}
                            placeholder="Confirm new password"
                            placeholderTextColor={theme.textSecondary}
                        />

                        <TouchableOpacity
                            style={[styles.updatePassBtn, { backgroundColor: theme.textGold }]}
                            onPress={handleUpdatePassword}
                            disabled={passLoading}
                        >
                            {passLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.updatePassBtnText}>Update Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 20 : 10,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 2,
    },
    profileSection: {
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 30,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatarRing1: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(212, 168, 67, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarRing2: {
        width: 114,
        height: 114,
        borderRadius: 57,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    avatarImage: {
        width: 104,
        height: 104,
        borderRadius: 52,
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#D4A843',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FEFCF9',
    },
    avatarLoader: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 65,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    nameInput: {
        fontSize: 22,
        fontWeight: '800',
        borderBottomWidth: 1,
        paddingVertical: 4,
        minWidth: 150,
        textAlign: 'center',
    },
    saveBtn: {
        padding: 4,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    profileName: {
        fontSize: 26,
        fontWeight: '800',
    },
    profileEmail: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    profileBio: {
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: 10,
        textAlign: 'center',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 30,
        marginBottom: 36,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        maxWidth: 100,
        ...Shadows.sm,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    sectionContainer: {
        paddingHorizontal: 24,
        marginBottom: 36,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    sectionLine: {
        flex: 1,
        height: 1,
    },
    dnaPills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    dnaPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    dnaPillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    linksContainer: {
        gap: 12,
    },
    linkCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderRadius: 16,
        ...Shadows.sm,
    },
    linkLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    linkLabel: {
        fontSize: 14,
        fontWeight: '700',
    },

    /* Modal Styles */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        padding: 24,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
    },
    passwordInput: {
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        marginBottom: 16,
    },
    updatePassBtn: {
        borderRadius: 18,
        padding: 18,
        alignItems: 'center',
        marginTop: 8,
        ...Shadows.sm,
    },
    updatePassBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
