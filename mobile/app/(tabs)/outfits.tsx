import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Alert,
    Animated,
    PanResponder,
    Platform,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme, useThemeColors } from '../../context/ThemeContext';
import { api, BodyPhotoUploadResult, StyleProfilePayload, StylistSuggestion, TryOnPreviewResult, WardrobeItem } from '../../services/api';
import * as wardrobeLocal from '../../services/wardrobe-local';
import { SavedLook, getSavedLooks, saveLook } from '../../services/saved-looks-local';
import { normalizeCategory } from '../../constants/categories';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateStyleOfDayForWardrobe } from '../../engine';
import { EngineWardrobeItem, RecommendationContext, StyleOfTheDayResult, UserInteractionEvent } from '../../engine/types';
import { appendUserEvent, invalidateProfileCache, loadOnlineWeights, saveOnlineWeights } from '../../engine/storage';
import { applyOnlineUpdate } from '../../engine/personalization';
import ScreenContainer from '../../components/ui/ScreenContainer';
import { SkeletonGrid } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';

const TABS = ['My Looks', 'AI Stylist'];

type Occasion = 'casual' | 'work' | 'date' | 'party';

type StylePreference = 'Casual' | 'Streetwear' | 'Formal' | 'Minimal';
type BodyType = 'Slim' | 'Athletic' | 'Average' | 'Heavy';
type SkinTone = 'Light' | 'Medium' | 'Tan' | 'Dark';

type StyleProfile = {
    bodyType: BodyType | null;
    skinTone: SkinTone | null;
    height: number;
    waistSize: string;
    stylePreference: StylePreference | null;
};

const BODY_TYPES: BodyType[] = ['Slim', 'Athletic', 'Average', 'Heavy'];
const SKIN_TONES: SkinTone[] = ['Light', 'Medium', 'Tan', 'Dark'];
const WAIST_OPTIONS = ['30', '32', '34', '36'];
const STYLE_PREFERENCES: StylePreference[] = ['Casual', 'Streetwear', 'Formal', 'Minimal'];

const QUIZ_CARD_BACKGROUNDS = ['#EEE7DE', '#D9E3E8', '#E9E0D1', '#DDD5CC'];
const QUIZ_OPTION_IMAGES = {
    bodyType: {
        Slim: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
        Athletic: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
        Average: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
        Heavy: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
    } as Record<BodyType, string>,
    skinTone: {
        Light: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80',
        Medium: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&w=900&q=80',
        Tan: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
        Dark: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80',
    } as Record<SkinTone, string>,
    stylePreference: {
        Casual: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
        Streetwear: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
        Formal: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
        Minimal: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
    } as Record<StylePreference, string>,
};

type OverlayKey =
    | 'top'
    | 'bottom'
    | 'outerwear'
    | 'footwear'
    | 'accessoryLeft'
    | 'accessoryRight';

type OverlayState = Record<OverlayKey, { x: number; y: number; scale: number }>;
type OverlayFrame = { left: `${number}%`; top: `${number}%`; width: `${number}%`; height: `${number}%` };

const getDefaultOverlayState = (): OverlayState => ({
    top: { x: 0, y: 12, scale: 1.22 },
    bottom: { x: 0, y: 8, scale: 1.14 },
    outerwear: { x: 0, y: 8, scale: 1.18 },
    footwear: { x: 0, y: 10, scale: 1.26 },
    accessoryLeft: { x: 0, y: 0, scale: 1 },
    accessoryRight: { x: 0, y: 0, scale: 1 },
});

const MANNEQUIN_OVERLAY_FRAMES: Record<OverlayKey, OverlayFrame> = {
    top: { left: '23%', top: '25%', width: '54%', height: '25%' },
    bottom: { left: '24%', top: '47%', width: '52%', height: '34%' },
    outerwear: { left: '19%', top: '24%', width: '62%', height: '29%' },
    footwear: { left: '29%', top: '80%', width: '42%', height: '10%' },
    accessoryLeft: { left: '16%', top: '32%', width: '12%', height: '12%' },
    accessoryRight: { left: '72%', top: '32%', width: '12%', height: '12%' },
};

function getOverlayFrames(bodyBox?: BodyPhotoUploadResult['bodyBox']): Record<OverlayKey, OverlayFrame> {
    const box = bodyBox ?? {
        left: 0.2,
        top: 0.06,
        width: 0.6,
        height: 0.88,
        imageWidth: 1,
        imageHeight: 1,
    };

    const toPercent = (value: number) => `${Math.max(0, Math.min(100, value * 100))}%` as const;

    return {
        top: {
            left: toPercent(box.left + box.width * 0.10),
            top: toPercent(box.top + box.height * 0.16),
            width: toPercent(box.width * 0.80),
            height: toPercent(box.height * 0.24),
        },
        bottom: {
            left: toPercent(box.left + box.width * 0.18),
            top: toPercent(box.top + box.height * 0.40),
            width: toPercent(box.width * 0.64),
            height: toPercent(box.height * 0.38),
        },
        outerwear: {
            left: toPercent(box.left + box.width * 0.06),
            top: toPercent(box.top + box.height * 0.12),
            width: toPercent(box.width * 0.88),
            height: toPercent(box.height * 0.32),
        },
        footwear: {
            left: toPercent(box.left + box.width * 0.20),
            top: toPercent(box.top + box.height * 0.86),
            width: toPercent(box.width * 0.60),
            height: toPercent(box.height * 0.10),
        },
        accessoryLeft: {
            left: toPercent(box.left + box.width * 0.08),
            top: toPercent(box.top + box.height * 0.20),
            width: toPercent(box.width * 0.18),
            height: toPercent(box.height * 0.15),
        },
        accessoryRight: {
            left: toPercent(box.left + box.width * 0.74),
            top: toPercent(box.top + box.height * 0.20),
            width: toPercent(box.width * 0.18),
            height: toPercent(box.height * 0.15),
        },
    };
}

