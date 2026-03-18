import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme, useThemeColors } from '../../context/ThemeContext';
import { isSyncEnabled, setSyncEnabled, getLastSyncTime, performSync } from '../../db/sync';
import * as wardrobeLocal from '../../services/wardrobe-local';
import { getSavedLooks } from '../../services/saved-looks-local';
import ScreenContainer from '../../components/ui/ScreenContainer';

const PROFILE_NAME_KEY = '@drobeo_profile_name';
const PROFILE_EMAIL_KEY = '@drobeo_profile_email';

const MENU_ITEMS = [
    { id: 'edit', icon: 'person-outline', label: 'Edit Profile', chevron: true },
    { id: 'prefs', icon: 'options-outline', label: 'Style Preferences', chevron: true },
    { id: 'notif', icon: 'notifications-outline', label: 'Notifications', toggle: true },
    { id: 'theme', icon: 'contrast-outline', label: 'Dark Mode', toggle: true, themeToggle: true },
    { id: 'privacy', icon: 'shield-outline', label: 'Privacy & Security', chevron: true },
    { id: 'storage', icon: 'cloud-outline', label: 'Storage & Data', chevron: true },
    { id: 'help', icon: 'help-circle-outline', label: 'Help & Support', chevron: true },
    { id: 'about', icon: 'information-circle-outline', label: 'About Drobeo', chevron: true },
];

