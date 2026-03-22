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
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const PROFILE_NAME_KEY = '@drobeo_profile_name';
const PROFILE_EMAIL_KEY = '@drobeo_profile_email';

const MENU_ITEMS = [
    { id: 'edit', icon: 'person-outline', label: 'Edit Profile', chevron: true },
    { id: 'insights', icon: 'analytics-outline', label: 'Wardrobe Insights', chevron: true },
    { id: 'notif', icon: 'notifications-outline', label: 'Notifications', toggle: true },
    { id: 'theme', icon: 'contrast-outline', label: 'Dark Mode', toggle: true, themeToggle: true },
    { id: 'privacy', icon: 'shield-outline', label: 'Privacy & Security', chevron: true },
    { id: 'storage', icon: 'cloud-outline', label: 'Storage & Data', chevron: true },
    { id: 'help', icon: 'help-circle-outline', label: 'Help & Support', chevron: true },
    { id: 'about', icon: 'information-circle-outline', label: 'About Drobeo', chevron: true },
];

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; icon: string; iconColor: string }> = {
    critical: { bg: '#FEE2E2', border: '#FECACA', icon: 'alert-circle', iconColor: '#DC2626' },
    warning: { bg: '#FEF3C7', border: '#FDE68A', icon: 'warning', iconColor: '#D97706' },
    info: { bg: '#DBEAFE', border: '#BFDBFE', icon: 'information-circle', iconColor: '#2563EB' },
};
const SEVERITY_CONFIG_DARK: Record<string, { bg: string; border: string; icon: string; iconColor: string }> = {
    critical: { bg: '#451A1A', border: '#7F1D1D', icon: 'alert-circle', iconColor: '#F87171' },
    warning: { bg: '#451A00', border: '#78350F', icon: 'warning', iconColor: '#FBBF24' },
    info: { bg: '#1E293B', border: '#334155', icon: 'information-circle', iconColor: '#60A5FA' },
};

const CATEGORY_ICONS: Record<string, string> = {
    topwear: 'body-outline',
    bottomwear: 'shirt-outline',
    outerwear: 'snow-outline',
    footwear: 'footsteps-outline',
    dresses: 'woman-outline',
    bags: 'bag-outline',
    accessories: 'watch-outline',
    unclassified: 'help-outline',
};

