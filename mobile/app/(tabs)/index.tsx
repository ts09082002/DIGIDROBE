import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    Platform,
    Alert,
    RefreshControl,
    ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeColors } from '../../context/ThemeContext';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api, WardrobeItem } from '../../services/api';
import * as wardrobeLocal from '../../services/wardrobe-local';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenContainer from '../../components/ui/ScreenContainer';
import OutfitCanvas from '../../components/home/OutfitCanvas';
import OutfitDetailsModal from '../../components/home/OutfitDetailsModal';
import { fetchLocationAndWeather, getTimeOfDayForGreeting, type WeatherInfo } from '../../services/weather';
import { generateStyleOfDayForWardrobe } from '../../engine';
import type { RecommendationContext, StyleOfTheDayResult } from '../../engine/types';
import { normalizeCategory } from '../../constants/categories';

const { width, height } = Dimensions.get('window');
const BODY_PHOTO_KEY = '@drobeo_body_photo_url';

export default function HomeScreen() {
    const [allWardrobeItems, setAllWardrobeItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { isDarkMode, toggleTheme } = useTheme();
    const tc = useThemeColors();
    const router = useRouter();
    const params = useLocalSearchParams<{ viewOutfit?: string; topId?: string; bottomId?: string; shoeId?: string }>();

    // Explicit selections for Mix & Match
    const [selectedTop, setSelectedTop] = useState<WardrobeItem | null>(null);
    const [selectedBottom, setSelectedBottom] = useState<WardrobeItem | null>(null);
    const [selectedShoe, setSelectedShoe] = useState<WardrobeItem | null>(null);

    // Header Dropdown
    const [headerDropdownVis, setHeaderDropdownVis] = useState(false);

    // Weather + outfit suggestion
    const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);
    const [weatherLoading, setWeatherLoading] = useState(true);
    const [styleOfDay, setStyleOfDay] = useState<StyleOfTheDayResult | null>(null);
    const [outfitDetailsOpen, setOutfitDetailsOpen] = useState(false);

    // Fetch wardrobe
    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const data = await wardrobeLocal.getAllItems();
            setAllWardrobeItems(data || []);
        } catch (e) {
            console.log('Failed to fetch wardrobe items', e);
            setAllWardrobeItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchItems();
        }, [fetchItems])
    );

    // Fetch current location + temperature
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setWeatherLoading(true);
                const info = await fetchLocationAndWeather();
                if (!cancelled) setWeatherInfo(info);
            } finally {
                if (!cancelled) setWeatherLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Generate style of the day once we have wardrobe items + weather
    useEffect(() => {
        if (!weatherInfo) return;
        if (!allWardrobeItems.length) return;

        const now = new Date();
        const timeOfDay = getTimeOfDayForGreeting(now);
        const context: RecommendationContext = {
            temperatureC: weatherInfo.temperatureC,
            weather: weatherInfo.weatherType,
            occasion: 'casual',
            dayOfWeek: now.getDay(),
            timeOfDay,
        };

        const todayIso = now.toISOString().split('T')[0];
        generateStyleOfDayForWardrobe(allWardrobeItems, context, todayIso)
            .then((res) => setStyleOfDay(res))
            .catch(() => setStyleOfDay(null));
    }, [allWardrobeItems, weatherInfo]);

    // Populate initial selections from styleOfDay
    useEffect(() => {
        if (!styleOfDay || !allWardrobeItems.length) return;
        const aiIds = new Set(styleOfDay.outfit.items.map((i) => i.id));
        const aiItems = allWardrobeItems.filter((i) => aiIds.has(i.id));

        if (!selectedTop) {
            const top = aiItems.find((i) => {
                const c = normalizeCategory(i.category);
                return c === 'topwear' || c === 'dresses';
            });
            if (top) setSelectedTop(top);
        }
        if (!selectedBottom) {
            const bottom = aiItems.find((i) => normalizeCategory(i.category) === 'bottomwear');
            if (bottom) setSelectedBottom(bottom);
        }
        if (!selectedShoe) {
            const shoe = aiItems.find((i) => normalizeCategory(i.category) === 'footwear');
            if (shoe) setSelectedShoe(shoe);
        }
    }, [styleOfDay, allWardrobeItems]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchItems();
        setRefreshing(false);
    }, [fetchItems]);

    // Apply specific outfit passed via route params
    useEffect(() => {
        if (params.viewOutfit === 'true' && allWardrobeItems.length > 0) {
            if (params.topId) {
                const top = allWardrobeItems.find(i => i.id === params.topId);
                if (top) setSelectedTop(top);
            } else {
                setSelectedTop(null);
            }
            if (params.bottomId) {
                const bottom = allWardrobeItems.find(i => i.id === params.bottomId);
                if (bottom) setSelectedBottom(bottom);
            } else {
                setSelectedBottom(null);
            }
            if (params.shoeId) {
                const shoe = allWardrobeItems.find(i => i.id === params.shoeId);
                if (shoe) setSelectedShoe(shoe);
            } else {
                setSelectedShoe(null);
            }
            // Reset param flag to prevent endless loops
            router.setParams({ viewOutfit: 'false' });
        }
    }, [params.viewOutfit, params.topId, params.bottomId, params.shoeId, allWardrobeItems, router]);

    // Derived Categories
    const tops = useMemo(() => allWardrobeItems.filter((i) => {
        const c = normalizeCategory(i.category);
        return c === 'topwear' || c === 'dresses';
    }), [allWardrobeItems]);

    const bottoms = useMemo(() => allWardrobeItems.filter((i) => normalizeCategory(i.category) === 'bottomwear'), [allWardrobeItems]);

    const shoes = useMemo(() => allWardrobeItems.filter((i) => normalizeCategory(i.category) === 'footwear'), [allWardrobeItems]);

    const nowForGreeting = getTimeOfDayForGreeting(new Date());
    const greetingText = (() => {
        switch (nowForGreeting) {
            case 'morning': return 'Good morning';
            case 'afternoon': return 'Good afternoon';
            case 'evening': return 'Good evening';
            default: return 'Good night';
        }
    })();

    const heroBackgroundImage = (() => {
        switch (nowForGreeting) {
            case 'morning': return 'https://images.unsplash.com/photo-1506744626753-1fa28f6f53cb?q=80&w=600&auto=format&fit=crop';
            case 'afternoon': return 'https://images.unsplash.com/photo-1516655855035-d5215bcb5604?q=80&w=600&auto=format&fit=crop';
            case 'evening': return 'https://images.unsplash.com/photo-1509924603848-aca5e5f1a14f?q=80&w=600&auto=format&fit=crop';
            default: return 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?q=80&w=600&auto=format&fit=crop';
        }
    })();
    const recommendationText = (() => {
        if (weatherLoading) return 'Checking weather...';
        if (!weatherInfo) return 'Weather unavailable';
        return `${Math.round(weatherInfo.temperatureC)}°C${weatherInfo.locationName ? ` • ${weatherInfo.locationName}` : ''}`;
    })();

    const handleClear = () => {
        setSelectedTop(null);
        setSelectedBottom(null);
        setSelectedShoe(null);
    };

    const handleSuggestAI = () => {
        if (!styleOfDay || !allWardrobeItems.length) {
            Alert.alert("No suggestions", "Add more items to your wardrobe first.");
            return;
        }
        const aiIds = new Set(styleOfDay.outfit.items.map((i) => i.id));
        const aiItems = allWardrobeItems.filter((i) => aiIds.has(i.id));

        const top = aiItems.find((i) => normalizeCategory(i.category) === 'topwear' || normalizeCategory(i.category) === 'dresses');
        const bottom = aiItems.find((i) => normalizeCategory(i.category) === 'bottomwear');
        const shoe = aiItems.find((i) => normalizeCategory(i.category) === 'footwear');

        setSelectedTop(top || null);
        setSelectedBottom(bottom || null);
        setSelectedShoe(shoe || null);
    };

    // Helper component for horizontal list
    const CategoryListRow = ({
        categoryName,
        iconName,
        subtitle,
        items,
        selectedItem,
        onSelect
    }: {
        categoryName: string,
        iconName: keyof typeof Ionicons.glyphMap,
        subtitle: string,
        items: WardrobeItem[],
        selectedItem: WardrobeItem | null,
        onSelect: (item: WardrobeItem) => void
    }) => {
        return (
            <View style={styles.mixListWrapper}>
                <View style={styles.mixListHeaderRow}>
                    <Ionicons name={iconName} size={16} color={tc.textPrimary} style={{ marginTop: 2 }} />
                    <Text style={[styles.mixListTitle, { color: tc.textPrimary }]}>{categoryName}</Text>
                    <Text style={[styles.mixListSubtitle, { color: tc.textMuted }]}>{subtitle}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mixListScroll}>
                    {items.map((item) => {
                        const isSelected = selectedItem?.id === item.id;
                        const imageUrl = item.processedUrl || item.originalUrl;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.8}
                                onPress={() => onSelect(item)}
                                style={[
                                    styles.mixItemBox,
                                    { backgroundColor: tc.surface },
                                    isSelected && { borderColor: '#d4aa3b', borderWidth: 2 }
                                ]}
                            >
                                {imageUrl ? (
                                    <Image source={{ uri: imageUrl }} style={styles.mixItemImage} resizeMode="contain" />
                                ) : (
                                    <Ionicons name="shirt-outline" size={30} color={tc.textMuted} />
                                )}
                                {isSelected && (
                                    <View style={[styles.checkBadge, { backgroundColor: tc.accent }]}>
                                        <Ionicons name="checkmark" size={12} color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                    {items.length === 0 && (
                        <View style={[styles.mixItemBox, { backgroundColor: tc.surface, justifyContent: 'center' }]}>
                            <Text style={{ color: tc.textMuted, fontSize: 12 }}>Empty</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        );
    };

    return (
        <ScreenContainer>
            {/* Minimalist Top Header matched to screenshot */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoIconBg}>
                        <Ionicons name="diamond" size={12} color="#000" />
                    </View>
                    <Text style={[styles.logoText, { color: tc.textPrimary }]}>Drobeo</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/notifications')}>
                        <Ionicons name="notifications-outline" size={20} color={tc.textPrimary} />
                        <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/profile')}>
                        <Ionicons name="person-outline" size={20} color={tc.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => setHeaderDropdownVis(!headerDropdownVis)}>
                        <Ionicons name="ellipsis-horizontal" size={20} color={tc.textPrimary} />
                    </TouchableOpacity>
                </View>
                {headerDropdownVis && (
                    <View style={[styles.headerDropdown, { backgroundColor: tc.card, borderColor: tc.border }]}>
                        <TouchableOpacity 
                            style={styles.dropdownItem} 
                            onPress={() => { setHeaderDropdownVis(false); router.push('/about'); }}
                        >
                            <Ionicons name="information-circle-outline" size={18} color={tc.textPrimary} />
                            <Text style={[styles.dropdownText, { color: tc.textPrimary }]}>About Drobeo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.dropdownItem} 
                            onPress={() => { setHeaderDropdownVis(false); toggleTheme(); }}
                        >
                            <Ionicons name={isDarkMode ? 'sunny-outline' : 'moon-outline'} size={18} color={tc.textPrimary} />
                            <Text style={[styles.dropdownText, { color: tc.textPrimary }]}>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.warning} />
                }
            >
                {/* Hero Greeting Card */}
                <View style={styles.heroWrap}>
                    <ImageBackground
                        source={{ uri: heroBackgroundImage }}
                        style={styles.heroCard}
                        imageStyle={{ borderRadius: 20 }}
                    >
                        {/* Dark overlay for readability */}
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }]} />
                        <View style={styles.heroTopRow}>
                            <View>
                                <View style={styles.greetingTitleRow}>
                                    <Ionicons name="sunny-outline" size={20} color={tc.accentLight} />
                                    <Text style={styles.heroGreetingText}>{greetingText}</Text>
                                </View>
                                <Text style={styles.heroStylistText}>Stylist</Text>
                                <Text style={styles.heroSubText}>Start fresh — pick your look for today</Text>
                            </View>
                            <View style={styles.itemCountBadge}>
                                <Ionicons name="shirt" size={16} color={tc.accentLight} />
                                <Text style={styles.itemCountText}>{allWardrobeItems.length}</Text>
                                <Text style={styles.itemCountSub}>items</Text>
                            </View>
                        </View>
                        <Text style={[styles.heroBottomText, { color: tc.accentLight }]}>✨ Tap occasion chips in Outfits to get AI suggestions</Text>
                    </ImageBackground>
                </View>

                {/* Canvas Area */}
                <View style={styles.instructionRow}>
                    <Ionicons name="hand-right-outline" size={16} color={tc.textSecondary} />
                    <Text style={[styles.instructionText, { color: tc.textSecondary }]}>Drag each item • Pinch to resize</Text>
                </View>

                <View style={styles.canvasContainer}>
                    <OutfitCanvas
                        topItem={selectedTop}
                        bottomItem={selectedBottom}
                        shoeItem={selectedShoe}
                        onOpenDetails={() => setOutfitDetailsOpen(true)}
                    />
                </View>

                {/* Mix & Match Bottom Sheet Container */}
                <View style={[styles.mixMatchSheet, { backgroundColor: tc.card }]}>
                    <View style={styles.mixMatchHeaderRow}>
                        <Text style={[styles.mixMatchMainTitle, { color: tc.textPrimary }]}>Mix & match</Text>
                        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                            <Text style={styles.clearBtnText}>Clear</Text>
                        </TouchableOpacity>
                    </View>

                    <CategoryListRow
                        categoryName="Tops"
                        iconName="shirt-outline"
                        subtitle="Unclassified item"
                        items={tops}
                        selectedItem={selectedTop}
                        onSelect={setSelectedTop}
                    />

                    <CategoryListRow
                        categoryName="Bottoms"
                        iconName="triangle-outline"
                        subtitle={selectedBottom?.brand || 'H&M'}
                        items={bottoms}
                        selectedItem={selectedBottom}
                        onSelect={setSelectedBottom}
                    />

                    <CategoryListRow
                        categoryName="Footwear"
                        iconName="walk-outline"
                        subtitle="Footwear item"
                        items={shoes}
                        selectedItem={selectedShoe}
                        onSelect={setSelectedShoe}
                    />

                    <TouchableOpacity style={[styles.aiButton, { backgroundColor: tc.accent }]} onPress={handleSuggestAI} activeOpacity={0.8}>
                        <Text style={styles.aiButtonText}>✨ See AI Outfit Suggestions</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <OutfitDetailsModal
                visible={outfitDetailsOpen}
                onClose={() => setOutfitDetailsOpen(false)}
                weatherInfo={weatherInfo}
                greetingText={greetingText}
                recommendationText={recommendationText}
                topItem={selectedTop}
                bottomItem={selectedBottom}
                shoeItem={selectedShoe}
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    /* Minimal Header */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 10,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    logoIconBg: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: Colors.gold,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 18,
        fontWeight: '800',
        fontFamily: FontFamily.heading,
        letterSpacing: -0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        position: 'relative',
        padding: 4,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: Colors.gold,
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff',
    },
    badgeText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#000',
    },
    arToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2A2A2A',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 2,
        gap: 4,
    },
    arText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },

    /* Header Dropdown */
    headerDropdown: {
        position: 'absolute',
        top: 50,
        right: Spacing.lg,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 8,
        minWidth: 160,
        zIndex: 1000,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        gap: 10,
    },
    dropdownText: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },

    /* Hero */
    heroWrap: {
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    heroCard: {
        height: 140,
        borderRadius: 20,
        padding: Spacing.lg,
        justifyContent: 'space-between',
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    greetingTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    heroGreetingText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    heroStylistText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    heroSubText: {
        color: '#E0E0E0',
        fontSize: 12,
    },
    itemCountBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemCountText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
        marginTop: 4,
    },
    itemCountSub: {
        color: '#E0E0E0',
        fontSize: 10,
    },
    heroBottomText: {
        fontSize: 11,
        fontWeight: '600',
    },

    /* Canvas Instruction */
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 8,
    },
    instructionText: {
        fontSize: 12,
        fontWeight: '500',
    },
    canvasContainer: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        overflow: 'hidden',
        borderRadius: 16,
    },

    /* Mix & Match Sheet */
    mixMatchSheet: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100, // accommodate bottom tabs
        minHeight: 400,
        ...Shadows.md,
    },
    mixMatchHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    mixMatchMainTitle: {
        fontSize: 20,
        fontWeight: '800',
        fontFamily: FontFamily.heading,
    },
    clearBtn: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    clearBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
    },

    /* Category List Row */
    mixListWrapper: {
        marginBottom: Spacing.lg,
    },
    mixListHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: Spacing.sm,
    },
    mixListTitle: {
        fontSize: 15,
        fontWeight: '700',
        fontFamily: FontFamily.bodyBold,
    },
    mixListSubtitle: {
        fontSize: 12,
        fontWeight: '500',
    },
    mixListScroll: {
        gap: Spacing.md,
        paddingRight: Spacing.xl,
    },
    mixItemBox: {
        width: 70,
        height: 70,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    mixItemImage: {
        width: '80%',
        height: '80%',
    },
    checkBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },

    /* AI Button */
    aiButton: {
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    aiButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: FontFamily.bodyBold,
    },
});
