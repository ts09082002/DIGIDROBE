import React, { useState, useEffect, useCallback } from 'react';
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
    Platform,
    FlatList,
    ActivityIndicator,
    Alert,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { api, WardrobeItem } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.38;

const CATEGORIES = ['All Items', 'Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories'];

const CATEGORY_MAP: Record<string, string> = {
    'All Items': '',
    'Tops': 'top',
    'Bottoms': 'bottom',
    'Footwear': 'footwear',
    'Outerwear': 'outerwear',
    'Accessories': 'accessories',
};

// Sub-labels for visual flair
function getSubLabel(item: WardrobeItem): string {
    const labels: Record<string, string> = {
        top: 'Urban Wear',
        bottom: 'Tech Series',
        footwear: 'Footwear Co.',
        outerwear: 'Street Style',
        accessories: 'Lifestyle',
    };
    return labels[item.category?.toLowerCase()] || 'Collection';
}

export default function HomeScreen() {
    const [activeCategory, setActiveCategory] = useState('All Items');
    const [arMode, setArMode] = useState(false);
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
    const { isDarkMode, toggleTheme } = useTheme();
    const router = useRouter();

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const category = CATEGORY_MAP[activeCategory] || undefined;
            const data = await api.getWardrobeItems(category ? { category } : undefined);
            setItems(data || []);
        } catch (e) {
            console.log('Failed to fetch wardrobe items', e);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [activeCategory]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleTryOn = (item: WardrobeItem) => {
        setSelectedItem(item);
        Alert.alert(
            '✨ Coming Soon',
            `Virtual try-on for "${item.name}" will be available in the next update!`,
            [{ text: 'OK', style: 'default' }],
        );
    };

    const handleArToggle = (val: boolean) => {
        setArMode(val);
        if (val) {
            Alert.alert(
                '🔮 AR Mode — Coming Soon',
                'Augmented Reality try-on is under development. Stay tuned!',
                [{ text: 'Cool!', style: 'default', onPress: () => setArMode(false) }],
            );
        }
    };

    // Colors
    const bg = '#1A1410';
    const cardBg = '#2A2018';
    const surfaceBg = '#332A1E';
    const gold = '#D4A843';
    const goldLight = '#F2D06B';
    const textPrimary = '#FFFFFF';
    const textSecondary = '#A09080';
    const textMuted = '#6A5E52';

    const renderClothingCard = ({ item }: { item: WardrobeItem }) => {
        const imageUrl = item.processedUrl || item.originalUrl;
        const resolvedUrl = imageUrl ? api.getImageUrl(imageUrl) : null;

        return (
            <View style={styles.clothingCard}>
                <View style={[styles.clothingImageContainer, { backgroundColor: surfaceBg }]}>
                    {resolvedUrl ? (
                        <Image
                            source={{ uri: resolvedUrl }}
                            style={styles.clothingImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <Ionicons name="shirt-outline" size={40} color={textMuted} />
                    )}
                </View>
                <View style={styles.clothingInfo}>
                    <Text style={[styles.clothingSubLabel, { color: textMuted }]} numberOfLines={1}>
                        {getSubLabel(item)}
                    </Text>
                    <Text style={[styles.clothingName, { color: textPrimary }]} numberOfLines={1}>
                        {item.name || 'Unnamed'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.tryOnButton, { backgroundColor: gold }]}
                    onPress={() => handleTryOn(item)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.tryOnText}>TRY ON</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
            <StatusBar barStyle="light-content" backgroundColor={bg} />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoIconBg}>
                        <Ionicons name="diamond" size={14} color="#000" />
                    </View>
                    <Text style={[styles.logoText, { color: textPrimary }]}>Digidrobe</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
                        <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={20} color={textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.arToggle}>
                        <Text style={[styles.arLabel, { color: goldLight }]}>AR MODE</Text>
                        <Switch
                            value={arMode}
                            onValueChange={handleArToggle}
                            trackColor={{ false: surfaceBg, true: gold }}
                            thumbColor={arMode ? '#FFF' : textMuted}
                            ios_backgroundColor={surfaceBg}
                            style={styles.arSwitch}
                        />
                    </View>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ─── Model Viewer ─── */}
                <View style={[styles.modelContainer, { backgroundColor: cardBg }]}>
                    <Image
                        source={require('../../assets/model-placeholder.png')}
                        style={styles.modelImage}
                        resizeMode="contain"
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(26,20,16,0.9)']}
                        style={styles.modelGradient}
                    />
                    {/* Dots pagination indicator */}
                    <View style={styles.dotsContainer}>
                        {[0, 1, 2].map((i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    { backgroundColor: i === 0 ? gold : textMuted },
                                ]}
                            />
                        ))}
                    </View>
                </View>

                {/* ─── Category Filter ─── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroll}
                    contentContainerStyle={styles.categoryContainer}
                >
                    {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.categoryPill,
                                    {
                                        backgroundColor: isActive ? gold : surfaceBg,
                                        borderColor: isActive ? gold : textMuted,
                                    },
                                ]}
                                onPress={() => setActiveCategory(cat)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.categoryText,
                                        { color: isActive ? '#000' : textSecondary },
                                        isActive && styles.categoryTextActive,
                                    ]}
                                >
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* ─── Clothing Items ─── */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={gold} />
                        <Text style={[styles.loadingText, { color: textSecondary }]}>
                            Loading your wardrobe...
                        </Text>
                    </View>
                ) : items.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="shirt-outline" size={48} color={textMuted} />
                        <Text style={[styles.emptyTitle, { color: textSecondary }]}>
                            No items found
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: textMuted }]}>
                            Upload clothes in the Wardrobe tab to see them here
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        horizontal
                        keyExtractor={(item) => item.id}
                        renderItem={renderClothingCard}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.clothingListContent}
                        scrollEnabled={true}
                        nestedScrollEnabled={true}
                    />
                )}

                {/* ─── Quick Stats ─── */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: surfaceBg }]}>
                        <Ionicons name="shirt" size={22} color={gold} />
                        <Text style={[styles.statNumber, { color: textPrimary }]}>{items.length}</Text>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>Items</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: surfaceBg }]}>
                        <Ionicons name="heart" size={22} color="#E8445A" />
                        <Text style={[styles.statNumber, { color: textPrimary }]}>
                            {items.filter((i) => i.isFavorite).length}
                        </Text>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>Favorites</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: surfaceBg }]}>
                        <Ionicons name="layers" size={22} color="#5B8DEF" />
                        <Text style={[styles.statNumber, { color: textPrimary }]}>
                            {new Set(items.map((i) => i.category)).size}
                        </Text>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>Categories</Text>
                    </View>
                </View>

                {/* Bottom spacer */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    /* ── Header ── */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 10,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoIconBg: {
        backgroundColor: '#D4A843',
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        padding: 4,
    },
    arToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#332A1E',
        borderRadius: 20,
        paddingLeft: 12,
        paddingRight: 4,
        paddingVertical: 4,
        gap: 6,
    },
    arLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    arSwitch: {
        transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    },

    scrollContent: {
        paddingBottom: 20,
    },

    /* ── Model Viewer ── */
    modelContainer: {
        marginHorizontal: 16,
        borderRadius: 20,
        overflow: 'hidden',
        height: height * 0.45,
        position: 'relative',
        marginBottom: 16,
    },
    modelImage: {
        width: '100%',
        height: '100%',
    },
    modelGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
    },
    dotsContainer: {
        position: 'absolute',
        bottom: 14,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    /* ── Category Filters ── */
    categoryScroll: {
        marginBottom: 16,
    },
    categoryContainer: {
        paddingHorizontal: 16,
        gap: 10,
    },
    categoryPill: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 25,
        borderWidth: 1,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '600',
    },
    categoryTextActive: {
        fontWeight: '700',
    },

    /* ── Clothing Cards ── */
    clothingListContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    clothingCard: {
        width: CARD_WIDTH,
    },
    clothingImageContainer: {
        width: '100%',
        height: CARD_WIDTH * 0.95,
        borderRadius: 14,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    clothingImage: {
        width: '100%',
        height: '100%',
    },
    clothingInfo: {
        marginBottom: 8,
        paddingHorizontal: 2,
    },
    clothingSubLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    clothingName: {
        fontSize: 14,
        fontWeight: '700',
    },
    tryOnButton: {
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tryOnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 1,
    },

    /* ── Loading / Empty ── */
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 40,
    },

    /* ── Stats Row ── */
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
        marginTop: 20,
    },
    statCard: {
        flex: 1,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        gap: 4,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
});