function DraggableCanvasItem({
    uri,
    baseStyle,
    state,
    selected,
    onSelect,
    onChange,
}: {
    uri: string;
    baseStyle: any;
    state: { x: number; y: number; scale: number };
    selected: boolean;
    onSelect: () => void;
    onChange: (next: { x: number; y: number; scale: number }) => void;
}) {
    const pan = React.useRef(new Animated.ValueXY({ x: state.x, y: state.y })).current;

    useEffect(() => {
        pan.setValue({ x: state.x, y: state.y });
    }, [pan, state.x, state.y]);

    const responder = React.useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: () => true,
                onPanResponderGrant: () => {
                    onSelect();
                    pan.setOffset({ x: state.x, y: state.y });
                    pan.setValue({ x: 0, y: 0 });
                },
                onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
                    useNativeDriver: false,
                }),
                onPanResponderRelease: (_evt, gesture) => {
                    const next = {
                        x: state.x + gesture.dx,
                        y: state.y + gesture.dy,
                        scale: state.scale,
                    };
                    pan.flattenOffset();
                    onChange(next);
                },
            }),
        [onChange, onSelect, pan, state.scale, state.x, state.y],
    );

    return (
        <Animated.View
            {...responder.panHandlers}
            style={[
                baseStyle,
                selected && styles.overlaySelected,
                {
                    transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { scale: state.scale },
                    ],
                },
            ]}
        >
            <TouchableOpacity activeOpacity={0.95} onPress={onSelect} style={styles.overlayTouchable}>
                <Image source={{ uri }} style={styles.overlayImageFill} resizeMode="contain" />
            </TouchableOpacity>
        </Animated.View>
    );
}


import { useRouter } from 'expo-router';

