import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const MENU_ITEMS = [
    { id: 'edit', icon: 'person-outline', label: 'Edit Profile', chevron: true },
    { id: 'prefs', icon: 'options-outline', label: 'Style Preferences', chevron: true },
    { id: 'notif', icon: 'notifications-outline', label: 'Notifications', toggle: true },
    { id: 'privacy', icon: 'shield-outline', label: 'Privacy & Security', chevron: true },
    { id: 'storage', icon: 'cloud-outline', label: 'Storage & Data', chevron: true },
    { id: 'help', icon: 'help-circle-outline', label: 'Help & Support', chevron: true },
    { id: 'about', icon: 'information-circle-outline', label: 'About Digidrobe', chevron: true },
];

export default function ProfileScreen() {
    const { isDarkMode } = useTheme();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const theme = {
        background: isDarkMode ? '#1A1A1A' : Colors.warmGray,
        card: isDarkMode ? '#242424' : Colors.white,
        text: isDarkMode ? '#FFFFFF' : Colors.charcoal,
        textSecondary: isDarkMode ? '#A0A0A0' : Colors.darkGray,
        iconBg: isDarkMode ? '#1A1A1A' : Colors.cream,
        border: isDarkMode ? '#333333' : Colors.lightGray,
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
                    <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: theme.card }]}>
                        <Ionicons name="settings-outline" size={22} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
                    <View style={[styles.avatarLarge, { backgroundColor: theme.iconBg }]}>
                        <Ionicons name="person" size={36} color={Colors.gold} />
                    </View>
                    <Text style={[styles.profileName, { color: theme.text }]}>Sarah Johnson</Text>
                    <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>sarah.j@example.com</Text>
                    <View style={styles.profileBadge}>
                        <Ionicons name="sparkles" size={14} color={Colors.gold} />
                        <Text style={styles.badgeText}>Premium Member</Text>
                    </View>
                </View>

                {/* Stats Row */}
                <View style={[styles.statsRow, { backgroundColor: theme.card }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.text }]}>124</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Items</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.text }]}>18</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Outfits</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.text }]}>42</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Favorites</Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={[styles.menuCard, { backgroundColor: theme.card }]}>
                    {MENU_ITEMS.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.menuItem,
                                index < MENU_ITEMS.length - 1 && [styles.menuItemBorder, { borderBottomColor: theme.border }],
                            ]}
                        >
                            <View style={styles.menuLeft}>
                                <View style={[styles.menuIcon, { backgroundColor: theme.iconBg }]}>
                                    <Ionicons name={item.icon as any} size={20} color={Colors.gold} />
                                </View>
                                <Text style={[styles.menuLabel, { color: theme.text }]}>{item.label}</Text>
                            </View>
                            {item.toggle ? (
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={setNotificationsEnabled}
                                    trackColor={{ false: Colors.lightGray, true: Colors.goldLight }}
                                    thumbColor={notificationsEnabled ? Colors.gold : Colors.mediumGray}
                                />
                            ) : (
                                <Ionicons name="chevron-forward" size={18} color={Colors.mediumGray} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.card }]}>
                    <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={[styles.version, { color: theme.textSecondary }]}>Digidrobe v1.0.0</Text>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.warmGray,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    title: {
        ...Typography.heading1,
    },
    settingsBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    profileCard: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        marginHorizontal: Spacing.xl,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.lg,
        ...Shadows.sm,
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.cream,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.goldLight,
        marginBottom: Spacing.md,
    },
    profileName: {
        ...Typography.heading2,
        fontSize: 20,
        marginBottom: 4,
    },
    profileEmail: {
        ...Typography.bodySmall,
        marginBottom: Spacing.md,
    },
    profileBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.categoryActive,
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.round,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.goldDark,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
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
        color: Colors.charcoal,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.darkGray,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: Colors.lightGray,
    },
    menuCard: {
        backgroundColor: Colors.white,
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
        borderBottomColor: Colors.lightGray,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    menuIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.cream,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.charcoal,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
        marginHorizontal: Spacing.xl,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        ...Shadows.sm,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.error,
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        color: Colors.mediumGray,
        marginTop: Spacing.lg,
    },
});
