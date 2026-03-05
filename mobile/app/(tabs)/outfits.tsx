import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { api, StylistSuggestion, WardrobeItem } from '../../services/api';
import { SavedLook, getSavedLooks, saveLook } from '../../storage/savedLooks';
import { normalizeCategory } from '../../constants/categories';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;

const TABS = ['My Looks', 'AI Stylist'];

export default function OutfitsScreen() {
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('AI Stylist');
    const [suggestion, setSuggestion] = useState<StylistSuggestion | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [suggestionLoading, setSuggestionLoading] = useState(false);
    const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [looksLoading, setLooksLoading] = useState(false);
    const [expandedLookId, setExpandedLookId] = useState<string | null>(null);
    const [savingLook, setSavingLook] = useState(false);

    const theme = {
        background: isDarkMode ? '#1A1A1A' : Colors.warmGray,
        card: isDarkMode ? '#242424' : Colors.white,
        text: isDarkMode ? '#FFFFFF' : Colors.charcoal,
        textSecondary: isDarkMode ? '#A0A0A0' : Colors.darkGray,
        iconBtnBg: isDarkMode ? '#333333' : Colors.white,
        tabBg: isDarkMode ? '#333333' : Colors.lightGray,
        border: isDarkMode ? '#333333' : Colors.lightGray,
        gold: Colors.gold,
    };

    const loadData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const data = await api.getStylistSuggestion();
            setSuggestion(data);
        } catch (e) {
            console.error('Stylist fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadLooks = async () => {
        try {
            setLooksLoading(true);
            const [looks, allItems] = await Promise.all([
                getSavedLooks(),
                api.getWardrobeItems({ category: 'all' }),
            ]);
            setSavedLooks(looks);
            setWardrobeItems(
                allItems.map((item) => ({
                    ...item,
                    category: normalizeCategory(item.category),
                })),
            );
        } catch (e) {
            console.error('Failed to load saved looks:', e);
        } finally {
            setLooksLoading(false);
        }
    };

    const regenerateSuggestion = async () => {
        try {
            setSuggestionLoading(true);
            const data = await api.getStylistSuggestion();
            setSuggestion(data);
        } catch (e) {
            console.error(e);
        } finally {
            setSuggestionLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        loadLooks();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData(true);
    };

    const favorites = suggestion?.favorites ?? [];
    const stats = suggestion?.stats;
    const suggestedOutfit = suggestion?.suggestedOutfit ?? [];

    const wardrobeById = useMemo(() => {
        const map: Record<string, WardrobeItem> = {};
        wardrobeItems.forEach((item) => {
            map[item.id] = item;
        });
        return map;
    }, [wardrobeItems]);

    const handleSaveCurrentLook = async () => {
        if (!suggestedOutfit.length || savingLook) return;
        try {
            setSavingLook(true);
            const now = new Date();
            const look: SavedLook = {
                id: `${now.getTime()}`,
                name: 'AI Look',
                itemIds: suggestedOutfit.map((item) => item.id),
                createdAt: now.toISOString(),
                source: 'ai',
            };
            await saveLook(look);
            await loadLooks();
        } catch (e) {
            console.error('Failed to save look:', e);
        } finally {
            setSavingLook(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="sparkles" size={20} color={Colors.gold} />
                    <Text style={[styles.title, { color: theme.text }]}>My Outfits</Text>
                </View>
                {stats && (
                    <View style={styles.statsRow}>
                        <View style={styles.statChip}>
                            <Text style={[styles.statNum, { color: theme.text }]}>{stats.totalItems}</Text>
                            <Text style={[styles.statLbl, { color: theme.textSecondary }]}>items</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.statChip}>
                            <Text style={[styles.statNum, { color: theme.gold }]}>{stats.totalFavorites}</Text>
                            <Text style={[styles.statLbl, { color: theme.textSecondary }]}>faves</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Tabs */}
            <View style={[styles.tabsContainer, { backgroundColor: theme.tabBg }]}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && [styles.tabActive, { backgroundColor: theme.card }]]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: theme.textSecondary },
                            activeTab === tab && [styles.tabTextActive, { color: theme.text }],
                        ]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color={theme.gold} />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                        Your stylist is thinking...
                    </Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    {activeTab === 'AI Stylist' ? (
                        <>
                            {/* AI Stylist Card */}
                            <View style={[styles.stylistBanner, { backgroundColor: theme.card, borderColor: theme.gold }]}>
                                <View style={styles.bannerRow}>
                                    <View style={styles.bannerIcon}>
                                        <Ionicons name="sparkles" size={22} color={Colors.gold} />
                                    </View>
                                    <View style={styles.bannerText}>
                                        <Text style={[styles.bannerTitle, { color: theme.text }]}>Personal AI Stylist</Text>
                                        <Text style={[styles.bannerSub, { color: theme.textSecondary }]}>
                                            Daily outfit crafted from your wardrobe
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.regenBtn, { backgroundColor: Colors.gold }]}
                                        onPress={regenerateSuggestion}
                                        disabled={suggestionLoading}
                                    >
                                        {suggestionLoading ? (
                                            <ActivityIndicator size="small" color={Colors.white} />
                                        ) : (
                                            <Ionicons name="shuffle" size={16} color={Colors.white} />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {suggestedOutfit.length === 0 ? (
                                    <View style={styles.emptySuggestion}>
                                        <Ionicons name="shirt-outline" size={36} color={theme.border} />
                                        <Text style={[styles.emptySuggestionText, { color: theme.textSecondary }]}>
                                            Add items to your wardrobe to get outfit suggestions
                                        </Text>
                                    </View>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.outfitStrip}>
                                        {suggestedOutfit.map((item, i) => (
                                            <View key={i} style={styles.outfitItem}>
                                                <Image
                                                    source={{ uri: api.getImageUrl(item.processedUrl) }}
                                                    style={styles.outfitItemImg}
                                                    resizeMode="contain"
                                                />
                                                <Text style={[styles.outfitItemCat, { color: theme.textSecondary }]} numberOfLines={1}>
                                                    {item.category}
                                                </Text>
                                            </View>
                                        ))}
                                    </ScrollView>
                                )}

                                {suggestedOutfit.length > 0 && (
                                    <View style={styles.bannerActionsRow}>
                                        <TouchableOpacity
                                            style={[styles.saveLookBtn, { backgroundColor: theme.iconBtnBg }]}
                                            onPress={handleSaveCurrentLook}
                                            disabled={savingLook}
                                        >
                                            {savingLook ? (
                                                <ActivityIndicator size="small" color={theme.text} />
                                            ) : (
                                                <>
                                                    <Ionicons name="bookmark" size={16} color={theme.text} />
                                                    <Text style={[styles.saveLookText, { color: theme.text }]}>
                                                        Save this look
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Wardrobe Breakdown */}
                            {stats && Object.keys(stats.categories).length > 0 && (
                                <>
                                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>YOUR WARDROBE</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                                        {Object.entries(stats.categories)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([cat, count]) => (
                                                <View key={cat} style={[styles.catChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                                    <Text style={[styles.catNum, { color: theme.gold }]}>{count}</Text>
                                                    <Text style={[styles.catLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                                                        {cat}
                                                    </Text>
                                                </View>
                                            ))}
                                    </ScrollView>
                                </>
                            )}
                        </>
                    ) : (
                        /* My Looks tab = Saved outfits */
                        <>
                            {looksLoading ? (
                                <View style={styles.loadingCenter}>
                                    <ActivityIndicator size="large" color={theme.gold} />
                                </View>
                            ) : savedLooks.length === 0 ? (
                                <View style={styles.emptyFavs}>
                                    <Ionicons name="bookmark-outline" size={48} color={theme.border} />
                                    <Text style={[styles.emptyFavsTitle, { color: theme.text }]}>No looks yet</Text>
                                    <Text style={[styles.emptyFavsSub, { color: theme.textSecondary }]}>
                                        Use the AI Stylist tab to generate an outfit and save it here as a look.
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={savedLooks}
                                    keyExtractor={(look) => look.id}
                                    contentContainerStyle={styles.looksList}
                                    renderItem={({ item: look, index }) => {
                                        const items = look.itemIds
                                            .map((id) => wardrobeById[id])
                                            .filter(Boolean) as WardrobeItem[];

                                        const byCategory: Record<string, WardrobeItem[]> = {};
                                        items.forEach((wItem) => {
                                            const key = normalizeCategory(wItem.category);
                                            if (!byCategory[key]) byCategory[key] = [];
                                            byCategory[key].push(wItem);
                                        });

                                        const topItems = byCategory['topwear'] || [];
                                        const bottomItems = byCategory['bottomwear'] || [];
                                        const footwearItems = byCategory['footwear'] || [];
                                        const accessoryItems = byCategory['accessories'] || [];

                                        const primaryThumb =
                                            topItems[0] || bottomItems[0] || footwearItems[0] || items[0];

                                        const expanded = expandedLookId === look.id;

                                        return (
                                            <TouchableOpacity
                                                activeOpacity={0.9}
                                                onPress={() =>
                                                    setExpandedLookId(expanded ? null : look.id)
                                                }
                                                style={[styles.lookCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                                            >
                                                <View style={styles.lookHeaderRow}>
                                                    <View>
                                                        <Text style={[styles.lookTitle, { color: theme.text }]}>
                                                            {look.name || `Look ${index + 1}`}
                                                        </Text>
                                                        <Text style={[styles.lookSubtitle, { color: theme.textSecondary }]}>
                                                            {items.length} pieces • Saved from {look.source === 'ai' ? 'AI Stylist' : 'your wardrobe'}
                                                        </Text>
                                                    </View>
                                                    <Ionicons
                                                        name={expanded ? 'chevron-up' : 'chevron-down'}
                                                        size={18}
                                                        color={theme.textSecondary}
                                                    />
                                                </View>

                                                {primaryThumb && (
                                                    <View style={styles.lookThumbRow}>
                                                        <Image
                                                            source={{ uri: api.getImageUrl(primaryThumb.processedUrl) }}
                                                            style={styles.lookThumb}
                                                            resizeMode="contain"
                                                        />
                                                        <View style={styles.lookCategoryChips}>
                                                            {topItems.length > 0 && (
                                                                <View style={styles.lookChip}>
                                                                    <Text style={styles.lookChipLabel}>Topwear</Text>
                                                                    <Text style={styles.lookChipCount}>{topItems.length}</Text>
                                                                </View>
                                                            )}
                                                            {bottomItems.length > 0 && (
                                                                <View style={styles.lookChip}>
                                                                    <Text style={styles.lookChipLabel}>Bottomwear</Text>
                                                                    <Text style={styles.lookChipCount}>{bottomItems.length}</Text>
                                                                </View>
                                                            )}
                                                            {footwearItems.length > 0 && (
                                                                <View style={styles.lookChip}>
                                                                    <Text style={styles.lookChipLabel}>Footwear</Text>
                                                                    <Text style={styles.lookChipCount}>{footwearItems.length}</Text>
                                                                </View>
                                                            )}
                                                            {accessoryItems.length > 0 && (
                                                                <View style={styles.lookChip}>
                                                                    <Text style={styles.lookChipLabel}>Accessories</Text>
                                                                    <Text style={styles.lookChipCount}>{accessoryItems.length}</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>
                                                )}

                                                {expanded && (
                                                    <View style={styles.lookExpandedSection}>
                                                        {topItems.length > 0 && (
                                                            <View style={styles.lookCategorySection}>
                                                                <Text style={[styles.lookCategoryTitle, { color: theme.text }]}>Topwear</Text>
                                                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                                    {topItems.map((wItem) => (
                                                                        <Image
                                                                            key={wItem.id}
                                                                            source={{ uri: api.getImageUrl(wItem.processedUrl) }}
                                                                            style={styles.lookPieceImg}
                                                                            resizeMode="contain"
                                                                        />
                                                                    ))}
                                                                </ScrollView>
                                                            </View>
                                                        )}
                                                        {bottomItems.length > 0 && (
                                                            <View style={styles.lookCategorySection}>
                                                                <Text style={[styles.lookCategoryTitle, { color: theme.text }]}>Bottomwear</Text>
                                                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                                    {bottomItems.map((wItem) => (
                                                                        <Image
                                                                            key={wItem.id}
                                                                            source={{ uri: api.getImageUrl(wItem.processedUrl) }}
                                                                            style={styles.lookPieceImg}
                                                                            resizeMode="contain"
                                                                        />
                                                                    ))}
                                                                </ScrollView>
                                                            </View>
                                                        )}
                                                        {footwearItems.length > 0 && (
                                                            <View style={styles.lookCategorySection}>
                                                                <Text style={[styles.lookCategoryTitle, { color: theme.text }]}>Footwear</Text>
                                                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                                    {footwearItems.map((wItem) => (
                                                                        <Image
                                                                            key={wItem.id}
                                                                            source={{ uri: api.getImageUrl(wItem.processedUrl) }}
                                                                            style={styles.lookPieceImg}
                                                                            resizeMode="contain"
                                                                        />
                                                                    ))}
                                                                </ScrollView>
                                                            </View>
                                                        )}
                                                        {accessoryItems.length > 0 && (
                                                            <View style={styles.lookCategorySection}>
                                                                <Text style={[styles.lookCategoryTitle, { color: theme.text }]}>Accessories</Text>
                                                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                                    {accessoryItems.map((wItem) => (
                                                                        <Image
                                                                            key={wItem.id}
                                                                            source={{ uri: api.getImageUrl(wItem.processedUrl) }}
                                                                            style={styles.lookPieceImg}
                                                                            resizeMode="contain"
                                                                        />
                                                                    ))}
                                                                </ScrollView>
                                                            </View>
                                                        )}
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            )}
                        </>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    title: { ...Typography.heading1 },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    statChip: { alignItems: 'center' },
    statNum: { fontSize: 18, fontWeight: '700' },
    statLbl: { fontSize: 11 },
    statDivider: { width: 1, height: 28 },
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: Spacing.xl,
        borderRadius: BorderRadius.round,
        padding: 4,
        marginBottom: Spacing.xl,
    },
    tab: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.round, alignItems: 'center' },
    tabActive: { ...Shadows.sm },
    tabText: { fontSize: 13, fontWeight: '500' },
    tabTextActive: { fontWeight: '700' },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14 },
    scrollContent: { paddingBottom: 100 },
    // Stylist Banner
    stylistBanner: {
        marginHorizontal: Spacing.xl,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        ...Shadows.md,
    },
    bannerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    bannerIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF3D6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    bannerText: { flex: 1 },
    bannerTitle: { fontSize: 16, fontWeight: '700' },
    bannerSub: { fontSize: 12, marginTop: 2 },
    regenBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptySuggestion: { alignItems: 'center', paddingVertical: 20, gap: 10 },
    emptySuggestionText: { fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
    outfitStrip: { marginTop: 4 },
    outfitItem: { alignItems: 'center', marginRight: 12, width: 85 },
    outfitItemImg: {
        width: 80,
        height: 96,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
    },
    outfitItemCat: { fontSize: 10, fontWeight: '600', marginTop: 4, textTransform: 'capitalize' },
    bannerActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: Spacing.md,
    },
    saveLookBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        gap: 6,
    },
    saveLookText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Category pills
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginHorizontal: Spacing.xl,
        marginBottom: 10,
    },
    catScroll: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
    catChip: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginRight: 10,
        alignItems: 'center',
        minWidth: 70,
    },
    catNum: { fontSize: 22, fontWeight: '700' },
    catLabel: { fontSize: 11, textTransform: 'capitalize', marginTop: 2 },
    // Favorites / My Looks empty state
    emptyFavs: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 60,
        gap: 12,
        paddingHorizontal: 40,
    },
    emptyFavsTitle: { fontSize: 18, fontWeight: '700' },
    emptyFavsSub: { fontSize: 14, textAlign: 'center' },
    looksList: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: 100,
        gap: Spacing.md,
    },
    lookCard: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    lookHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    lookTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    lookSubtitle: {
        fontSize: 11,
        marginTop: 2,
    },
    lookThumbRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.sm,
    },
    lookThumb: {
        width: 96,
        height: 112,
        borderRadius: BorderRadius.md,
        backgroundColor: '#F5F5F5',
    },
    lookCategoryChips: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        alignContent: 'flex-start',
    },
    lookChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: Colors.warmGray,
        gap: 6,
    },
    lookChipLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.charcoal,
    },
    lookChipCount: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.goldDark,
    },
    lookExpandedSection: {
        marginTop: Spacing.md,
        gap: Spacing.md,
    },
    lookCategorySection: {
        gap: Spacing.xs,
    },
    lookCategoryTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    lookPieceImg: {
        width: 80,
        height: 96,
        borderRadius: BorderRadius.md,
        backgroundColor: '#F5F5F5',
        marginRight: Spacing.sm,
    },
});