export default function OutfitsScreen() {
    const { isDarkMode } = useTheme();
    const tc = useThemeColors();
    const router = useRouter();
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
    const [profileStep, setProfileStep] = useState(1);
    const [styleProfile, setStyleProfile] = useState<StyleProfile>({
        bodyType: null,
        skinTone: null,
        height: 172,
        waistSize: '32',
        stylePreference: null,
    });
    const [backendSuggestion, setBackendSuggestion] = useState<StylistSuggestion | null>(null);
    const [quizVisible, setQuizVisible] = useState(false); // Disabled per user request
    const [styleOfDay, setStyleOfDay] = useState<StyleOfTheDayResult | null>(null);
    const [styleOfDayLoading, setStyleOfDayLoading] = useState(false);
    const [manuallySwappedItems, setManuallySwappedItems] = useState<Record<string, WardrobeItem>>({});
    const [selectorModalVisible, setSelectorModalVisible] = useState(false);
    const [swappingCategory, setSwappingCategory] = useState<string | null>(null);

    const [styleContext, setStyleContext] = useState<RecommendationContext>({
        temperatureC: 24,
        weather: 'sunny',
        occasion: 'casual',
        dayOfWeek: new Date().getDay(),
        timeOfDay: 'morning',
    });
    const insets = useSafeAreaInsets();

    const loadData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
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
                wardrobeLocal.getAllItems(),
            ]);
            setSavedLooks(looks);
            setWardrobeItems(
                allItems.map((item) => ({
                    ...item,
                    category: normalizeCategory(item.category),
                })),
            );
            await generateOfflineStyleOfDay(allItems);
        } catch (e) {
            console.warn('Failed to load saved looks:', e);
        } finally {
            setLooksLoading(false);
        }
    };

    const recordOutfitInteraction = async (
        result: StyleOfTheDayResult | null,
        type: 'wear' | 'skip',
    ) => {
        if (!result) return;
        try {
            const items = result.outfit.items as EngineWardrobeItem[];
            const event: UserInteractionEvent = {
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                type,
                date: new Date().toISOString(),
                outfitId: result.outfit.id,
                itemIds: items.map(i => i.id),
                itemColors: items.map(i => i.primaryColor),
                itemCategories: items.map(i => i.category),
                itemTags: items.flatMap(i => i.styleTags),
                outfitFormality: items.length > 0
                    ? items.reduce((s, i) => s + i.formality, 0) / items.length
                    : 0.5,
            };
            await appendUserEvent(event);
            await invalidateProfileCache();

            const weights = await loadOnlineWeights();
            const updated = applyOnlineUpdate(weights, items, type !== 'skip');
            await saveOnlineWeights(updated);
        } catch (e) {
            console.warn('Failed to record outfit interaction:', e);
        }
    };

    const regenerateSuggestion = async () => {
        // Record skip before regenerating
        await recordOutfitInteraction(styleOfDay, 'skip');
        setManuallySwappedItems({});
        const topId = styleOfDayItems.find(it => normalizeCategory(it.category) === 'topwear')?.id;
        await generateOfflineStyleOfDay(wardrobeItems, undefined, topId ? [topId] : []);
    };

    const generateOfflineStyleOfDay = async (items: WardrobeItem[], overrideContext?: RecommendationContext, lockedIds?: string[]) => {
        if (!items.length) {
            setStyleOfDay(null);
            return;
        }
        try {
            setStyleOfDayLoading(true);
            const todayIso = new Date().toISOString().slice(0, 10);
            const result = await generateStyleOfDayForWardrobe(items, overrideContext ?? styleContext, todayIso, {
                lockedItemIds: lockedIds
            });
            setStyleOfDay(result);
        } catch (e) {
            console.warn('Offline stylist failed:', e);
            setStyleOfDay(null);
        } finally {
            setStyleOfDayLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        loadLooks();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData(true);
        await loadLooks();
        // generateOfflineStyleOfDay is called inside loadLooks with loaded items
        setRefreshing(false);
    };

    const stats = suggestion?.stats ?? {
        totalItems: wardrobeItems.length,
        totalFavorites: wardrobeItems.filter((item) => item.isFavorite).length,
        categories: wardrobeItems.reduce<Record<string, number>>((acc, item) => {
            const key = normalizeCategory(item.category);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {}),
    };
    const suggestedOutfitFromBackend = backendSuggestion?.suggestedOutfit ?? suggestion?.suggestedOutfit ?? [];
    const alternativeLooks = backendSuggestion?.alternativeOutfits ?? suggestion?.alternativeOutfits ?? [];
    const bestLook = alternativeLooks[0] ?? null;
    const isProfileComplete = Boolean(
        styleProfile.bodyType &&
        styleProfile.skinTone &&
        styleProfile.waistSize &&
        styleProfile.stylePreference,
    );
    const isCurrentStepReady = (
        (profileStep === 1 && Boolean(styleProfile.bodyType)) ||
        (profileStep === 2 && Boolean(styleProfile.skinTone)) ||
        profileStep === 3 ||
        (profileStep === 4 && Boolean(styleProfile.waistSize)) ||
        (profileStep === 5 && Boolean(styleProfile.stylePreference))
    );

    const wardrobeById = useMemo(() => {
        const map: Record<string, WardrobeItem> = {};
        wardrobeItems.forEach((item) => {
            map[item.id] = item;
        });
        return map;
    }, [wardrobeItems]);

    const styleOfDayItems = useMemo(() => {
        if (!styleOfDay) return [];
        return styleOfDay.scores.itemIds
            .map((id) => wardrobeById[id])
            .filter((it): it is WardrobeItem => Boolean(it));
    }, [styleOfDay, wardrobeById]);

    const suggestedOutfit = useMemo(() => {
        const base = styleOfDayItems.length ? styleOfDayItems : suggestedOutfitFromBackend;

        // Merge manual swaps
        const merged = [...base];
        Object.keys(manuallySwappedItems).forEach(cat => {
            const index = merged.findIndex(it => normalizeCategory(it.category) === cat);
            if (index !== -1) {
                merged[index] = manuallySwappedItems[cat];
            } else {
                merged.push(manuallySwappedItems[cat]);
            }
        });

        return merged;
    }, [styleOfDayItems, suggestedOutfitFromBackend, manuallySwappedItems]);

    const layeredOutfitItems = useMemo(() => {
        const top = suggestedOutfit.find((item) => normalizeCategory(item.category) === 'topwear');
        const bottom = suggestedOutfit.find((item) => normalizeCategory(item.category) === 'bottomwear');
        const outerwear = suggestedOutfit.find((item) => normalizeCategory(item.category) === 'outerwear');
        const footwear = suggestedOutfit.find((item) => normalizeCategory(item.category) === 'footwear');
        const accessories = suggestedOutfit.filter((item) => normalizeCategory(item.category) === 'accessories');

        return { top, bottom, outerwear, footwear, accessories };
    }, [suggestedOutfit]);

    const openQuiz = () => setQuizVisible(true);
    const closeQuiz = () => setQuizVisible(false);

    const updateStyleProfile = <K extends keyof StyleProfile>(key: K, value: StyleProfile[K]) => {
        setStyleProfile((prev) => ({ ...prev, [key]: value }));
    };

    const nextProfileStep = () => setProfileStep((prev) => Math.min(prev + 1, 5));
    const previousProfileStep = () => setProfileStep((prev) => Math.max(prev - 1, 1));

    const openSelector = (category: string) => {
        setSwappingCategory(category);
        setSelectorModalVisible(true);
    };

    const handleSelectManualItem = (item: WardrobeItem) => {
        if (!swappingCategory) return;
        setManuallySwappedItems(prev => ({
            ...prev,
            [swappingCategory]: item
        }));
        setSelectorModalVisible(false);
        setSwappingCategory(null);
    };


    const handleSaveCurrentLook = async () => {
        if (!suggestedOutfit.length || savingLook) return;
        try {
            setSavingLook(true);
            // Record wear interaction for personalization
            await recordOutfitInteraction(styleOfDay, 'wear');
            const now = new Date();
            const look: SavedLook = {
                id: `${now.getTime()}`,
                name: styleOfDay ? 'Style of the Day' : 'AI Look',
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



    const renderQuizChoiceCard = (
        label: string,
        selected: boolean,
        onPress: () => void,
        index: number,
        subtitle?: string,
        imageUrl?: string,
    ) => (
        <TouchableOpacity
            key={label}
            style={[
                styles.quizChoiceCard,
                !imageUrl && { backgroundColor: QUIZ_CARD_BACKGROUNDS[index % QUIZ_CARD_BACKGROUNDS.length] },
                selected && styles.quizChoiceCardActive,
            ]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.quizChoiceImage} resizeMode="cover" />
            ) : (
                <View style={styles.quizChoiceArtwork}>
                    <Ionicons name="sparkles-outline" size={34} color="rgba(17,24,39,0.35)" />
                </View>
            )}
            <View style={styles.quizChoiceOverlay} />
            <View style={styles.quizChoiceFooter}>
                <Text style={[styles.quizChoiceLabel, selected && styles.quizChoiceLabelActive]}>{label}</Text>
                {subtitle ? <Text style={styles.quizChoiceSubtitle}>{subtitle}</Text> : null}
            </View>
            {selected ? (
                <View style={styles.quizCheckBadge}>
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                </View>
            ) : null}
        </TouchableOpacity>
    );

    const renderQuizStepContent = () => {
        if (profileStep === 1) {
            return (
                <>
                    <Text style={styles.quizQuestionTitle}>What is your body type?</Text>
                    <View style={styles.quizChoiceGrid}>
                        {BODY_TYPES.map((bodyType, index) =>
                            renderQuizChoiceCard(
                                bodyType,
                                styleProfile.bodyType === bodyType,
                                () => updateStyleProfile('bodyType', bodyType),
                                index,
                                undefined,
                                QUIZ_OPTION_IMAGES.bodyType[bodyType],
                            ),
                        )}
                    </View>
                </>
            );
        }

        if (profileStep === 2) {
            return (
                <>
                    <Text style={styles.quizQuestionTitle}>What is your skin tone?</Text>
                    <View style={styles.quizChoiceGrid}>
                        {SKIN_TONES.map((skinTone, index) =>
                            renderQuizChoiceCard(
                                skinTone,
                                styleProfile.skinTone === skinTone,
                                () => updateStyleProfile('skinTone', skinTone),
                                index,
                                undefined,
                                QUIZ_OPTION_IMAGES.skinTone[skinTone],
                            ),
                        )}
                    </View>
                </>
            );
        }

        if (profileStep === 3) {
            return (
                <>
                    <Text style={styles.quizQuestionTitle}>What is your height?</Text>
                    <View style={styles.quizWeatherList}>
                        <TouchableOpacity style={styles.quizWeatherCard} onPress={() => updateStyleProfile('height', Math.max(160, styleProfile.height - 2))}>
                            <View style={styles.quizWeatherIcon}>
                                <Ionicons name="remove" size={22} color={Colors.goldDark} />
                            </View>
                            <View style={styles.quizWeatherTextWrap}>
                                <Text style={styles.quizWeatherTitle}>Lower</Text>
                                <Text style={styles.quizWeatherSubtitle}>Reduce by 2 cm</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={[styles.quizHeightPanel, styles.quizWeatherCardActive]}>
                            <Text style={styles.quizHeightValue}>{styleProfile.height} cm</Text>
                            <View style={styles.quizProgressTrack}>
                                <View style={[styles.quizProgressFill, { width: `${((styleProfile.height - 160) / 30) * 100}%` }]} />
                            </View>
                            <Text style={styles.quizHeightRange}>160cm - 190cm</Text>
                        </View>

                        <TouchableOpacity style={styles.quizWeatherCard} onPress={() => updateStyleProfile('height', Math.min(190, styleProfile.height + 2))}>
                            <View style={styles.quizWeatherIcon}>
                                <Ionicons name="add" size={22} color={Colors.goldDark} />
                            </View>
                            <View style={styles.quizWeatherTextWrap}>
                                <Text style={styles.quizWeatherTitle}>Higher</Text>
                                <Text style={styles.quizWeatherSubtitle}>Increase by 2 cm</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </>
            );
        }

        if (profileStep === 4) {
            return (
                <>
                    <Text style={styles.quizQuestionTitle}>What is your waist size?</Text>
                    <View style={styles.quizWeatherList}>
                        {WAIST_OPTIONS.map((waistSize) => {
                            const selected = styleProfile.waistSize === waistSize;
                            return (
                                <TouchableOpacity
                                    key={waistSize}
                                    style={[styles.quizWeatherCard, selected && styles.quizWeatherCardActive]}
                                    onPress={() => updateStyleProfile('waistSize', waistSize)}
                                >
                                    <View style={[styles.quizWeatherIcon, selected && styles.quizWeatherIconActive]}>
                                        <Ionicons name="resize-outline" size={22} color={selected ? Colors.white : Colors.goldDark} />
                                    </View>
                                    <View style={styles.quizWeatherTextWrap}>
                                        <Text style={styles.quizWeatherTitle}>{waistSize}</Text>
                                        <Text style={styles.quizWeatherSubtitle}>Waist size</Text>
                                    </View>
                                    {selected ? (
                                        <View style={styles.quizInlineCheck}>
                                            <Ionicons name="checkmark" size={16} color={Colors.goldDark} />
                                        </View>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </>
            );
        }

        return (
            <>
                <Text style={styles.quizQuestionTitle}>What is your style preference?</Text>
                <View style={styles.quizChoiceGrid}>
                    {STYLE_PREFERENCES.map((stylePreference, index) =>
                        renderQuizChoiceCard(
                            stylePreference,
                            styleProfile.stylePreference === stylePreference,
                            () => updateStyleProfile('stylePreference', stylePreference),
                            index,
                            stylePreference === 'Casual'
                                ? 'Relaxed everyday'
                                : stylePreference === 'Streetwear'
                                    ? 'Bold urban'
                                    : stylePreference === 'Formal'
                                        ? 'Sharp and polished'
                                        : 'Clean and simple',
                            QUIZ_OPTION_IMAGES.stylePreference[stylePreference],
                        ),
                    )}
                </View>
            </>
        );
    };

    return (
        <ScreenContainer>

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
                <View style={styles.headerLeft}>
                    <Ionicons name="sparkles" size={20} color={Colors.gold} />
                    <Text style={[styles.title, { color: tc.textPrimary }]}>My Outfits</Text>
                </View>
                {stats && (
                    <View style={styles.statsRow}>
                        <View style={styles.statChip}>
                            <Text style={[styles.statNum, { color: tc.textPrimary }]}>{stats.totalItems}</Text>
                            <Text style={[styles.statLbl, { color: tc.textSecondary }]}>items</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: tc.border }]} />
                        <View style={styles.statChip}>
                            <Text style={[styles.statNum, { color: tc.accent }]}>{stats.totalFavorites}</Text>
                            <Text style={[styles.statLbl, { color: tc.textSecondary }]}>faves</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Tabs */}
            <View style={[styles.tabsContainer, { backgroundColor: tc.surface }]}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && [styles.tabActive, { backgroundColor: tc.card }]]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: tc.textSecondary },
                            activeTab === tab && [styles.tabTextActive, { color: tc.textPrimary }],
                        ]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingCenter}>
                    <SkeletonGrid count={4} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.accent} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    {activeTab === 'AI Stylist' ? (
                        <>
                            {/* Style of the Day (offline) */}
                            <View style={[styles.stylistBanner, { backgroundColor: tc.card, borderColor: tc.accent }]}>
                                <View style={styles.bannerRow}>
                                    <View style={styles.bannerIcon}>
                                        <Ionicons name="sparkles" size={22} color={Colors.gold} />
                                    </View>
                                    <View style={styles.bannerText}>
                                        <Text style={[styles.bannerTitle, { color: tc.textPrimary }]}>Style of the Day</Text>
                                        <Text style={[styles.bannerSub, { color: tc.textSecondary }]}>
                                            Shuffle to lock topwear and browse alternatives
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.regenBtn, { backgroundColor: Colors.gold }]}
                                        onPress={regenerateSuggestion}
                                        disabled={styleOfDayLoading}
                                        accessibilityRole="button"
                                        accessibilityLabel="Shuffle outfit"
                                    >
                                        {styleOfDayLoading ? (
                                            <ActivityIndicator size="small" color={Colors.white} />
                                        ) : (
                                            <Ionicons name="shuffle" size={16} color={Colors.white} />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Occasion Context Chips */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.occasionChipsStrip}>
                                    {(['casual', 'work', 'date', 'party'] as Occasion[]).map((occ) => {
                                        const isActive = styleContext.occasion === occ;
                                        return (
                                            <TouchableOpacity
                                                key={occ}
                                                style={[
                                                    styles.occasionChip,
                                                    isActive ? styles.occasionChipActive : { backgroundColor: tc.card, borderColor: tc.border },
                                                ]}
                                                onPress={() => {
                                                    const nextContext = { ...styleContext, occasion: occ };
                                                    setStyleContext(nextContext);
                                                    generateOfflineStyleOfDay(wardrobeItems, nextContext);
                                                }}
                                            >
                                                <Text style={[styles.occasionChipText, isActive ? styles.occasionChipTextActive : { color: tc.textSecondary }]}>
                                                    {occ.charAt(0).toUpperCase() + occ.slice(1)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                {suggestedOutfit.length === 0 ? (
                                    <View style={styles.emptySuggestion}>
                                        <Ionicons name="shirt-outline" size={36} color={tc.border} />
                                        <Text style={[styles.emptySuggestionText, { color: tc.textSecondary }]}>
                                            Add at least a top and bottom to generate an outfit
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.suggestedOutfitContainer}>
                                        {/* Optional Score Breakdown */}
                                        {styleOfDay?.scores ? (
                                            <View style={styles.scoreBreakdownRow}>
                                                <View style={styles.scorePill}>
                                                    <View style={[styles.scoreDot, { backgroundColor: '#FF6B6B' }]} />
                                                    <Text style={styles.scoreText}>Color {Math.round(styleOfDay.scores.colorScore)}</Text>
                                                </View>
                                                <View style={styles.scorePill}>
                                                    <View style={[styles.scoreDot, { backgroundColor: '#4ECDC4' }]} />
                                                    <Text style={styles.scoreText}>Weather {Math.round(styleOfDay.scores.weatherScore)}</Text>
                                                </View>
                                                <View style={styles.scorePill}>
                                                    <View style={[styles.scoreDot, { backgroundColor: '#FFE66D' }]} />
                                                    <Text style={styles.scoreText}>Occasion {Math.round(styleOfDay.scores.occasionScore)}</Text>
                                                </View>
                                                <View style={styles.scorePill}>
                                                    <View style={[styles.scoreDot, { backgroundColor: '#A29BFE' }]} />
                                                    <Text style={styles.scoreText}>You {Math.round(styleOfDay.scores.userPreferenceScore)}</Text>
                                                </View>
                                            </View>
                                        ) : null}

                                        <View style={styles.manualSwapGrid}>
                                            {suggestedOutfit.map((item, i) => (
                                                <View key={item.id} style={styles.swapItemCard}>
                                                    <Image
                                                        source={{ uri: item.processedUrl }}
                                                        style={styles.swapItemImg}
                                                        resizeMode="contain"
                                                    />
                                                    <View style={styles.swapItemMeta}>
                                                        <Text style={[styles.swapItemCat, { color: tc.textSecondary }]} numberOfLines={1}>
                                                            {normalizeCategory(item.category).toUpperCase()}
                                                        </Text>
                                                        <TouchableOpacity
                                                            style={styles.swapBtn}
                                                            onPress={() => openSelector(normalizeCategory(item.category))}
                                                        >
                                                            <Ionicons name="swap-horizontal" size={14} color={Colors.goldDark} />
                                                            <Text style={styles.swapBtnText}>Swap</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {bestLook?.note ? (
                                    <Text style={[styles.bestLookNote, { color: tc.textSecondary }]}>
                                        {bestLook.note}
                                    </Text>
                                ) : null}

                                {suggestedOutfit.length > 0 && (
                                    <View style={styles.bannerActionsRow}>
                                        <TouchableOpacity
                                            style={[styles.saveLookBtn, { backgroundColor: tc.iconBtnBg }]}
                                            onPress={handleSaveCurrentLook}
                                            disabled={savingLook}
                                            accessibilityRole="button"
                                            accessibilityLabel="Save this look"
                                        >
                                            {savingLook ? (
                                                <ActivityIndicator size="small" color={tc.textPrimary} />
                                            ) : (
                                                <>
                                                    <Ionicons name="bookmark" size={16} color={tc.textPrimary} />
                                                    <Text style={[styles.saveLookText, { color: tc.textPrimary }]}>
                                                        Save this look
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {alternativeLooks.length > 0 && isProfileComplete && (
                                <View style={styles.generatedSection}>
                                    <View style={styles.generatedSectionHeader}>
                                        <Text style={[styles.generatedSectionTitle, { color: tc.textPrimary }]}>
                                            You Can Also Try
                                        </Text>
                                        <Text style={[styles.generatedSectionHint, { color: tc.textSecondary }]}>
                                            More looks ranked from your current answers
                                        </Text>
                                    </View>

                                    {alternativeLooks.map((look) => (
                                        <View
                                            key={look.id}
                                            style={[styles.generatedLookCard, { backgroundColor: tc.card, borderColor: tc.border }]}
                                        >
                                            <Text style={[styles.generatedLookTitle, { color: tc.textPrimary }]}>{look.name}</Text>
                                            <Text style={[styles.generatedLookNote, { color: tc.textSecondary }]}>{look.note}</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.generatedLookStrip}>
                                                {look.items.map((item) => (
                                                    <View key={item.id} style={styles.generatedLookItem}>
                                                        <Image
                                                            source={{ uri: item.processedUrl }}
                                                            style={styles.generatedLookImage}
                                                            resizeMode="contain"
                                                        />
                                                        <Text
                                                            style={[styles.generatedLookLabel, { color: tc.textSecondary }]}
                                                            numberOfLines={1}
                                                        >
                                                            {item.name}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Wardrobe Breakdown */}
                            {stats && Object.keys(stats.categories).length > 0 && (
                                <>
                                    <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>YOUR WARDROBE</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                                        {Object.entries(stats.categories)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([cat, count]) => (
                                                <View key={cat} style={[styles.catChip, { backgroundColor: tc.card, borderColor: tc.border }]}>
                                                    <Text style={[styles.catNum, { color: tc.accent }]}>{count}</Text>
                                                    <Text style={[styles.catLabel, { color: tc.textSecondary }]} numberOfLines={1}>
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
                                    <SkeletonGrid count={4} />
                                </View>
                            ) : savedLooks.length === 0 ? (
                                <EmptyState
                                    icon="bookmark-outline"
                                    title="No looks yet"
                                    subtitle="Use the AI Stylist tab to generate an outfit and save it here as a look."
                                />
                            ) : (
                                <View style={styles.looksList}>
                                    {savedLooks.map((look, index) => {
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
                                                key={look.id}
                                                activeOpacity={0.9}
                                                onPress={() =>
                                                    setExpandedLookId(expanded ? null : look.id)
                                                }
                                                style={[styles.lookCard, { backgroundColor: tc.card, borderColor: tc.border }]}
                                            >
                                                <View style={styles.lookHeaderRow}>
                                                    <View>
                                                        <Text style={[styles.lookTitle, { color: tc.textPrimary }]}>
                                                            {look.name || `Look ${index + 1}`}
                                                        </Text>
                                                        <Text style={[styles.lookSubtitle, { color: tc.textSecondary }]}>
                                                            {items.length} pieces • Saved from {look.source === 'ai' ? 'AI Stylist' : 'your wardrobe'}
                                                        </Text>
                                                    </View>
                                                    <Ionicons
                                                        name={expanded ? 'chevron-up' : 'chevron-down'}
                                                        size={18}
                                                        color={tc.textSecondary}
                                                    />
                                                </View>

                                                {primaryThumb && (
                                                    <View style={styles.lookThumbRow}>
                                                        <Image
                                                            source={{ uri: primaryThumb.processedUrl }}
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
                                                                <Text style={[styles.lookCategoryTitle, { color: tc.textPrimary }]}>Topwear</Text>
                                                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                                    {topItems.map((wItem) => (
                                                                        <Image
                                                                            key={wItem.id}
                                                                            source={{ uri: wItem.processedUrl }}
                                                                            style={styles.lookPieceImg}
                                                                            resizeMode="contain"
                                                                        />
                                                                    ))}
                                                                </ScrollView>
                                                            </View>
                                                        )}
                                                        {bottomItems.length > 0 && (
                                                            <View style={styles.lookCategorySection}>
                                                                <Text style={[styles.lookCategoryTitle, { color: tc.textPrimary }]}>Bottomwear</Text>
                                                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                                    {bottomItems.map((wItem) => (
                                                                        <Image
                                                                            key={wItem.id}
                                                                            source={{ uri: wItem.processedUrl }}
                                                                            style={styles.lookPieceImg}
                                                                            resizeMode="contain"
                                                                        />
                                                                    ))}
                                                                </ScrollView>
                                                            </View>
                                                        )}
                                                        {footwearItems.length > 0 && (
                                                            <View style={styles.lookCategorySection}>
                                                                <Text style={[styles.lookCategoryTitle, { color: tc.textPrimary }]}>Footwear</Text>
                                                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                                    {footwearItems.map((wItem) => (
                                                                        <Image
                                                                            key={wItem.id}
                                                                            source={{ uri: wItem.processedUrl }}
                                                                            style={styles.lookPieceImg}
                                                                            resizeMode="contain"
                                                                        />
                                                                    ))}
                                                                </ScrollView>
                                                            </View>
                                                        )}
                                                        {accessoryItems.length > 0 && (
                                                            <View style={styles.lookCategorySection}>
                                                                <Text style={[styles.lookCategoryTitle, { color: tc.textPrimary }]}>Accessories</Text>
                                                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                                    {accessoryItems.map((wItem) => (
                                                                        <Image
                                                                            key={wItem.id}
                                                                            source={{ uri: wItem.processedUrl }}
                                                                            style={styles.lookPieceImg}
                                                                            resizeMode="contain"
                                                                        />
                                                                    ))}
                                                                </ScrollView>
                                                            </View>
                                                        )}
                                                        
                                                        <TouchableOpacity
                                                            style={styles.seeOnCanvasBtn}
                                                            onPress={() => {
                                                                router.replace({
                                                                    pathname: '/(tabs)/',
                                                                    params: {
                                                                        viewOutfit: 'true',
                                                                        topId: topItems[0]?.id || '',
                                                                        bottomId: bottomItems[0]?.id || '',
                                                                        shoeId: footwearItems[0]?.id || ''
                                                                    }
                                                                });
                                                            }}
                                                        >
                                                            <Ionicons name="eye-outline" size={18} color={Colors.white} />
                                                            <Text style={styles.seeOnCanvasBtnText}>See on Canvas</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            <Modal
                visible={quizVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={closeQuiz}
            >
                <View style={styles.quizModalScreen}>
                    <View style={styles.quizModalHeader}>
                        <TouchableOpacity style={styles.quizCloseBtn} onPress={closeQuiz} accessibilityRole="button" accessibilityLabel="Close style quiz">
                            <Ionicons name="close" size={28} color={Colors.charcoal} />
                        </TouchableOpacity>
                        <Text style={styles.quizModalTitle}>Style Quiz</Text>
                        <View style={styles.quizCloseBtnSpacer} />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.quizModalContent}>
                        <View style={styles.quizIntroRow}>
                            <View>
                                <Text style={styles.quizStepEyebrow}>STEP {String(profileStep).padStart(2, '0')}</Text>
                                <Text style={styles.quizIntroTitle}>Your Style Profile</Text>
                            </View>
                            <Text style={styles.quizIntroCount}>{profileStep}/5</Text>
                        </View>

                        <View style={styles.quizProgressTrack}>
                            <View style={[styles.quizProgressFill, { width: `${(profileStep / 5) * 100}%` }]} />
                        </View>

                        {renderQuizStepContent()}

                        <View style={styles.quizBottomActions}>
                            {profileStep > 1 ? (
                                <TouchableOpacity style={styles.quizSecondaryBtn} onPress={previousProfileStep}>
                                    <Text style={styles.quizSecondaryBtnText}>Back</Text>
                                </TouchableOpacity>
                            ) : (
                                <View />
                            )}

                            {profileStep < 5 ? (
                                <TouchableOpacity
                                    style={[styles.quizPrimaryBtn, !isCurrentStepReady && styles.profileNavBtnDisabled]}
                                    onPress={nextProfileStep}
                                    disabled={!isCurrentStepReady}
                                >
                                    <Text style={styles.quizPrimaryBtnText}>Next Step</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.quizPrimaryBtn, !isCurrentStepReady && styles.profileNavBtnDisabled]}
                                    onPress={async () => {
                                        await regenerateSuggestion();
                                        closeQuiz();
                                    }}
                                    disabled={!isCurrentStepReady || suggestionLoading}
                                >
                                    {suggestionLoading ? (
                                        <ActivityIndicator size="small" color={Colors.white} />
                                    ) : (
                                        <Text style={styles.quizPrimaryBtnText}>Show Outfits</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            <Modal visible={selectorModalVisible} animationType="slide" transparent={false}>
                <SafeAreaView style={[styles.selectorModal, { backgroundColor: tc.background }]}>
                    <View style={[styles.selectorHeader, { borderBottomColor: tc.border }]}>
                        <TouchableOpacity onPress={() => setSelectorModalVisible(false)} style={styles.selectorCloseBtn} accessibilityRole="button" accessibilityLabel="Close item selector">
                            <Ionicons name="close" size={24} color={tc.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.selectorTitle, { color: tc.textPrimary }]}>
                            Select {swappingCategory}
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <ScrollView contentContainerStyle={styles.selectorGrid} showsVerticalScrollIndicator={false}>
                        {wardrobeItems
                            .filter(it => normalizeCategory(it.category) === swappingCategory)
                            .map(item => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.selectorCard, { backgroundColor: tc.card }]}
                                    onPress={() => handleSelectManualItem(item)}
                                >
                                    <Image
                                        source={{ uri: item.processedUrl }}
                                        style={styles.selectorImg}
                                        resizeMode="contain"
                                    />
                                    <Text style={[styles.selectorName, { color: tc.textPrimary }]} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        {wardrobeItems.filter(it => normalizeCategory(it.category) === swappingCategory).length === 0 && (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 }}>
                                <Text style={{ color: tc.textSecondary }}>No items found in this category</Text>
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: 0,
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
    statNum: { fontSize: 18, fontWeight: '700', fontFamily: FontFamily.bodyBold },
    statLbl: { fontSize: 11, fontFamily: FontFamily.body },
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
    tabText: { fontSize: 13, fontWeight: '500', fontFamily: FontFamily.bodyMedium },
    tabTextActive: { fontWeight: '700', fontFamily: FontFamily.bodyBold },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14, fontFamily: FontFamily.body },
    scrollContent: { paddingBottom: 100 },
    bodyUploadCard: {
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.lg,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        ...Shadows.sm,
    },
    bodyUploadHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bodyUploadIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F6EDE0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    bodyUploadTextWrap: {
        flex: 1,
    },
    bodyUploadTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    bodyUploadSubtitle: {
        fontSize: 12,
        marginTop: 4,
        lineHeight: 18,
    },
    bodyPhotoPreviewWrap: {
        marginTop: Spacing.md,
        alignItems: 'center',
    },
    bodyPhotoPreview: {
        width: '100%',
        height: 260,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.cream,
    },
    bodyPhotoStatus: {
        fontSize: 12,
        marginTop: Spacing.sm,
        fontWeight: '600',
    },
    bodyUploadActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    bodyUploadBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: Colors.gold,
        borderRadius: BorderRadius.round,
        paddingVertical: Spacing.md,
    },
    bodyUploadBtnSecondary: {
        backgroundColor: '#F6EDE0',
    },
    bodyUploadBtnText: {
        color: Colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
    bodyUploadBtnSecondaryText: {
        color: Colors.goldDark,
        fontSize: 13,
        fontWeight: '700',
    },
    bodyUploadLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    bodyUploadLoadingText: {
        fontSize: 12,
        fontWeight: '500',
    },
    quizLauncher: {
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.lg,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Shadows.sm,
    },
    quizLauncherTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    quizLauncherSubtitle: {
        fontSize: 12,
        marginTop: 4,
    },
    quizModalScreen: {
        flex: 1,
        backgroundColor: '#F7F5F2',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) : 40,
    },
    quizModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#E9E2D8',
    },
    quizModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: FontFamily.bodyBold,
        color: Colors.charcoal,
    },
    quizCloseBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quizCloseBtnSpacer: {
        width: 36,
        height: 36,
    },
    quizModalContent: {
        padding: Spacing.xl,
        paddingBottom: 120,
    },
    quizIntroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    quizStepEyebrow: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1.4,
        color: Colors.goldDark,
    },
    quizIntroTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.charcoal,
    },
    quizIntroCount: {
        fontSize: 14,
        color: '#7C8597',
        fontWeight: '600',
    },
    quizProgressTrack: {
        height: 6,
        borderRadius: 999,
        backgroundColor: '#EEE6DB',
        overflow: 'hidden',
        marginBottom: Spacing.xxl,
    },
    quizProgressFill: {
        height: '100%',
        backgroundColor: Colors.gold,
        borderRadius: 999,
    },
    quizQuestionTitle: {
        fontSize: 26,
        lineHeight: 34,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
        color: '#111827',
        marginBottom: Spacing.lg,
    },
    quizChoiceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: Spacing.xxl,
    },
    quizChoiceCard: {
        width: '48%',
        borderRadius: 18,
        overflow: 'hidden',
        minHeight: 240,
        marginBottom: Spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    quizChoiceCardActive: {
        borderColor: Colors.gold,
        ...Shadows.sm,
    },
    quizChoiceArtwork: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quizChoiceImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    quizChoiceOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(17,24,39,0.18)',
    },
    quizChoiceFooter: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: Spacing.md,
    },
    quizChoiceLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.white,
    },
    quizChoiceLabelActive: {
        color: Colors.white,
    },
    quizChoiceSubtitle: {
        fontSize: 12,
        marginTop: 4,
        color: 'rgba(255,255,255,0.86)',
    },
    quizCheckBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: Colors.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quizWeatherList: {
        gap: Spacing.md,
        marginBottom: Spacing.xxl,
    },
    quizWeatherCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 20,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        borderWidth: 1,
        borderColor: '#F0ECE6',
    },
    quizWeatherCardActive: {
        borderColor: Colors.gold,
        backgroundColor: '#FBF8F1',
    },
    quizWeatherIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F6EDE0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    quizWeatherIconActive: {
        backgroundColor: Colors.gold,
    },
    quizWeatherTextWrap: {
        flex: 1,
    },
    quizWeatherTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    quizWeatherSubtitle: {
        fontSize: 13,
        marginTop: 2,
        color: '#7C8597',
    },
    quizInlineCheck: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F6EDE0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quizHeightPanel: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xl,
        borderWidth: 1,
        borderColor: '#F0ECE6',
    },
    quizHeightValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    quizHeightRange: {
        marginTop: Spacing.sm,
        textAlign: 'center',
        fontSize: 13,
        color: '#7C8597',
    },
    quizBottomActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    quizSecondaryBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    quizSecondaryBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7C8597',
    },
    quizPrimaryBtn: {
        minWidth: 210,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: Colors.gold,
        paddingVertical: Spacing.lg,
        ...Shadows.sm,
    },
    quizPrimaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: FontFamily.bodySemiBold,
        color: Colors.white,
    },
    profileNavBtnDisabled: {
        opacity: 0.4,
    },
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
    bannerTitle: { fontSize: 16, fontWeight: '700', fontFamily: FontFamily.bodyBold },
    bannerSub: { fontSize: 12, marginTop: 2, fontFamily: FontFamily.body },
    regenBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptySuggestion: { alignItems: 'center', paddingVertical: 20, gap: 10 },
    emptySuggestionText: { fontSize: 13, textAlign: 'center', fontStyle: 'italic', fontFamily: FontFamily.body },
    outfitStrip: { marginTop: 4 },
    styledPreviewCard: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        backgroundColor: Colors.warmGray,
        marginBottom: Spacing.md,
    },
    styledPreviewStage: {
        position: 'relative',
        width: '100%',
        height: 380,
        backgroundColor: Colors.cream,
        alignItems: 'center',
        justifyContent: 'center',
    },
    styledPreviewImage: {
        width: '100%',
        height: '100%',
    },
    mannequinStage: {
        position: 'relative',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    mannequinBackdrop: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.94,
    },
    mannequinFloorShadow: {
        position: 'absolute',
        bottom: '8%',
        width: '52%',
        height: 28,
        borderRadius: 20,
        backgroundColor: 'rgba(15,18,25,0.24)',
    },
    mannequinHead: {
        position: 'absolute',
        top: '11%',
        width: 76,
        height: 90,
        borderRadius: 40,
    },
    mannequinNeck: {
        position: 'absolute',
        top: '26%',
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    mannequinShoulderFrame: {
        position: 'absolute',
        top: '28%',
        width: 194,
        height: 80,
        borderRadius: 34,
    },
    mannequinTorso: {
        position: 'absolute',
        top: '31%',
        width: 132,
        height: 142,
        borderTopLeftRadius: 48,
        borderTopRightRadius: 48,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    mannequinArm: {
        position: 'absolute',
        top: '34%',
        width: 28,
        height: 138,
        borderRadius: 18,
    },
    mannequinArmLeft: {
        left: '23%',
        transform: [{ rotate: '8deg' }],
    },
    mannequinArmRight: {
        right: '23%',
        transform: [{ rotate: '-8deg' }],
    },
    mannequinHip: {
        position: 'absolute',
        top: '60%',
        width: 104,
        height: 56,
        borderRadius: 22,
    },
    mannequinLeg: {
        position: 'absolute',
        top: '66%',
        width: 34,
        height: 112,
        borderRadius: 18,
    },
    mannequinLegLeft: {
        left: '43%',
        transform: [{ rotate: '1deg' }],
    },
    mannequinLegRight: {
        right: '43%',
        transform: [{ rotate: '-1deg' }],
    },
    mannequinFoot: {
        position: 'absolute',
        top: '90%',
        width: 44,
        height: 14,
        borderRadius: 8,
    },
    mannequinFootLeft: {
        left: '41%',
        transform: [{ rotate: '4deg' }],
    },
    mannequinFootRight: {
        right: '41%',
        transform: [{ rotate: '-4deg' }],
    },
    mannequinOverlay: {
        position: 'absolute',
    },
    overlaySelected: {
        borderWidth: 1,
        borderColor: 'rgba(201,168,76,0.32)',
        borderRadius: BorderRadius.md,
        backgroundColor: 'rgba(201,168,76,0.02)',
    },
    overlayTouchable: {
        width: '100%',
        height: '100%',
    },
    overlayImageFill: {
        width: '100%',
        height: '100%',
    },
    overlayLayer: {
        position: 'absolute',
    },
    tryOnLoadingBadge: {
        position: 'absolute',
        right: Spacing.md,
        top: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
        backgroundColor: 'rgba(26,26,46,0.78)',
    },
    tryOnLoadingText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '600',
    },
    styledPreviewMeta: {
        padding: Spacing.md,
    },
    styledPreviewTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    styledPreviewSubtitle: {
        fontSize: 12,
        marginTop: 4,
        lineHeight: 18,
    },
    mannequinHintText: {
        fontSize: 12,
        marginTop: Spacing.sm,
        lineHeight: 18,
    },
    canvasHintRow: {
        marginTop: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    canvasHintText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
    },
    canvasControls: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    canvasControlBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F6EDE0',
    },
    outfitItem: { alignItems: 'center', marginRight: 12, width: 85 },
    outfitItemImg: {
        width: 80,
        height: 96,
        borderRadius: 12,
        backgroundColor: Colors.cream,
    },
    outfitItemCat: { fontSize: 10, fontWeight: '600', marginTop: 4, textTransform: 'capitalize' },
    bestLookNote: {
        fontSize: 12,
        lineHeight: 18,
        marginTop: Spacing.md,
    },
    bannerActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: Spacing.md,
    },
    suggestedOutfitContainer: {
        marginTop: Spacing.md,
    },
    manualSwapGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        justifyContent: 'space-between',
    },
    swapItemCard: {
        width: '47%',
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.cream,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.lightGray,
    },
    swapItemImg: {
        width: '100%',
        height: 160,
    },
    swapItemMeta: {
        padding: 10,
        backgroundColor: Colors.white,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    swapItemCat: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    swapBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: '#FFF3D6',
    },
    swapBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.goldDark,
    },
    selectorModal: {
        flex: 1,
    },
    selectorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    selectorCloseBtn: {
        padding: 5,
    },
    selectorTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: FontFamily.bodyBold,
        textTransform: 'capitalize',
    },
    selectorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 15,
        gap: 15,
    },
    selectorCard: {
        width: '30%',
        borderRadius: 12,
        padding: 8,
        alignItems: 'center',
    },
    selectorImg: {
        width: '100%',
        height: 80,
        marginBottom: 8,
    },
    selectorName: {
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center',
    },
    lookPieceImgWrap: {
        alignItems: 'center',
        marginRight: 15,
    },
    lookPieceLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.darkGray,
        marginTop: 4,
        textTransform: 'capitalize',
    },
    generatedSection: {
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    generatedSectionHeader: {
        marginBottom: Spacing.md,
    },
    generatedSectionTitle: {
        ...Typography.heading3,
    },
    generatedSectionHint: {
        fontSize: 12,
        marginTop: 2,
    },
    generatedLookCard: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    generatedLookTitle: {
        fontSize: 15,
        fontWeight: '700',
        fontFamily: FontFamily.bodyBold,
    },
    generatedLookNote: {
        fontSize: 12,
        marginTop: 4,
        marginBottom: Spacing.sm,
        lineHeight: 18,
    },
    generatedLookStrip: {
        marginTop: Spacing.xs,
    },
    generatedLookItem: {
        width: 92,
        marginRight: Spacing.sm,
        alignItems: 'center',
    },
    generatedLookImage: {
        width: 88,
        height: 106,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.cream,
    },
    generatedLookLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 6,
        textAlign: 'center',
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
        fontFamily: FontFamily.bodySemiBold,
    },
    // Category pills
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: FontFamily.bodyBold,
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
    emptyFavsTitle: { fontSize: 18, fontWeight: '700', fontFamily: FontFamily.bodySemiBold },
    emptyFavsSub: { fontSize: 14, textAlign: 'center', fontFamily: FontFamily.body },
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
        fontFamily: FontFamily.bodyBold,
    },
    lookSubtitle: {
        fontSize: 11,
        marginTop: 2,
        fontFamily: FontFamily.body,
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
        backgroundColor: Colors.cream,
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
        backgroundColor: Colors.cream,
        marginRight: Spacing.sm,
    },
    seeOnCanvasBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gold,
        paddingVertical: 12,
        borderRadius: BorderRadius.round,
        marginTop: Spacing.lg,
        gap: 8,
    },
    seeOnCanvasBtnText: {
        color: Colors.white,
        fontFamily: FontFamily.bodyBold,
        fontSize: 14,
    },
    // Occasion chips and Score Pills
    occasionChipsStrip: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.sm,
        marginBottom: Spacing.md,
    },
    occasionChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    occasionChipActive: {
        backgroundColor: Colors.goldDark,
        borderColor: Colors.goldDark,
    },
    occasionChipText: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },
    occasionChipTextActive: {
        color: Colors.white,
    },
    scoreBreakdownRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.sm,
    },
    scorePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
    scoreDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    scoreText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.charcoal,
    },
});


