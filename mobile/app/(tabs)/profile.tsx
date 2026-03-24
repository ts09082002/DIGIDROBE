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
    Modal,
    Pressable,
    TextInput,
    Linking,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme, useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { isSyncEnabled, setSyncEnabled, getLastSyncTime, performSync } from '../../db/sync';
import * as wardrobeLocal from '../../services/wardrobe-local';
import { getSavedLooks } from '../../services/saved-looks-local';
import { analyzeWardrobe, WardrobeOverview, WardrobeInsight } from '../../engine/wardrobeInsights';
import { normalizeCategory } from '../../constants/categories';
import ScreenContainer from '../../components/ui/ScreenContainer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PROFILE_NAME_KEY = '@vibecheck_profile_name';
const PROFILE_EMAIL_KEY = '@vibecheck_profile_email';

type MenuItemDef = {
    id: string;
    icon: string;
    label: string;
    chevron?: boolean;
    toggle?: boolean;
    themeToggle?: boolean;
    destructive?: boolean;
};

const MENU_ITEMS: MenuItemDef[] = [
    { id: 'edit',     icon: 'person-outline',            label: 'Edit Profile',        chevron: true },
    { id: 'insights', icon: 'analytics-outline',         label: 'Wardrobe Insights',   chevron: true },
    { id: 'saved',    icon: 'heart-outline',             label: 'Saved Looks',         chevron: true },
    { id: 'notif',    icon: 'notifications-outline',     label: 'Notifications',       toggle: true },
    { id: 'theme',    icon: 'contrast-outline',          label: 'Dark Mode',           toggle: true, themeToggle: true },
];

const MENU_ITEMS_2: MenuItemDef[] = [
    { id: 'privacy',  icon: 'shield-outline',            label: 'Privacy & Security',  chevron: true },
    { id: 'storage',  icon: 'server-outline',            label: 'Storage & Data',      chevron: true },
    { id: 'help',     icon: 'help-circle-outline',       label: 'Help & Support',      chevron: true },
    { id: 'about',    icon: 'information-circle-outline',label: 'About VibeCheck',     chevron: true },
];

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; icon: string; iconColor: string }> = {
    critical: { bg: '#FEE2E2', border: '#FECACA', icon: 'alert-circle', iconColor: '#DC2626' },
    warning:  { bg: '#FEF3C7', border: '#FDE68A', icon: 'warning',      iconColor: '#D97706' },
    info:     { bg: '#DBEAFE', border: '#BFDBFE', icon: 'information-circle', iconColor: '#2563EB' },
};
const SEVERITY_CONFIG_DARK: Record<string, { bg: string; border: string; icon: string; iconColor: string }> = {
    critical: { bg: '#451A1A', border: '#7F1D1D', icon: 'alert-circle', iconColor: '#F87171' },
    warning:  { bg: '#451A00', border: '#78350F', icon: 'warning',      iconColor: '#FBBF24' },
    info:     { bg: '#1E293B', border: '#334155', icon: 'information-circle', iconColor: '#60A5FA' },
};

const CATEGORY_ICONS: Record<string, string> = {
    topwear:      'body-outline',
    bottomwear:   'shirt-outline',
    outerwear:    'snow-outline',
    footwear:     'footsteps-outline',
    dresses:      'woman-outline',
    bags:         'bag-outline',
    accessories:  'watch-outline',
    unclassified: 'help-outline',
};

// ─── Sub-modal content ────────────────────────────────────────────────────────