export default function ProfileScreen() {
    const { isDarkMode, toggleTheme } = useTheme();
    const tc = useThemeColors();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [profileName, setProfileName] = useState<string | null>(null);
    const [profileEmail, setProfileEmail] = useState<string | null>(null);
    const [stats, setStats] = useState({ items: 0, outfits: 0, favorites: 0 });

    useEffect(() => {
        (async () => {
            setCloudSyncEnabled(await isSyncEnabled());
            setLastSyncTime(await getLastSyncTime());

            // Load profile info
            const name = await AsyncStorage.getItem(PROFILE_NAME_KEY);
            const email = await AsyncStorage.getItem(PROFILE_EMAIL_KEY);
            setProfileName(name);
            setProfileEmail(email);

            // Load real stats
            try {
                const wardrobeStats = await wardrobeLocal.getStats();
                const allItems = await wardrobeLocal.getAllItems();
                const savedLooks = await getSavedLooks();
                const favCount = allItems.filter((i: any) => i.favorite).length;
                setStats({
                    items: wardrobeStats.totalItems,
                    outfits: savedLooks.length,
                    favorites: favCount,
                });
            } catch {
                // Stats will show 0
            }
        })();
    }, []);

    const handleSyncToggle = useCallback(async (value: boolean) => {
        setCloudSyncEnabled(value);
        await setSyncEnabled(value);
        if (value) {
            try {
                setSyncing(true);
                await performSync();
                setLastSyncTime(await getLastSyncTime());
            } catch (e: any) {
                Alert.alert('Sync failed', e?.message || 'Could not connect to server');
            } finally {
                setSyncing(false);
            }
        }
    }, []);

    const handleManualSync = useCallback(async () => {
        try {
            setSyncing(true);
            await performSync();
            setLastSyncTime(await getLastSyncTime());
        } catch (e: any) {
            Alert.alert('Sync failed', e?.message || 'Could not connect to server');
        } finally {
            setSyncing(false);
        }
    }, []);

    return (
        <ScreenContainer>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: tc.textPrimary }]}>Profile</Text>
                    <TouchableOpacity
                        style={[styles.settingsBtn, { backgroundColor: tc.iconBtnBg }]}
                        accessibilityRole="button"
                        accessibilityLabel="Settings"
                    >
                        <Ionicons name="settings-outline" size={22} color={tc.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: tc.card }]}>
                    <View style={[styles.avatarLarge, { backgroundColor: tc.accentLight, borderColor: Colors.goldLight }]}>
                        <Ionicons name="person" size={36} color={tc.accent} />
                    </View>
                    <Text style={[styles.profileName, { color: tc.textPrimary }]}>
                        {profileName || 'Set Up Profile'}
                    </Text>
                    {profileEmail ? (
                        <Text style={[styles.profileEmail, { color: tc.textSecondary }]}>{profileEmail}</Text>
                    ) : (
                        <Text style={[styles.profileEmail, { color: tc.textMuted }]}>Tap Edit Profile to get started</Text>
                    )}
                </View>

                {/* Stats Row */}
                <View style={[styles.statsRow, { backgroundColor: tc.card }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: tc.textPrimary }]}>{stats.items}</Text>
                        <Text style={[styles.statLabel, { color: tc.textSecondary }]}>Items</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: tc.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: tc.textPrimary }]}>{stats.outfits}</Text>
                        <Text style={[styles.statLabel, { color: tc.textSecondary }]}>Outfits</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: tc.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: tc.textPrimary }]}>{stats.favorites}</Text>
                        <Text style={[styles.statLabel, { color: tc.textSecondary }]}>Favorites</Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={[styles.menuCard, { backgroundColor: tc.card }]}>
                    {MENU_ITEMS.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.menuItem,
                                index < MENU_ITEMS.length - 1 && [styles.menuItemBorder, { borderBottomColor: tc.border }],
                            ]}
                            accessibilityRole={item.toggle ? 'switch' : 'button'}
                            accessibilityLabel={item.label}
                        >
                            <View style={styles.menuLeft}>
                                <View style={[styles.menuIcon, { backgroundColor: tc.accentLight }]}>
                                    <Ionicons name={item.icon as any} size={20} color={tc.accent} />
                                </View>
                                <Text style={[styles.menuLabel, { color: tc.textPrimary }]}>{item.label}</Text>
                            </View>
                            {item.toggle ? (
                                <Switch
                                    value={item.themeToggle ? isDarkMode : notificationsEnabled}
                                    onValueChange={item.themeToggle ? toggleTheme : setNotificationsEnabled}
                                    trackColor={{ false: tc.border, true: Colors.goldLight }}
                                    thumbColor={(item.themeToggle ? isDarkMode : notificationsEnabled) ? tc.accent : tc.textMuted}
                                />
                            ) : (
                                <Ionicons name="chevron-forward" size={18} color={tc.textMuted} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Cloud Sync Section */}
                <View style={[styles.menuCard, { backgroundColor: tc.card, marginTop: Spacing.md }]}>
                    <View
                        style={[
                            styles.menuItem,
                            styles.menuItemBorder,
                            { borderBottomColor: tc.border },
                        ]}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: tc.accentLight }]}>
                                <Ionicons name="cloud-outline" size={20} color={tc.accent} />
                            </View>
                            <View>
                                <Text style={[styles.menuLabel, { color: tc.textPrimary }]}>Cloud Sync</Text>
                                <Text style={[styles.syncSubtext, { color: tc.textSecondary }]}>
                                    Metadata only — images stay on device
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={cloudSyncEnabled}
                            onValueChange={handleSyncToggle}
                            trackColor={{ false: tc.border, true: Colors.goldLight }}
                            thumbColor={cloudSyncEnabled ? tc.accent : tc.textMuted}
                        />
                    </View>
                    {cloudSyncEnabled && (
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleManualSync}
                            disabled={syncing}
                            accessibilityRole="button"
                            accessibilityLabel="Sync now"
                        >
                            <View style={styles.menuLeft}>
                                <View style={[styles.menuIcon, { backgroundColor: tc.accentLight }]}>
                                    {syncing ? (
                                        <ActivityIndicator size="small" color={tc.accent} />
                                    ) : (
                                        <Ionicons name="sync-outline" size={20} color={tc.accent} />
                                    )}
                                </View>
                                <View>
                                    <Text style={[styles.menuLabel, { color: tc.textPrimary }]}>
                                        {syncing ? 'Syncing...' : 'Sync Now'}
                                    </Text>
                                    {lastSyncTime && (
                                        <Text style={[styles.syncSubtext, { color: tc.textSecondary }]}>
                                            Last synced: {new Date(lastSyncTime).toLocaleString()}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                    style={[styles.logoutBtn, { backgroundColor: tc.card }]}
                    accessibilityRole="button"
                    accessibilityLabel="Log out"
                >
                    <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={[styles.version, { color: tc.textMuted }]}>Drobeo v1.0.0</Text>
                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    settingsBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    profileCard: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        marginHorizontal: Spacing.xl,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.lg,
        ...Shadows.sm,
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        marginBottom: Spacing.md,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        fontFamily: FontFamily.body,
        marginBottom: Spacing.md,
    },
    statsRow: {
        flexDirection: 'row',
        borderRadius: BorderRadius.xl,
        marginHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadows.sm,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: FontFamily.bodyMedium,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
    },
    menuCard: {
        borderRadius: BorderRadius.xl,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.xl,
        ...Shadows.sm,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        flex: 1,
    },
    menuIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    syncSubtext: {
        fontSize: 12,
        fontFamily: FontFamily.body,
        marginTop: 2,
    },
    menuLabel: {
        fontSize: 15,
        fontWeight: '500',
        fontFamily: FontFamily.bodyMedium,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
        marginHorizontal: Spacing.xl,
        borderRadius: BorderRadius.xl,
        ...Shadows.sm,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        color: Colors.error,
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: FontFamily.body,
        marginTop: Spacing.lg,
    },
});