export default function ProfileScreen() {
    const { isDarkMode, toggleTheme } = useTheme();
    const tc = useThemeColors();
    const { isGuest, signOut } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [profileName, setProfileName] = useState<string | null>(null);
    const [profileEmail, setProfileEmail] = useState<string | null>(null);
    const [stats, setStats] = useState({ items: 0, outfits: 0, favorites: 0 });

    // Insights state
    const [insightsModalVisible, setInsightsModalVisible] = useState(false);
    const [insightsData, setInsightsData] = useState<WardrobeOverview | null>(null);
    const [insightsLoading, setInsightsLoading] = useState(false);

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

    const loadInsights = useCallback(async () => {
        try {
            setInsightsLoading(true);
            setInsightsModalVisible(true);

            const allItems = await wardrobeLocal.getAllItems();
            // Convert to EngineWardrobeItem format
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

            const overview = analyzeWardrobe(engineItems);
            setInsightsData(overview);
        } catch (e) {
            console.log('Insights error:', e);
        } finally {
            setInsightsLoading(false);
        }
    }, []);

    const handleMenuPress = (id: string) => {
        if (id === 'insights') {
            loadInsights();
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 75) return Colors.success;
        if (score >= 50) return Colors.warning;
        return Colors.error;
    };

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
            <View
                key={insight.id}
                style={[
                    styles.insightCard,
                    { backgroundColor: sevConfig.bg, borderColor: sevConfig.border },
                ]}
            >
                <View style={styles.insightIconWrap}>
                    <Ionicons
                        name={(isPositive ? 'checkmark-circle' : insight.icon) as any}
                        size={22}
                        color={isPositive ? sevConfig.iconColor : sevConfig.iconColor}
                    />
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
                            onPress={() => !item.toggle && handleMenuPress(item.id)}
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

                {/* Logout / Sign In Button */}
                <TouchableOpacity
                    style={[styles.logoutBtn, { backgroundColor: tc.card }]}
                    onPress={() => {
                        if (isGuest) {
                            signOut();
                        } else {
                            Alert.alert(
                                'Sign Out',
                                'Are you sure you want to sign out?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Sign Out', style: 'destructive', onPress: signOut },
                                ],
                            );
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

                <Text style={[styles.version, { color: tc.textMuted }]}>Drobeo v1.0.0</Text>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Wardrobe Insights Modal ── */}
            <Modal
                visible={insightsModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setInsightsModalVisible(false)}
            >
                <View style={[styles.insightsModal, { backgroundColor: tc.background }]}>
                    {/* Modal Header */}
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
                                Analyzing your wardrobe...
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
                                    {insightsData.totalItems} items across {Object.keys(insightsData.categoryCounts).filter(k => k !== 'unclassified').length} categories
                                </Text>
                            </View>

                            {/* Quick Stats Grid */}
                            <View style={styles.quickStatsGrid}>
                                <View style={[styles.quickStatCard, { backgroundColor: tc.card }]}>
                                    <Ionicons name="color-palette-outline" size={22} color={tc.accent} />
                                    <Text style={[styles.quickStatValue, { color: tc.textPrimary }]}>
                                        {Object.keys(insightsData.colorCounts).filter(k => k !== 'unknown').length}
                                    </Text>
                                    <Text style={[styles.quickStatLabel, { color: tc.textSecondary }]}>Colors</Text>
                                </View>
                                <View style={[styles.quickStatCard, { backgroundColor: tc.card }]}>
                                    <Ionicons name="grid-outline" size={22} color={tc.accent} />
                                    <Text style={[styles.quickStatValue, { color: tc.textPrimary }]}>
                                        {Object.keys(insightsData.categoryCounts).filter(k => k !== 'unclassified').length}
                                    </Text>
                                    <Text style={[styles.quickStatLabel, { color: tc.textSecondary }]}>Categories</Text>
                                </View>
                                <View style={[styles.quickStatCard, { backgroundColor: tc.card }]}>
                                    <Ionicons name="layers-outline" size={22} color={tc.accent} />
                                    <Text style={[styles.quickStatValue, { color: tc.textPrimary }]}>
                                        {Math.max((insightsData.categoryCounts['topwear'] || 1), 1) *
                                            Math.max((insightsData.categoryCounts['bottomwear'] || 1), 1) *
                                            Math.max((insightsData.categoryCounts['footwear'] || 1), 1)}
                                    </Text>
                                    <Text style={[styles.quickStatLabel, { color: tc.textSecondary }]}>Combos</Text>
                                </View>
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

                            {/* Season Breakdown */}
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

                            {/* Insights Section */}
                            {insightsData.insights.length > 0 && (
                                <View style={styles.insightsSection}>
                                    {/* Positive insights */}
                                    {insightsData.insights.filter(i => i.type === 'positive').length > 0 && (
                                        <>
                                            <Text style={[styles.insightsSectionLabel, { color: Colors.success }]}>
                                                What's Working Well
                                            </Text>
                                            {insightsData.insights.filter(i => i.type === 'positive').map(renderInsightCard)}
                                        </>
                                    )}

                                    {/* Suggestions */}
                                    {insightsData.insights.filter(i => i.type !== 'positive').length > 0 && (
                                        <>
                                            <Text style={[styles.insightsSectionLabel, { color: tc.textPrimary, marginTop: Spacing.lg }]}>
                                                Suggestions & Tips
                                            </Text>
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

    /* ── Insights Modal ── */
    insightsModal: {
        flex: 1,
    },
    insightsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
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

    /* Score Card */
    scoreCard: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        borderRadius: 20,
        marginBottom: Spacing.lg,
        ...Shadows.sm,
    },
    scoreCircleWrap: {
        marginBottom: Spacing.md,
    },
    scoreCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scoreNumber: {
        fontSize: 36,
        fontWeight: '800',
        fontFamily: FontFamily.heading,
    },
    scoreOutOf: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: -4,
    },
    scoreLabel: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
        marginBottom: 4,
    },
    scoreSubtitle: {
        fontSize: 14,
        fontFamily: FontFamily.body,
    },

    /* Quick Stats */
    quickStatsGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: Spacing.lg,
    },
    quickStatCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        borderRadius: 16,
        gap: 6,
        ...Shadows.sm,
    },
    quickStatValue: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    quickStatLabel: {
        fontSize: 11,
        fontFamily: FontFamily.bodyMedium,
        fontWeight: '500',
    },

    /* Section Card */
    sectionCard: {
        borderRadius: 20,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadows.sm,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
        marginBottom: Spacing.md,
    },

    /* Category Breakdown */
    breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    breakdownLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        width: '35%',
    },
    breakdownIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    breakdownLabel: {
        fontSize: 13,
        fontWeight: '500',
        fontFamily: FontFamily.bodyMedium,
    },
    breakdownRight: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginLeft: Spacing.md,
    },
    breakdownBarBg: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    breakdownBarFill: {
        height: '100%',
        borderRadius: 4,
        minWidth: 4,
    },
    breakdownCount: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        width: 28,
        textAlign: 'right',
    },

    /* Colors */
    colorsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    colorItem: {
        alignItems: 'center',
        gap: 4,
        width: 60,
    },
    colorSwatch: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
    },
    colorName: {
        fontSize: 11,
        fontWeight: '500',
        fontFamily: FontFamily.bodyMedium,
        textAlign: 'center',
    },
    colorCount: {
        fontSize: 10,
        fontWeight: '600',
    },

    /* Seasons */
    seasonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    seasonItem: {
        width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.lg * 2 - 10) / 2,
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderRadius: 14,
        gap: 4,
    },
    seasonName: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },
    seasonPct: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    seasonCount: {
        fontSize: 11,
        fontWeight: '500',
    },

    /* Insights */
    insightsSection: {
        marginTop: Spacing.sm,
    },
    insightsSectionLabel: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
        marginBottom: Spacing.md,
    },
    insightCard: {
        flexDirection: 'row',
        borderRadius: 14,
        borderWidth: 1,
        padding: Spacing.md,
        marginBottom: 10,
        gap: 12,
    },
    insightIconWrap: {
        paddingTop: 2,
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        marginBottom: 3,
    },
    insightMessage: {
        fontSize: 13,
        fontFamily: FontFamily.body,
        lineHeight: 19,
    },
    insightActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 8,
    },
    insightAction: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },
});