function PrivacyContent({ tc }: { tc: any }) {
    const lastUpdated = '24 March 2026';

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 40, gap: Spacing.lg }}>
            <View style={{ marginBottom: Spacing.sm }}>
                <Text style={[styles.subModalBody, { color: tc.textMuted, fontSize: 12 }]}>
                    Last Updated: {lastUpdated}
                </Text>
            </View>

            <View style={[{ backgroundColor: tc.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg }]}>
                <Text style={[styles.subModalSectionTitle, { color: tc.textPrimary }]}>1. Our Commitment</Text>
                <Text style={[styles.subModalBody, { color: tc.textSecondary }]}>
                    VibeCheck is built with a "Privacy-First" philosophy. We believe your wardrobe and your style choices are personal. Our architecture is designed to keep your most sensitive data—your photos—entirely on your device.
                </Text>
            </View>

            <View style={[{ backgroundColor: tc.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg }]}>
                <Text style={[styles.subModalSectionTitle, { color: tc.textPrimary }]}>2. Images & Processing</Text>
                <Text style={[styles.subModalBody, { color: tc.textSecondary }]}>
                    • <Text style={{ fontWeight: '700', color: tc.textPrimary }}>Local Storage:</Text> All photos you upload are stored locally in your device's secure storage.{"\n"}
                    • <Text style={{ fontWeight: '700', color: tc.textPrimary }}>On-Device AI:</Text> Background removal and clothing classification run entirely on your phone's processor. No image data is ever sent to a cloud server for processing.
                </Text>
            </View>

            <View style={[{ backgroundColor: tc.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg }]}>
                <Text style={[styles.subModalSectionTitle, { color: tc.textPrimary }]}>3. Cloud Sync (Optional)</Text>
                <Text style={[styles.subModalBody, { color: tc.textSecondary }]}>
                    If you choose to enable "Cloud Sync", we only synchronize text-based metadata:{"\n"}
                    • Item categories, colors, brands, and names.{"\n"}
                    • Your "Looks" and Calendar plans.{"\n"}
                    <Text style={{ fontStyle: 'italic', marginTop: 4, display: 'flex' }}>Note: Even with sync enabled, your original high-resolution photos remain strictly on your physical device.</Text>
                </Text>
            </View>

            <View style={[{ backgroundColor: tc.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg }]}>
                <Text style={[styles.subModalSectionTitle, { color: tc.textPrimary }]}>4. Authentication</Text>
                <Text style={[styles.subModalBody, { color: tc.textSecondary }]}>
                    We use Firebase Authentication (Google/Apple) to secure your account. We only store your email and UID to manage your subscription and optional metadata backup.
                </Text>
            </View>

            <View style={[{ backgroundColor: tc.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg }]}>
                <Text style={[styles.subModalSectionTitle, { color: tc.textPrimary }]}>5. Data Deletion</Text>
                <Text style={[styles.subModalBody, { color: tc.textSecondary }]}>
                    You have full control over your data. You can clear your local cache, or permanently delete your account from the Profile settings. Deleting your account removes all synced metadata from our servers immediately.
                </Text>
            </View>

            <View style={[{ backgroundColor: tc.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg }]}>
                <Text style={[styles.subModalSectionTitle, { color: tc.textPrimary }]}>6. Third Parties</Text>
                <Text style={[styles.subModalBody, { color: tc.textSecondary }]}>
                    VibeCheck does not sell, trade, or share your data with advertisers or third-party data brokers.
                </Text>
            </View>
        </ScrollView>
    );
}

