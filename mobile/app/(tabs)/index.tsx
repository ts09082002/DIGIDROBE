import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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

} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeColors } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api, WardrobeItem } from '../../services/api';
import * as wardrobeLocal from '../../services/wardrobe-local';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenContainer from '../../components/ui/ScreenContainer';
import OutfitCanvas, { type OutfitCanvasHandle } from '../../components/home/OutfitCanvas';
import OutfitDetailsModal from '../../components/home/OutfitDetailsModal';
import ShareOutfitModal from '../../components/share/ShareOutfitModal';
import { fetchLocationAndWeather, getTimeOfDayForGreeting, type WeatherInfo } from '../../services/weather';
import { generateStyleOfDayForWardrobe } from '../../engine';
import type { RecommendationContext, StyleOfTheDayResult } from '../../engine/types';
import { normalizeCategory } from '../../constants/categories';
import { logScreenView } from '../../services/analytics';

const { width, height } = Dimensions.get('window');
const BODY_PHOTO_KEY = '@vibecheck_body_photo_url';

export default function HomeScreen() {
    const [allWardrobeItems, setAllWardrobeItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { isDarkMode, toggleTheme } = useTheme();
    const tc = useThemeColors();
    const router = useRouter();
    const { registerAnchor, currentStep } = useOnboarding();
    const sotdRef = useRef<any>(null);
    const params = useLocalSearchParams<{ viewOutfit?: string; topId?: string; bottomId?: string; shoeId?: string }>();

    // Canvas ref — exposes zoomIn / zoomOut for the +/- buttons
    const canvasRef = useRef<OutfitCanvasHandle>(null);
    const [canvasHasSelection, setCanvasHasSelection] = useState(false);

    // Explicit selections for Mix & Match
    const [selectedTop, setSelectedTop] = useState<WardrobeItem | null>(null);
    const [selectedBottom, setSelectedBottom] = useState<WardrobeItem | null>(null);
    const [selectedShoe, setSelectedShoe] = useState<WardrobeItem | null>(null);
    const [selectedAccessories, setSelectedAccessories] = useState<WardrobeItem[]>([]);

    // Header Dropdown
    const [headerDropdownVis, setHeaderDropdownVis] = useState(false);

    // Weather + outfit suggestion
    const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);
    const [weatherLoading, setWeatherLoading] = useState(true);
    const [styleOfDay, setStyleOfDay] = useState<StyleOfTheDayResult | null>(null);
    const [outfitDetailsOpen, setOutfitDetailsOpen] = useState(false);
    const [shareVisible, setShareVisible] = useState(false);

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
            logScreenView('Home', 'HomeScreen');
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

    const accessories = useMemo(() => allWardrobeItems.filter((i) => {
        const c = normalizeCategory(i.category);
        return c === 'accessories' || c === 'bags';
    }), [allWardrobeItems]);

    const nowForGreeting = getTimeOfDayForGreeting(new Date());
    const greetingText = (() => {
        switch (nowForGreeting) {
            case 'morning': return 'Good morning';
            case 'afternoon': return 'Good afternoon';
            case 'evening': return 'Good evening';
            default: return 'Good night';
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
        setSelectedAccessories([]);
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

    const handleShuffle = () => {
        if (!allWardrobeItems.length) {
            Alert.alert("Empty Wardrobe", "Add some clothes first!");
            return;
        }

        if (tops.length) setSelectedTop(tops[Math.floor(Math.random() * tops.length)]);
        else setSelectedTop(null);
        
        if (bottoms.length) setSelectedBottom(bottoms[Math.floor(Math.random() * bottoms.length)]);
        else setSelectedBottom(null);
        
        if (shoes.length) setSelectedShoe(shoes[Math.floor(Math.random() * shoes.length)]);
        else setSelectedShoe(null);
        
        if (accessories.length) {
            const numAccessories = Math.floor(Math.random() * 3); // 0, 1, or 2
            if (numAccessories > 0) {
                const shuffled = [...accessories].sort(() => 0.5 - Math.random());
                setSelectedAccessories(shuffled.slice(0, numAccessories));
            } else {
                setSelectedAccessories([]);
            }
        } else {
            setSelectedAccessories([]);
        }
    };

    // Helper component for horizontal list
    const CategoryListRow = ({
        categoryName,
        iconName,
        subtitle,
        items,
        selectedItem,
        selectedItemsArray,
        onSelect
    }: {
        categoryName: string,
        iconName: keyof typeof Ionicons.glyphMap,
        subtitle: string,
        items: WardrobeItem[],
        selectedItem?: WardrobeItem | null,
        selectedItemsArray?: WardrobeItem[],
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
                        const isSelected = selectedItemsArray 
                            ? selectedItemsArray.some(i => i.id === item.id)
                            : selectedItem?.id === item.id;
                        const imageUrl = item.processedUrl || item.originalUrl;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.8}
                                onPress={() => onSelect(item)}
                                style={[
                                    styles.mixItemBox,
                                    { backgroundColor: tc.surface },
                                    isSelected && { borderColor: tc.accent, borderWidth: 2 }
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
            {/* Standard VibeCheck Header */}
            <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="sparkles" size={20} color={tc.accent} />
                    <Text style={[{ color: tc.textPrimary, fontSize: 24, fontWeight: '700', fontFamily: FontFamily.heading }]}>VibeCheck</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm }]} onPress={() => router.push('/notifications')}>
                        <Ionicons name="notifications-outline" size={18} color={tc.textPrimary} />
                        <View style={[styles.badge, { backgroundColor: tc.accent, borderColor: tc.background, top: -2, right: -2 }]}><Text style={styles.badgeText}>2</Text></View>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm }]} 
                        onPress={() => setShareVisible(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Share outfit"
                    >
                        <Ionicons name="share-social-outline" size={18} color={tc.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm }]} onPress={() => router.push('/(tabs)/profile')}>
                        <Ionicons name="person-outline" size={18} color={tc.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm }]} onPress={() => setHeaderDropdownVis(!headerDropdownVis)}>
                        <Ionicons name="ellipsis-horizontal" size={18} color={tc.textPrimary} />
                    </TouchableOpacity>
                </View>
                {headerDropdownVis && (
                    <View style={[styles.headerDropdown, { backgroundColor: tc.backgroundElevated, borderColor: tc.border }]}>
                        <TouchableOpacity 
                            style={styles.dropdownItem} 
                            onPress={() => { setHeaderDropdownVis(false); router.push('/about'); }}
                        >
                            <Ionicons name="information-circle-outline" size={18} color={tc.textPrimary} />
                            <Text style={[styles.dropdownText, { color: tc.textPrimary }]}>About VibeCheck</Text>
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
                {/* Canvas Area */}
                <View style={styles.instructionRow}>
                    <Ionicons name="hand-right-outline" size={16} color={tc.textSecondary} />
                    <Text style={[styles.instructionText, { color: tc.textSecondary }]}>Tap to select • Drag or Pinch to resize</Text>
                </View>

                <View style={styles.canvasContainer}>
                    <OutfitCanvas
                        ref={canvasRef}
                        topItem={selectedTop}
                        bottomItem={selectedBottom}
                        shoeItem={selectedShoe}
                        accessoryItems={selectedAccessories}
                        onOpenDetails={() => setOutfitDetailsOpen(true)}
                        onSelectionChange={setCanvasHasSelection}
                    />

                    {/* Controls row: +/- appear only when an item is selected */}
                    <View style={styles.canvasControls}>
                        {canvasHasSelection && (
                            <TouchableOpacity
                                style={[styles.canvasControlBtn, { backgroundColor: tc.backgroundElevated }]}
                                onPress={() => canvasRef.current?.zoomOut()}
                                accessibilityLabel="Zoom out selected item"
                            >
                                <Ionicons name="remove" size={18} color={tc.textPrimary} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.shuffleBtn, { backgroundColor: tc.backgroundElevated }]}
                            onPress={handleShuffle}
                            accessibilityLabel="Shuffle outfit"
                        >
                            <Ionicons name="shuffle" size={22} color={tc.textPrimary} />
                        </TouchableOpacity>

                        {canvasHasSelection && (
                            <TouchableOpacity
                                style={[styles.canvasControlBtn, { backgroundColor: tc.backgroundElevated }]}
                                onPress={() => canvasRef.current?.zoomIn()}
                                accessibilityLabel="Zoom in selected item"
                            >
                                <Ionicons name="add" size={18} color={tc.textPrimary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Mix & Match Bottom Sheet Container */}
                <View style={[styles.mixMatchSheet, { backgroundColor: tc.card }]}>
                    <View style={styles.mixMatchHeaderRow}>
                        <Text style={[styles.mixMatchMainTitle, { color: tc.textPrimary }]}>Mix & match</Text>
                        <TouchableOpacity style={[styles.clearBtn, { backgroundColor: tc.surfacePressed }]} onPress={handleClear}>
                            <Text style={[styles.clearBtnText, { color: tc.textSecondary }]}>Clear</Text>
                        </TouchableOpacity>
                    </View>

                    <CategoryListRow
                        categoryName="Tops"
                        iconName="shirt-outline"
                        subtitle={tops.length > 0 ? `${tops.length} piece${tops.length !== 1 ? 's' : ''}` : 'Nothing here yet'}
                        items={tops}
                        selectedItem={selectedTop}
                        onSelect={setSelectedTop}
                    />

                    <CategoryListRow
                        categoryName="Bottoms"
                        iconName="layers-outline"
                        subtitle={bottoms.length > 0 ? `${bottoms.length} piece${bottoms.length !== 1 ? 's' : ''}` : 'Nothing here yet'}
                        items={bottoms}
                        selectedItem={selectedBottom}
                        onSelect={setSelectedBottom}
                    />

                    <CategoryListRow
                        categoryName="Kicks"
                        iconName="footsteps-outline"
                        subtitle={shoes.length > 0 ? `${shoes.length} pair${shoes.length !== 1 ? 's' : ''}` : 'Nothing here yet'}
                        items={shoes}
                        selectedItem={selectedShoe}
                        onSelect={setSelectedShoe}
                    />

                    <CategoryListRow
                        categoryName="Drip"
                        iconName="sparkles-outline"
                        subtitle={accessories.length > 0 ? `${accessories.length} piece${accessories.length !== 1 ? 's' : ''}` : 'Nothing here yet'}
                        items={accessories}
                        selectedItemsArray={selectedAccessories}
                        onSelect={(item) => {
                            setSelectedAccessories(prev => {
                                if (prev.some(i => i.id === item.id)) {
                                    return prev.filter(i => i.id !== item.id);
                                } else {
                                    return [...prev, item];
                                }
                            });
                        }}
                    />

                    <TouchableOpacity
                        ref={sotdRef}
                        onLayout={() => {
                            sotdRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
                                if (width > 0 && height > 0) {
                                    registerAnchor('home_sotd', { x, y, width, height });
                                }
                            });
                        }}
                        style={[styles.aiButton, { backgroundColor: tc.accent }]}
                        onPress={handleSuggestAI}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.aiButtonText}>✨ See AI Outfit Suggestions</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom spacer so the card clears the tab bar */}
                <View style={{ height: 100 }} />
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
                accessoryItems={selectedAccessories}
            />

            <ShareOutfitModal
                visible={shareVisible}
                onClose={() => setShareVisible(false)}
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
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#fff',
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
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.lg,
        overflow: 'hidden',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
        ...Shadows.md,
    },
    canvasControls: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 10,
    },
    shuffleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    canvasControlBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },

    /* Mix & Match Sheet */
    mixMatchSheet: {
        borderRadius: 24,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.xxl,
        paddingTop: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
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
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    clearBtnText: {
        fontSize: 12,
        fontWeight: '600',
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
