import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    StatusBar,
    Platform,
    FlatList,
    ActivityIndicator,
    Alert,
    Switch,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { api, WardrobeItem } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.38;
const BODY_PHOTO_KEY = '@digidrobe_body_photo_url';

const MODEL_SLIDES = [
    {
        id: 'look-1',
        title: 'Soft Neutrals',
        subtitle: 'Layered beige coat with crisp white base.',
        image: require('../../assets/model-placeholder.png'),
    },
    {
        id: 'look-2',
        title: 'City Casual',
        subtitle: 'Relaxed denim with structured outerwear.',
        image: require('../../assets/model-placeholder.png'),
    },
    {
        id: 'look-3',
        title: 'Evening Edit',
        subtitle: 'Monochrome set with subtle gold accents.',
        image: require('../../assets/model-placeholder.png'),
    },
];

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

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

export default function HomeScreen() {
    const { user, isLoading: authLoading } = useAuth();
    const [activeCategory, setActiveCategory] = useState('All Items');
    const [arMode, setArMode] = useState(false);
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
    const [bodyPhotoUri, setBodyPhotoUri] = useState<string | null>(null);
    const [bodyPhotoUploading, setBodyPhotoUploading] = useState(false);
    const [showPhotoActionSheet, setShowPhotoActionSheet] = useState(false);
    const [showMenuDropdown, setShowMenuDropdown] = useState(false);
    const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay());
    const [currentSlide, setCurrentSlide] = useState(0);
    const [notificationCount, setNotificationCount] = useState(0);
    const carouselRef = useRef<FlatList>(null);
    const { isDarkMode, toggleTheme } = useTheme();
    const router = useRouter();

    // Refresh time-of-day label periodically
    useEffect(() => {
        const id = setInterval(() => setTimeOfDay(getTimeOfDay()), 5 * 60 * 1000);
        return () => clearInterval(id);
    }, []);

    const fetchItems = useCallback(async () => {
        if (authLoading || !user) return;
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

    const fetchNotifications = useCallback(async () => {
        if (authLoading || !user) return;
        try {
            const data = await api.getNotifications();
            const unread = data.filter(n => !n.read).length;
            setNotificationCount(unread);
        } catch (e) {
            console.log('Failed to fetch notifications', e);
        }
    }, [authLoading, user]);

    useEffect(() => {
        fetchNotifications();
        // Poll for notifications every 30 seconds
        const id = setInterval(fetchNotifications, 30000);
        return () => clearInterval(id);
    }, [fetchNotifications]);

    useEffect(() => {
        const migrateItems = async () => {
            if (user && !authLoading) {
                try {
                    const result = await api.claimGuestItems();
                    if (result.count > 0) {
                        console.log(`[Home] Migrated ${result.count} guest items`);
                        await fetchItems();
                    }
                } catch (e) {
                    console.warn('[Home] Migration failed:', e);
                }
            }
        };
        migrateItems();
    }, [user, authLoading, fetchItems]);

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
    const bg = isDarkMode ? '#1A1410' : '#F8F9FA';
    const cardBg = isDarkMode ? '#2A2018' : '#FFFFFF';
    const surfaceBg = isDarkMode ? '#332A1E' : '#F0F0F0';
    const gold = '#D4A843';
    const goldLight = '#F2D06B';
    const textPrimary = isDarkMode ? '#FFFFFF' : '#1A1A1A';
    const textSecondary = isDarkMode ? '#A09080' : '#666666';
    const textMuted = isDarkMode ? '#6A5E52' : '#999999';

    const dayConfig: Record<TimeOfDay, { title: string; subtitle: string; badge: string }> = {
        morning: {
            title: 'Morning Radiance',
            subtitle: 'Soft layers and light tones pair well with the start of your day.',
            badge: 'Morning',
        },
        afternoon: {
            title: 'Daytime Ease',
            subtitle: 'Breathable fabrics and relaxed fits keep you comfortable.',
            badge: 'Afternoon',
        },
        evening: {
            title: 'Evening Glow',
            subtitle: 'Richer tones and light outerwear work perfectly now.',
            badge: 'Evening',
        },
        night: {
            title: 'Night Out',
            subtitle: 'Structured pieces and deeper colors elevate your look.',
            badge: 'Night',
        },
    };

    const currentDayConfig = dayConfig[timeOfDay];

    // simple outfit suggestion: first top, bottom, footwear
    const topItem = items.find((i) => i.category.toLowerCase().includes('top'));
    const bottomItem = items.find((i) => i.category.toLowerCase().includes('bottom'));
    const shoeItem = items.find((i) => i.category.toLowerCase().includes('foot'));
    const suggestedPieces = [topItem, bottomItem, shoeItem].filter(Boolean) as WardrobeItem[];

    // auto-advance model carousel
    useEffect(() => {
        if (!carouselRef.current) return;
        const id = setInterval(() => {
            setCurrentSlide((prev) => {
                const next = (prev + 1) % MODEL_SLIDES.length;
                carouselRef.current?.scrollToIndex({ index: next, animated: true });
                return next;
            });
        }, 4500);
        return () => clearInterval(id);
    }, []);

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
                    <TouchableOpacity
                        onPress={() => router.push('/notifications')}
                        style={[styles.threeDotsBtn, { backgroundColor: surfaceBg }]}
                    >
                        <Ionicons name="notifications-outline" size={20} color={textSecondary} />
                        {notificationCount > 0 && (
                            <View style={[styles.badge, { backgroundColor: gold }]}>
                                <Text style={styles.badgeText}>{notificationCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.menuContainer}>
                        <TouchableOpacity
                            onPress={() => setShowMenuDropdown(true)}
                            style={[styles.threeDotsBtn, { backgroundColor: surfaceBg }]}
                        >
                            <Ionicons name="ellipsis-horizontal" size={20} color={textSecondary} />
                        </TouchableOpacity>
                        <Modal
                            visible={showMenuDropdown}
                            transparent
                            animationType="fade"
                            onRequestClose={() => setShowMenuDropdown(false)}
                        >
                            <View style={styles.menuOverlay}>
                                <TouchableOpacity
                                    style={StyleSheet.absoluteFillObject}
                                    activeOpacity={1}
                                    onPress={() => setShowMenuDropdown(false)}
                                />
                                <View style={[styles.menuDropdown, { backgroundColor: cardBg, borderColor: surfaceBg }]}>
                                    <TouchableOpacity
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setShowMenuDropdown(false);
                                            router.push('/profile');
                                        }}
                                    >
                                        <Ionicons name="person-circle-outline" size={20} color={textSecondary} />
                                        <Text style={[styles.menuItemText, { color: textPrimary }]}>Profile</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setShowMenuDropdown(false);
                                            router.push('/notifications');
                                        }}
                                    >
                                        <Ionicons name="notifications-outline" size={20} color={textSecondary} />
                                        <Text style={[styles.menuItemText, { color: textPrimary }]}>Notifications</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.menuItem}
                                        onPress={() => {
                                            toggleTheme();
                                            setShowMenuDropdown(false);
                                        }}
                                    >
                                        <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={20} color={textSecondary} />
                                        <Text style={[styles.menuItemText, { color: textPrimary }]}>
                                            {isDarkMode ? 'Light mode' : 'Dark mode'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>
                    </View>
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
                {/* ─── Today’s Outfit & Weather ─── */}
                <View style={styles.dayCard}>
                    <LinearGradient
                        colors={
                            timeOfDay === 'morning'
                                ? ['#FFE7C3', '#FFC896']
                                : timeOfDay === 'afternoon'
                                ? ['#FFE9C8', '#FFD08A']
                                : timeOfDay === 'evening'
                                ? ['#FDD0C7', '#F8A6B1']
                                : ['#1E2140', '#101321']
                        }
                        style={styles.dayCardGradient}
                    >
                        <View style={styles.dayCardHeader}>
                            <View>
                                <Text
                                    style={[
                                        styles.dayCardGreeting,
                                        { color: timeOfDay === 'night' ? '#D0D4FF' : '#8B6A42' },
                                    ]}
                                >
                                    {timeOfDay === 'morning'
                                        ? 'Good morning'
                                        : timeOfDay === 'afternoon'
                                        ? 'Good afternoon'
                                        : timeOfDay === 'evening'
                                        ? 'Good evening'
                                        : 'Tonight'}
                                </Text>
                                <Text
                                    style={[
                                        styles.dayCardTitle,
                                        { color: timeOfDay === 'night' ? '#FFFFFF' : '#3B2618' },
                                    ]}
                                >
                                    {currentDayConfig.title}
                                </Text>
                            </View>
                            <View style={styles.dayCardIconBadge}>
                                <Ionicons
                                    name={
                                        timeOfDay === 'morning'
                                            ? 'sunny-outline'
                                            : timeOfDay === 'afternoon'
                                            ? 'partly-sunny-outline'
                                            : timeOfDay === 'evening'
                                            ? 'cloudy-night-outline'
                                            : 'moon-outline'
                                    }
                                    size={20}
                                    color={timeOfDay === 'night' ? '#FCE68E' : '#FFDF8A'}
                                />
                            </View>
                        </View>
                        <Text
                            style={[
                                styles.dayCardSubtitle,
                                { color: timeOfDay === 'night' ? '#C3C7FF' : '#6A4C32' },
                            ]}
                        >
                            {currentDayConfig.subtitle}
                        </Text>
                        {suggestedPieces.length > 0 && (
                            <View style={styles.dayCardOutfitRow}>
                                {suggestedPieces.map((piece) => (
                                    <View key={piece.id} style={styles.dayCardPiece}>
                                        <Image
                                            source={{
                                                uri: api.getImageUrl(
                                                    piece.processedUrl || piece.originalUrl,
                                                ),
                                            }}
                                            style={styles.dayCardPieceImg}
                                            resizeMode="contain"
                                        />
                                        <Text
                                            style={styles.dayCardPieceLabel}
                                            numberOfLines={1}
                                        >
                                            {piece.category}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </LinearGradient>
                </View>

                {/* ─── Model Outfit Carousel ─── */}
                <View style={[styles.modelContainer, { backgroundColor: cardBg }]}>
                    <FlatList
                        ref={carouselRef}
                        data={MODEL_SLIDES}
                        horizontal
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        pagingEnabled
                        renderItem={({ item }) => (
                            <View style={styles.modelSlide}>
                                <Image
                                    source={item.image}
                                    style={styles.modelImage}
                                    resizeMode="cover"
                                />
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                                    style={styles.modelGradient}
                                />
                                <View style={styles.modelCaption}>
                                    <Text style={styles.modelTitle}>{item.title}</Text>
                                    <Text style={styles.modelSubtitle}>{item.subtitle}</Text>
                                </View>
                            </View>
                        )}
                    />
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

            {/* (photo upload sheet removed in favour of model carousel) */}
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
    menuContainer: {
        position: 'relative',
    },
    threeDotsBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#1A1410',
    },
    badgeText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '800',
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingTop: Platform.OS === 'android' ? 90 : 100,
        paddingRight: 16,
        alignItems: 'flex-end',
        alignContent: 'flex-end',
    },
    menuDropdown: {
        minWidth: 180,
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 100,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    menuItemText: {
        fontSize: 15,
        fontWeight: '600',
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

    /* ── Day Card ── */
    dayCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
    },
    dayCardGradient: {
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    dayCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    dayCardGreeting: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    dayCardTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 4,
    },
    dayCardSubtitle: {
        fontSize: 13,
        marginTop: 4,
    },
    dayCardIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayCardOutfitRow: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 10,
    },
    dayCardPiece: {
        width: 56,
        alignItems: 'center',
    },
    dayCardPieceImg: {
        width: 56,
        height: 64,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    dayCardPieceLabel: {
        marginTop: 4,
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(0,0,0,0.75)',
        textTransform: 'capitalize',
    },

    /* ── Model Viewer / Photo Upload ── */
    modelContainer: {
        marginHorizontal: 16,
        borderRadius: 20,
        overflow: 'hidden',
        height: height * 0.45,
        position: 'relative',
        marginBottom: 16,
    },
    modelSlide: {
        width: width - 32,
        height: '100%',
        borderRadius: 20,
        overflow: 'hidden',
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
        height: 90,
    },
    modelCaption: {
        position: 'absolute',
        bottom: 18,
        left: 18,
        right: 18,
    },
    modelTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modelSubtitle: {
        fontSize: 13,
        color: '#F3F4FF',
        marginTop: 2,
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

    /* ── Action Sheet Modal ── */
    actionSheetOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
        zIndex: 999,
    },
    actionSheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 12,
        alignItems: 'center',
    },
    actionSheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#666',
        marginBottom: 20,
    },
    actionSheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 6,
    },
    actionSheetSubtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    actionSheetRow: {
        flexDirection: 'row',
        gap: 16,
        width: '100%',
        marginBottom: 20,
    },
    actionSheetBtn: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    actionSheetIconBox: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionSheetBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    actionSheetCancel: {
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center',
    },
    actionSheetCancelText: {
        fontSize: 16,
        fontWeight: '600',
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
    profileAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EAE8E3',
    },
});