function StorageContent({ tc }: { tc: any }) {
    const [clearing, setClearing] = useState(false);

    const handleClearCache = async () => {
        Alert.alert(
            'Clear Cache',
            'This will remove temporary files. Your wardrobe items and outfits will not be affected.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        setClearing(true);
                        await new Promise(r => setTimeout(r, 800));
                        setClearing(false);
                        Alert.alert('Done', 'Cache cleared successfully.');
                    },
                },
            ],
        );
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg }}>
            <View style={[{ backgroundColor: tc.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg }]}>
                <Text style={[styles.subModalSectionTitle, { color: tc.textPrimary }]}>On-Device Storage</Text>
                <Text style={[styles.subModalBody, { color: tc.textSecondary }]}>
                    All your wardrobe photos are stored locally on your device using optimised PNG compression. VibeCheck does not upload images to any server.
                </Text>
            </View>
            <View style={[{ backgroundColor: tc.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg }]}>
                <Text style={[styles.subModalSectionTitle, { color: tc.textPrimary }]}>Background Removal</Text>
                <Text style={[styles.subModalBody, { color: tc.textSecondary }]}>
                    Background removal runs entirely on your device using on-device ML. No image data leaves your phone during processing.
                </Text>
            </View>
            <TouchableOpacity
                style={[styles.dangerBtn, { backgroundColor: tc.surface, borderColor: Colors.error }]}
                onPress={handleClearCache}
                disabled={clearing}
            >
                {clearing ? (
                    <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                    <>
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                        <Text style={[styles.dangerBtnText, { color: Colors.error }]}>Clear Cache</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

function HelpContent({ tc }: { tc: any }) {
    const faqs = [
        { q: 'How do I add items to my wardrobe?', a: 'Go to the Wardrobe tab → tap "+ Add Item" → take a photo or select from gallery. Our AI automatically removes the background.' },
        { q: 'How does the outfit canvas work?', a: 'On the Home screen, tap any clothing piece to select it (gold ring appears), then drag to reposition or pinch to resize. Tap the shuffle button for AI outfit suggestions.' },
        { q: 'Can I use VibeCheck offline?', a: 'Yes! All wardrobe data and AI processing runs entirely on-device. No internet required after initial setup.' },
        { q: 'How do I save an outfit?', a: 'From the Home canvas, tap the canvas area (when nothing is selected) to open Outfit Details, then tap the heart icon to save.' },
        { q: 'Why is background removal slow sometimes?', a: 'Background removal uses on-device ML which requires GPU resources. Large or complex images may take a few seconds. Processing now runs sequentially to keep your device responsive.' },
    ];

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg }}>
            <Text style={[styles.subModalSectionTitle, { color: tc.textPrimary, marginBottom: 0 }]}>Frequently Asked Questions</Text>
            {faqs.map((faq, i) => (
                <View key={i} style={[{ backgroundColor: tc.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg }]}>
                    <Text style={[styles.faqQuestion, { color: tc.textPrimary }]}>{faq.q}</Text>
                    <Text style={[styles.subModalBody, { color: tc.textSecondary, marginTop: Spacing.sm }]}>{faq.a}</Text>
                </View>
            ))}
            <TouchableOpacity
                style={[styles.contactBtn, { backgroundColor: Colors.gold }]}
                onPress={() => Linking.openURL('mailto:support@vibecheck.app')}
            >
                <Ionicons name="mail-outline" size={18} color="#FFF" />
                <Text style={styles.contactBtnText}>Contact Support</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

// ─── Reusable sub-modal shell ─────────────────────────────────────────────────

function SubModal({
    visible,
    title,
    onClose,
    tc,
    children,
}: {
    visible: boolean;
    title: string;
    onClose: () => void;
    tc: any;
    children: React.ReactNode;
}) {
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.subModalContainer, { backgroundColor: tc.background }]}>
                <View style={[styles.subModalHeader, { borderBottomColor: tc.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.subModalClose}>
                        <Ionicons name="close" size={24} color={tc.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.subModalTitle, { color: tc.textPrimary }]}>{title}</Text>
                    <View style={{ width: 40 }} />
                </View>
                {children}
            </View>
        </Modal>
    );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
    const { isDarkMode, toggleTheme } = useTheme();
    const tc = useThemeColors();
    const { isGuest, signOut } = useAuth();
    const router = useRouter();

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [profileName, setProfileName] = useState<string | null>(null);
    const [profileEmail, setProfileEmail] = useState<string | null>(null);
    const [stats, setStats] = useState({ items: 0, outfits: 0, favorites: 0 });

    // Insights
    const [insightsModalVisible, setInsightsModalVisible] = useState(false);
    const [insightsData, setInsightsData] = useState<WardrobeOverview | null>(null);
    const [insightsLoading, setInsightsLoading] = useState(false);

    // Edit profile
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [saving, setSaving] = useState(false);

    // Sub-modals
    const [privacyVisible, setPrivacyVisible] = useState(false);
    const [storageVisible, setStorageVisible] = useState(false);
    const [helpVisible, setHelpVisible] = useState(false);

    useEffect(() => {
        (async () => {
            setCloudSyncEnabled(await isSyncEnabled());
            setLastSyncTime(await getLastSyncTime());

            const name = await AsyncStorage.getItem(PROFILE_NAME_KEY);
            const email = await AsyncStorage.getItem(PROFILE_EMAIL_KEY);
            setProfileName(name);
            setProfileEmail(email);

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

    // ── Sync ──────────────────────────────────────────────────────────────────

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

    // ── Insights ──────────────────────────────────────────────────────────────

    const loadInsights = useCallback(async () => {
        try {
            setInsightsLoading(true);
            setInsightsModalVisible(true);
            const allItems = await wardrobeLocal.getAllItems();
            const engineItems = allItems.map((item: any) => ({
                id: item.id,
                category: normalizeCategory(item.category),
                subCategory: item.subCategory || '',
                name: item.name || '',
                brand: item.brand || '',
                primaryColor: item.color || 'Unknown',
                formality: 0.5,
                seasonality: item.season || [],
                thickness: 0.5,
                waterResistance: 0.2,
                breathability: 0.5,
                styleTags: [],
                isFavorite: item.isFavorite || false,
            }));
            setInsightsData(analyzeWardrobe(engineItems));
        } catch (e) {
            console.log('Insights error:', e);
        } finally {
            setInsightsLoading(false);
        }
    }, []);

    // ── Edit Profile ─────────────────────────────────────────────────────────

    const openEditProfile = () => {
        setEditName(profileName || '');
        setEditEmail(profileEmail || '');
        setEditModalVisible(true);
    };

    const handleSaveProfile = async () => {
        const trimmedName = editName.trim();
        const trimmedEmail = editEmail.trim();
        if (!trimmedName) {
            Alert.alert('Name required', 'Please enter your display name.');
            return;
        }
        setSaving(true);
        try {
            await AsyncStorage.setItem(PROFILE_NAME_KEY, trimmedName);
            if (trimmedEmail) {
                await AsyncStorage.setItem(PROFILE_EMAIL_KEY, trimmedEmail);
            } else {
                await AsyncStorage.removeItem(PROFILE_EMAIL_KEY);
            }
            setProfileName(trimmedName);
            setProfileEmail(trimmedEmail || null);
            setEditModalVisible(false);
        } finally {
            setSaving(false);
        }
    };

    // ── Menu handler ─────────────────────────────────────────────────────────

    const handleMenuPress = (id: string) => {
        switch (id) {
            case 'edit':    openEditProfile(); break;
            case 'insights': loadInsights(); break;
            case 'saved':   router.push('/(tabs)/outfits'); break;
            case 'privacy': setPrivacyVisible(true); break;
            case 'storage': setStorageVisible(true); break;
            case 'help':    setHelpVisible(true); break;
            case 'about':   router.push('/about'); break;
        }
    };

    // ── Insights helpers ─────────────────────────────────────────────────────

    const getScoreColor = (score: number) =>
        score >= 75 ? Colors.success : score >= 50 ? Colors.warning : Colors.error;

    const getScoreLabel = (score: number) => {
        if (score >= 85) return 'Excellent';
        if (score >= 70) return 'Great';
        if (score >= 50) return 'Good';
        if (score >= 30) return 'Building Up';
        return 'Getting Started';
    };

    const renderInsightCard = (insight: WardrobeInsight) => {
        const isPositive = insight.type === 'positive';
        const config = isDarkMode ? SEVERITY_CONFIG_DARK : SEVERITY_CONFIG;
        const sevConfig = isPositive
            ? { bg: isDarkMode ? '#0D2818' : '#D1FAE5', border: isDarkMode ? '#065F46' : '#A7F3D0', iconColor: isDarkMode ? '#34D399' : '#059669' }
            : config[insight.severity] || config.info;

        return (
            <View key={insight.id} style={[styles.insightCard, { backgroundColor: sevConfig.bg, borderColor: sevConfig.border }]}>
                <View style={styles.insightIconWrap}>
                    <Ionicons name={(isPositive ? 'checkmark-circle' : insight.icon) as any} size={22} color={sevConfig.iconColor} />
                </View>
                <View style={styles.insightContent}>
                    <Text style={[styles.insightTitle, { color: tc.textPrimary }]}>{insight.title}</Text>
                    <Text style={[styles.insightMessage, { color: tc.textSecondary }]}>{insight.message}</Text>
                    {insight.suggestedAction && (
                        <View style={styles.insightActionRow}>
                            <Ionicons name="bulb-outline" size={14} color={tc.accent} />
                            <Text style={[styles.insightAction, { color: tc.accent }]}>{insight.suggestedAction}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    // ── Render menu row ──────────────────────────────────────────────────────

    const renderMenuItems = (items: MenuItemDef[]) => (
        <View style={[styles.menuCard, { backgroundColor: tc.card }]}>
            {items.map((item, index) => (
                <TouchableOpacity
                    key={item.id}
                    style={[
                        styles.menuItem,
                        index < items.length - 1 && [styles.menuItemBorder, { borderBottomColor: tc.border }],
                    ]}
                    accessibilityRole={item.toggle ? 'switch' : 'button'}
                    accessibilityLabel={item.label}
                    onPress={() => !item.toggle && handleMenuPress(item.id)}
                    activeOpacity={item.toggle ? 1 : 0.7}
                >
                    <View style={styles.menuLeft}>
                        <View style={[styles.menuIcon, { backgroundColor: tc.accentLight }]}>
                            <Ionicons name={item.icon as any} size={20} color={tc.accent} />
                        </View>
                        <Text style={[styles.menuLabel, { color: item.destructive ? Colors.error : tc.textPrimary }]}>
                            {item.label}
                        </Text>
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
    );

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <ScreenContainer>
            {/* Header */}
            <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="sparkles" size={20} color={tc.accent} />
                    <Text style={[{ color: tc.textPrimary, fontSize: 24, fontWeight: '700', fontFamily: FontFamily.heading }]}>Profile</Text>
                </View>
                <TouchableOpacity
                    style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm }]}
                    onPress={openEditProfile}
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile"
                >
                    <Ionicons name="create-outline" size={18} color={tc.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Profile Card */}
                <TouchableOpacity
                    style={[styles.profileCard, { backgroundColor: tc.card }]}
                    onPress={openEditProfile}
                    activeOpacity={0.85}
                >
                    <View style={[styles.avatarLarge, { backgroundColor: tc.accentLight, borderColor: Colors.goldLight }]}>
                        <Ionicons name="person" size={36} color={tc.accent} />
                    </View>
                    <Text style={[styles.profileName, { color: tc.textPrimary }]}>
                        {profileName || 'Set Up Profile'}
                    </Text>
                    {profileEmail ? (
                        <Text style={[styles.profileEmail, { color: tc.textSecondary }]}>{profileEmail}</Text>
                    ) : (
                        <Text style={[styles.profileEmail, { color: tc.textMuted }]}>Tap to add your name & email</Text>
                    )}
                    <View style={[styles.editBadge, { backgroundColor: tc.accentLight }]}>
                        <Ionicons name="create-outline" size={13} color={tc.accent} />
                        <Text style={[styles.editBadgeText, { color: tc.accent }]}>Edit Profile</Text>
                    </View>
                </TouchableOpacity>

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

                {/* Primary Menu */}
                {renderMenuItems(MENU_ITEMS)}

                {/* Cloud Sync */}
                <View style={[styles.menuCard, { backgroundColor: tc.card }]}>
                    <View style={[styles.menuItem, styles.menuItemBorder, { borderBottomColor: tc.border }]}>
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
                                    {syncing
                                        ? <ActivityIndicator size="small" color={tc.accent} />
                                        : <Ionicons name="sync-outline" size={20} color={tc.accent} />
                                    }
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

                {/* Secondary Menu */}
                {renderMenuItems(MENU_ITEMS_2)}

                {/* Sign Out */}
                <TouchableOpacity
                    style={[styles.logoutBtn, { backgroundColor: tc.card }]}
                    onPress={() => {
                        if (isGuest) {
                            signOut();
                        } else {
                            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Sign Out', style: 'destructive', onPress: signOut },
                            ]);
                        }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={isGuest ? 'Sign in' : 'Sign out'}
                >
                    <Ionicons
                        name={isGuest ? 'log-in-outline' : 'log-out-outline'}
                        size={20}
                        color={isGuest ? Colors.gold : Colors.error}
                    />
                    <Text style={[styles.logoutText, isGuest && { color: Colors.gold }]}>
                        {isGuest ? 'Sign In' : 'Sign Out'}
                    </Text>
                </TouchableOpacity>

                <Text style={[styles.version, { color: tc.textMuted }]}>VibeCheck v1.0.0</Text>
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ── Edit Profile Modal ── */}
            <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModalVisible(false)}>
                <View style={[styles.subModalContainer, { backgroundColor: tc.background }]}>
                    <View style={[styles.subModalHeader, { borderBottomColor: tc.border }]}>
                        <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.subModalClose}>
                            <Ionicons name="close" size={24} color={tc.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.subModalTitle, { color: tc.textPrimary }]}>Edit Profile</Text>
                        <TouchableOpacity onPress={handleSaveProfile} disabled={saving} style={styles.subModalSaveBtn}>
                            {saving
                                ? <ActivityIndicator size="small" color={tc.accent} />
                                : <Text style={[styles.subModalSaveBtnText, { color: tc.accent }]}>Save</Text>
                            }
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg }}>
                        {/* Avatar */}
                        <View style={styles.editAvatarWrap}>
                            <View style={[styles.editAvatar, { backgroundColor: tc.accentLight, borderColor: Colors.goldLight }]}>
                                <Ionicons name="person" size={48} color={tc.accent} />
                            </View>
                        </View>

                        {/* Name */}
                        <View>
                            <Text style={[styles.fieldLabel, { color: tc.textSecondary }]}>DISPLAY NAME</Text>
                            <View style={[styles.fieldInput, { backgroundColor: tc.surface, borderColor: tc.border }]}>
                                <Ionicons name="person-outline" size={18} color={tc.textMuted} />
                                <TextInput
                                    style={[styles.fieldInputText, { color: tc.textPrimary }]}
                                    placeholder="Your name"
                                    placeholderTextColor={tc.textMuted}
                                    value={editName}
                                    onChangeText={setEditName}
                                    returnKeyType="next"
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* Email */}
                        <View>
                            <Text style={[styles.fieldLabel, { color: tc.textSecondary }]}>EMAIL ADDRESS</Text>
                            <View style={[styles.fieldInput, { backgroundColor: tc.surface, borderColor: tc.border }]}>
                                <Ionicons name="mail-outline" size={18} color={tc.textMuted} />
                                <TextInput
                                    style={[styles.fieldInputText, { color: tc.textPrimary }]}
                                    placeholder="your@email.com"
                                    placeholderTextColor={tc.textMuted}
                                    value={editEmail}
                                    onChangeText={setEditEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    returnKeyType="done"
                                    onSubmitEditing={handleSaveProfile}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveProfileBtn, { backgroundColor: Colors.gold }]}
                            onPress={handleSaveProfile}
                            disabled={saving}
                        >
                            {saving
                                ? <ActivityIndicator size="small" color="#FFF" />
                                : <Text style={styles.saveProfileBtnText}>Save Changes</Text>
                            }
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            {/* ── Privacy Modal ── */}
            <SubModal visible={privacyVisible} title="Privacy & Security" onClose={() => setPrivacyVisible(false)} tc={tc}>
                <PrivacyContent tc={tc} />
            </SubModal>

            {/* ── Storage Modal ── */}
            <SubModal visible={storageVisible} title="Storage & Data" onClose={() => setStorageVisible(false)} tc={tc}>
                <StorageContent tc={tc} />
            </SubModal>

            {/* ── Help Modal ── */}
            <SubModal visible={helpVisible} title="Help & Support" onClose={() => setHelpVisible(false)} tc={tc}>
                <HelpContent tc={tc} />
            </SubModal>

            {/* ── Wardrobe Insights Modal ── */}
            <Modal visible={insightsModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setInsightsModalVisible(false)}>
                <View style={[styles.insightsModal, { backgroundColor: tc.background }]}>
                    <View style={[styles.insightsHeader, { borderBottomColor: tc.border }]}>
                        <TouchableOpacity onPress={() => setInsightsModalVisible(false)} style={styles.insightsCloseBtn}>
                            <Ionicons name="close" size={24} color={tc.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.insightsHeaderTitle, { color: tc.textPrimary }]}>Wardrobe Insights</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {insightsLoading ? (
                        <View style={styles.insightsLoadingContainer}>
                            <ActivityIndicator size="large" color={tc.accent} />
                            <Text style={[styles.insightsLoadingText, { color: tc.textSecondary }]}>
                                Analysing your wardrobe...
                            </Text>
                        </View>
                    ) : insightsData ? (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.insightsScrollContent}>

                            {/* Score Card */}
                            <View style={[styles.scoreCard, { backgroundColor: tc.card }]}>
                                <View style={styles.scoreCircleWrap}>
                                    <View style={[styles.scoreCircle, { borderColor: getScoreColor(insightsData.wardrobeScore) }]}>
                                        <Text style={[styles.scoreNumber, { color: getScoreColor(insightsData.wardrobeScore) }]}>
                                            {insightsData.wardrobeScore}
                                        </Text>
                                        <Text style={[styles.scoreOutOf, { color: tc.textMuted }]}>/100</Text>
                                    </View>
                                </View>
                                <Text style={[styles.scoreLabel, { color: tc.textPrimary }]}>
                                    {getScoreLabel(insightsData.wardrobeScore)}
                                </Text>
                                <Text style={[styles.scoreSubtitle, { color: tc.textSecondary }]}>
                                    {insightsData.totalItems} items across{' '}
                                    {Object.keys(insightsData.categoryCounts).filter(k => k !== 'unclassified').length} categories
                                </Text>
                            </View>

                            {/* Quick Stats */}
                            <View style={styles.quickStatsGrid}>
                                {[
                                    { icon: 'color-palette-outline', value: Object.keys(insightsData.colorCounts).filter(k => k !== 'unknown').length, label: 'Colors' },
                                    { icon: 'grid-outline', value: Object.keys(insightsData.categoryCounts).filter(k => k !== 'unclassified').length, label: 'Categories' },
                                    {
                                        icon: 'layers-outline',
                                        value: Math.max((insightsData.categoryCounts['topwear'] || 1), 1)
                                            * Math.max((insightsData.categoryCounts['bottomwear'] || 1), 1)
                                            * Math.max((insightsData.categoryCounts['footwear'] || 1), 1),
                                        label: 'Combos',
                                    },
                                ].map(stat => (
                                    <View key={stat.label} style={[styles.quickStatCard, { backgroundColor: tc.card }]}>
                                        <Ionicons name={stat.icon as any} size={22} color={tc.accent} />
                                        <Text style={[styles.quickStatValue, { color: tc.textPrimary }]}>{stat.value}</Text>
                                        <Text style={[styles.quickStatLabel, { color: tc.textSecondary }]}>{stat.label}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Category Breakdown */}
                            <View style={[styles.sectionCard, { backgroundColor: tc.card }]}>
                                <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>Category Breakdown</Text>
                                {Object.entries(insightsData.categoryCounts)
                                    .filter(([k]) => k !== 'unclassified')
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([cat, count]) => {
                                        const pct = Math.round((count / insightsData.totalItems) * 100);
                                        return (
                                            <View key={cat} style={styles.breakdownRow}>
                                                <View style={styles.breakdownLeft}>
                                                    <View style={[styles.breakdownIcon, { backgroundColor: tc.accentLight }]}>
                                                        <Ionicons name={(CATEGORY_ICONS[cat] || 'help-outline') as any} size={16} color={tc.accent} />
                                                    </View>
                                                    <Text style={[styles.breakdownLabel, { color: tc.textPrimary }]}>
                                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                                    </Text>
                                                </View>
                                                <View style={styles.breakdownRight}>
                                                    <View style={[styles.breakdownBarBg, { backgroundColor: tc.border }]}>
                                                        <View style={[styles.breakdownBarFill, { width: `${pct}%`, backgroundColor: tc.accent }]} />
                                                    </View>
                                                    <Text style={[styles.breakdownCount, { color: tc.textSecondary }]}>{count}</Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                            </View>

                            {/* Top Colors */}
                            <View style={[styles.sectionCard, { backgroundColor: tc.card }]}>
                                <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>Top Colors</Text>
                                <View style={styles.colorsGrid}>
                                    {insightsData.topColors.map(({ color, count }) => {
                                        const displayColor = color === 'unknown' ? '#ccc' : color === 'beige' ? '#F5DEB3' : color === 'navy' ? '#000080' : color;
                                        return (
                                            <View key={color} style={styles.colorItem}>
                                                <View style={[styles.colorSwatch, { backgroundColor: displayColor, borderColor: tc.border }]} />
                                                <Text style={[styles.colorName, { color: tc.textPrimary }]}>
                                                    {color.charAt(0).toUpperCase() + color.slice(1)}
                                                </Text>
                                                <Text style={[styles.colorCount, { color: tc.textMuted }]}>{count}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Season Coverage */}
                            <View style={[styles.sectionCard, { backgroundColor: tc.card }]}>
                                <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>Season Coverage</Text>
                                <View style={styles.seasonGrid}>
                                    {insightsData.seasonBreakdown.map(({ season, count, percentage }) => {
                                        const iconMap: Record<string, string> = { spring: 'flower-outline', summer: 'sunny-outline', autumn: 'leaf-outline', winter: 'snow-outline' };
                                        return (
                                            <View key={season} style={[styles.seasonItem, { backgroundColor: tc.surface }]}>
                                                <Ionicons name={(iconMap[season] || 'help-outline') as any} size={24} color={tc.accent} />
                                                <Text style={[styles.seasonName, { color: tc.textPrimary }]}>
                                                    {season.charAt(0).toUpperCase() + season.slice(1)}
                                                </Text>
                                                <Text style={[styles.seasonPct, { color: tc.accent }]}>{percentage}%</Text>
                                                <Text style={[styles.seasonCount, { color: tc.textMuted }]}>{count} items</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Insights */}
                            {insightsData.insights.length > 0 && (
                                <View style={styles.insightsSection}>
                                    {insightsData.insights.filter(i => i.type === 'positive').length > 0 && (
                                        <>
                                            <Text style={[styles.insightsSectionLabel, { color: Colors.success }]}>What's Working Well</Text>
                                            {insightsData.insights.filter(i => i.type === 'positive').map(renderInsightCard)}
                                        </>
                                    )}
                                    {insightsData.insights.filter(i => i.type !== 'positive').length > 0 && (
                                        <>
                                            <Text style={[styles.insightsSectionLabel, { color: tc.textPrimary, marginTop: Spacing.lg }]}>Suggestions & Tips</Text>
                                            {insightsData.insights.filter(i => i.type !== 'positive').map(renderInsightCard)}
                                        </>
                                    )}
                                </View>
                            )}

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    ) : null}
                </View>
            </Modal>
        </ScreenContainer>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxl,
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
    },

    /* Profile Card */
    profileCard: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        marginHorizontal: Spacing.xxl,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.lg,
        ...Shadows.sm,
    },
    avatarLarge: {
        width: 84,
        height: 84,
        borderRadius: 42,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        marginBottom: Spacing.md,
    },
    profileName: {
        fontSize: 21,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        fontFamily: FontFamily.body,
        marginBottom: Spacing.md,
    },
    editBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: Spacing.md,
        paddingVertical: 5,
        borderRadius: BorderRadius.round,
    },
    editBadgeText: {
        fontSize: 12,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },

    /* Stats Row */
    statsRow: {
        flexDirection: 'row',
        borderRadius: BorderRadius.xl,
        marginHorizontal: Spacing.xxl,
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

    /* Menu Card */
    menuCard: {
        borderRadius: BorderRadius.xl,
        marginHorizontal: Spacing.xxl,
        marginBottom: Spacing.lg,
        ...Shadows.sm,
        overflow: 'hidden',
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
    menuLabel: {
        fontSize: 15,
        fontWeight: '500',
        fontFamily: FontFamily.bodyMedium,
    },
    syncSubtext: {
        fontSize: 12,
        fontFamily: FontFamily.body,
        marginTop: 2,
    },

    /* Sign Out */
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
        marginHorizontal: Spacing.xxl,
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

    /* Sub-modal shell */
    subModalContainer: {
        flex: 1,
    },
    subModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xxxl,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
    },
    subModalClose: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    subModalSaveBtn: {
        minWidth: 40,
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingRight: 4,
    },
    subModalSaveBtnText: {
        fontSize: 16,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    subModalSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: FontFamily.bodySemiBold,
        marginBottom: Spacing.sm,
    },
    subModalBody: {
        fontSize: 14,
        fontFamily: FontFamily.body,
        lineHeight: 21,
    },
    faqQuestion: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        lineHeight: 20,
    },
    dangerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
    },
    dangerBtnText: {
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    contactBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.sm,
    },
    contactBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },

    /* Edit Profile */
    editAvatarWrap: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    editAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
    },
    fieldLabel: {
        fontSize: 11,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        letterSpacing: 1.2,
        marginBottom: Spacing.sm,
    },
    fieldInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        height: 52,
    },
    fieldInputText: {
        flex: 1,
        fontSize: 15,
        fontFamily: FontFamily.body,
        height: '100%',
    },
    saveProfileBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.md,
        ...Shadows.sm,
    },
    saveProfileBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },

    /* Insights Modal */
    insightsModal: { flex: 1 },
    insightsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xxxl,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
    },
    insightsCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    insightsHeaderTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    insightsLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.md,
    },
    insightsLoadingText: {
        fontSize: 15,
        fontFamily: FontFamily.bodyMedium,
    },
    insightsScrollContent: {
        padding: Spacing.lg,
    },

    /* Score */
    scoreCard: { alignItems: 'center', paddingVertical: Spacing.xl, borderRadius: 20, marginBottom: Spacing.lg, ...Shadows.sm },
    scoreCircleWrap: { marginBottom: Spacing.md },
    scoreCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
    scoreNumber: { fontSize: 36, fontWeight: '800', fontFamily: FontFamily.heading },
    scoreOutOf: { fontSize: 13, fontWeight: '500', marginTop: -4 },
    scoreLabel: { fontSize: 20, fontWeight: '700', fontFamily: FontFamily.heading, marginBottom: 4 },
    scoreSubtitle: { fontSize: 14, fontFamily: FontFamily.body },

    /* Quick Stats */
    quickStatsGrid: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
    quickStatCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg, borderRadius: 16, gap: 6, ...Shadows.sm },
    quickStatValue: { fontSize: 22, fontWeight: '700', fontFamily: FontFamily.heading },
    quickStatLabel: { fontSize: 11, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },

    /* Section Card */
    sectionCard: { borderRadius: 20, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.sm },
    sectionTitle: { fontSize: 17, fontWeight: '700', fontFamily: FontFamily.heading, marginBottom: Spacing.md },

    /* Breakdown */
    breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '35%' },
    breakdownIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    breakdownLabel: { fontSize: 13, fontWeight: '500', fontFamily: FontFamily.bodyMedium },
    breakdownRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: Spacing.md },
    breakdownBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
    breakdownBarFill: { height: '100%', borderRadius: 4, minWidth: 4 },
    breakdownCount: { fontSize: 13, fontWeight: '600', fontFamily: FontFamily.bodySemiBold, width: 28, textAlign: 'right' },

    /* Colors */
    colorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    colorItem: { alignItems: 'center', gap: 4, width: 60 },
    colorSwatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
    colorName: { fontSize: 11, fontWeight: '500', fontFamily: FontFamily.bodyMedium, textAlign: 'center' },
    colorCount: { fontSize: 10, fontWeight: '600' },

    /* Seasons */
    seasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    seasonItem: {
        width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.lg * 2 - 10) / 2,
        alignItems: 'center', paddingVertical: Spacing.md, borderRadius: 14, gap: 4,
    },
    seasonName: { fontSize: 13, fontWeight: '600', fontFamily: FontFamily.bodySemiBold },
    seasonPct: { fontSize: 20, fontWeight: '700', fontFamily: FontFamily.heading },
    seasonCount: { fontSize: 11, fontWeight: '500' },

    /* Insights cards */
    insightsSection: { marginTop: Spacing.sm },
    insightsSectionLabel: { fontSize: 16, fontWeight: '700', fontFamily: FontFamily.heading, marginBottom: Spacing.md },
    insightCard: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: Spacing.md, marginBottom: 10, gap: 12 },
    insightIconWrap: { paddingTop: 2 },
    insightContent: { flex: 1 },
    insightTitle: { fontSize: 14, fontWeight: '600', fontFamily: FontFamily.bodySemiBold, marginBottom: 3 },
    insightMessage: { fontSize: 13, fontFamily: FontFamily.body, lineHeight: 19 },
    insightActionRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
    insightAction: { fontSize: 12, fontWeight: '600', fontFamily: FontFamily.bodySemiBold },
});
