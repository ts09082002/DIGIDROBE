import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Image,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Modal,
    Pressable,
    Alert,
    Animated,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Colors, Typography, Spacing, BorderRadius, Shadows, FontFamily } from '../../constants/theme';
import {
    CANONICAL_TO_FILTER_PARAM,
    FILTER_TO_CANONICAL,
    normalizeCategory,
    CanonicalCategory,
} from '../../constants/categories';
import { WardrobeItem } from '../../services/api';
import * as wardrobeLocal from '../../services/wardrobe-local';
import * as ootdLocal from '../../services/ootd-local';

import { useTheme, useThemeColors } from '../../context/ThemeContext';
import { Toast } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import ScreenContainer from '../../components/ui/ScreenContainer';
import { SkeletonGrid } from '../../components/ui/SkeletonLoader';
import FullScreenLoader from '../../components/ui/FullScreenLoader';
import { enqueueAssets } from '../../services/processing-queue';
import { logEvent, logScreenView } from '../../services/analytics';
import ProcessingProgressBar from '../../components/ProcessingProgressBar';
import OnboardingOverlay from '../../components/ui/OnboardingOverlay';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;
const SUGGESTION_SECTION_PADDING = Spacing.lg;
const SUGGESTION_GRID_GAP = Spacing.sm;
const SUGGESTIONS_PAGE_SIZE = 6;
const SUGGESTIONS_MAX = 120;
const TARGET_WIDTH = 800;
const TARGET_ASPECT_RATIO = 4 / 5;

const CATEGORIES = ['All Items', 'Topwear', 'Bottoms', 'Outerwear', 'Footwear', 'Bags', 'Accessories'];

const FILTER_COLORS = ['Black', 'White', 'Blue', 'Red', 'Green', 'Pink', 'Brown', 'Gray', 'Navy', 'Beige', 'Yellow', 'Orange', 'Purple'];
const FILTER_SEASONS = ['Summer', 'Winter', 'Spring', 'Fall'];
const FILTER_OCCASIONS = ['Casual', 'Formal', 'Party', 'Work', 'Sports', 'Date Night'];

type SuggestionItem = {
    id: string;
    name: string;
    brand: string;
    imageUrl: string;
    backendCategory: string;
};

const getSuggestionFallbackImage = (item: SuggestionItem) =>
    `https://placehold.co/600x750/F5F1E8/7A6A58.png?text=${encodeURIComponent(item.name)}`;

const SECTION_SUGGESTIONS: Record<CanonicalCategory, SuggestionItem[]> = {
    topwear: [
        { id: 't1', name: 'Classic White Tee', brand: 'Essentials', imageUrl: 'https://pngimg.com/d/tshirt_PNG5448.png', backendCategory: 'tops' },
        { id: 't2', name: 'Crew Neck T-Shirt', brand: 'Core', imageUrl: 'https://pngimg.com/d/tshirt_PNG5447.png', backendCategory: 'tops' },
        { id: 't3', name: 'Striped Shirt', brand: 'Urban', imageUrl: 'https://pngimg.com/d/shirt_PNG6918.png', backendCategory: 'tops' },
        { id: 't4', name: 'Girls Soft Top', brand: 'Bloom', imageUrl: 'https://pngimg.com/d/top_PNG39.png', backendCategory: 'tops' },
    ],
    bottomwear: [
        { id: 'b1', name: 'Blue Denim Jeans', brand: 'Denim Co', imageUrl: 'https://pngimg.com/d/jeans_PNG5754.png', backendCategory: 'bottoms' },
        { id: 'b2', name: 'Slim Fit Jeans', brand: 'Denim Co', imageUrl: 'https://pngimg.com/d/jeans_PNG5749.png', backendCategory: 'bottoms' },
        { id: 'b3', name: 'Formal Trousers', brand: 'Tailor', imageUrl: 'https://pngimg.com/d/trousers_PNG68.png', backendCategory: 'bottoms' },
        { id: 'b4', name: 'Pleated Skirt', brand: 'Bloom', imageUrl: 'https://pngimg.com/d/skirt_PNG35.png', backendCategory: 'bottoms' },
    ],
    outerwear: [
        { id: 'o1', name: 'Wool Blend Coat', brand: 'Atelier', imageUrl: 'https://pngimg.com/d/coat_PNG24.png', backendCategory: 'outerwear' },
        { id: 'o2', name: 'Longline Coat', brand: 'Atelier', imageUrl: 'https://pngimg.com/d/coat_PNG8.png', backendCategory: 'outerwear' },
        { id: 'o3', name: 'Denim Jacket', brand: 'Street', imageUrl: 'https://pngimg.com/d/jacket_PNG8058.png', backendCategory: 'outerwear' },
        { id: 'o4', name: 'Casual Blazer', brand: 'Monarch', imageUrl: 'https://pngimg.com/d/blazer_PNG16.png', backendCategory: 'outerwear' },
    ],
    footwear: [
        { id: 's1', name: 'Everyday Sneakers', brand: 'Move', imageUrl: 'https://pngimg.com/d/running_shoes_PNG5825.png', backendCategory: 'footwear' },
        { id: 's2', name: 'White Sneakers', brand: 'Move', imageUrl: 'https://pngimg.com/d/running_shoes_PNG5824.png', backendCategory: 'footwear' },
        { id: 's3', name: 'Ankle Boots', brand: 'Stride', imageUrl: 'https://pngimg.com/d/boots_PNG37.png', backendCategory: 'footwear' },
        { id: 's4', name: 'Flat Sandals', brand: 'Coast', imageUrl: 'https://pngimg.com/d/sandals_PNG26.png', backendCategory: 'footwear' },
    ],
    dresses: [
        { id: 'd1', name: 'Summer Dress', brand: 'Bloom', imageUrl: 'https://pngimg.com/d/dress_PNG8614.png', backendCategory: 'dresses' },
        { id: 'd2', name: 'Evening Gown', brand: 'Atelier', imageUrl: 'https://pngimg.com/d/dress_PNG8597.png', backendCategory: 'dresses' },
    ],
    bags: [
        { id: 'bg1', name: 'Leather Handbag', brand: 'Muse', imageUrl: 'https://pngimg.com/d/handbag_PNG6394.png', backendCategory: 'bags' },
        { id: 'bg2', name: 'Mini Shoulder Bag', brand: 'Muse', imageUrl: 'https://pngimg.com/d/handbag_PNG6388.png', backendCategory: 'bags' },
    ],
    accessories: [
        { id: 'acc1', name: 'Classic Belt', brand: 'Line', imageUrl: 'https://pngimg.com/d/belt_PNG9592.png', backendCategory: 'accessories' },
        { id: 'acc2', name: 'Winter Scarf', brand: 'Cloud', imageUrl: 'https://pngimg.com/d/scarf_PNG28.png', backendCategory: 'accessories' },
    ],
    unclassified: [],
};

export default function WardrobeScreen() {
    const { isDarkMode } = useTheme();
    const tc = useThemeColors();
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('All Items');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
    const [uploadOptionsVisible, setUploadOptionsVisible] = useState(false);

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [tagPickerVisible, setTagPickerVisible] = useState(false);
    const [tagPickerItemId, setTagPickerItemId] = useState<string | null>(null);
    const [bulkMoveItemIds, setBulkMoveItemIds] = useState<string[]>([]);
    const [pickerCategory, setPickerCategory] = useState('');
    const [tagPickerMode, setTagPickerMode] = useState<'tag' | 'move'>('tag');
    const [savingTag, setSavingTag] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [suggestionVisibleCount, setSuggestionVisibleCount] = useState(SUGGESTIONS_PAGE_SIZE);
    const [failedSuggestionIds, setFailedSuggestionIds] = useState<string[]>([]);
    const [fallbackSuggestionIds, setFallbackSuggestionIds] = useState<string[]>([]);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sequential processing queue progress
    const [queueProgress, setQueueProgress] = useState<{ current: number; total: number; done: boolean } | null>(null);

    // Filter states (replaces search)
    const [filterSheetVisible, setFilterSheetVisible] = useState(false);
    const [filterColors, setFilterColors] = useState<string[]>([]);
    const [filterSeasons, setFilterSeasons] = useState<string[]>([]);
    const [filterOccasions, setFilterOccasions] = useState<string[]>([]);
    const [filterFavoritesOnly, setFilterFavoritesOnly] = useState(false);
    // Applied filters (only applied when user taps "Apply")
    const [appliedFilters, setAppliedFilters] = useState<{
        colors: string[];
        seasons: string[];
        occasions: string[];
        favoritesOnly: boolean;
    }>({ colors: [], seasons: [], occasions: [], favoritesOnly: false });

    const activeFilterCount = appliedFilters.colors.length + appliedFilters.seasons.length + appliedFilters.occasions.length + (appliedFilters.favoritesOnly ? 1 : 0);

    // Floating selection bar animation
    const selectionBarAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(selectionBarAnim, {
            toValue: selectionMode && selectedItemIds.length > 0 ? 1 : 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
        }).start();
    }, [selectionMode, selectedItemIds.length]);

    // In-memory cache for wardrobe items (30s TTL)
    const itemsCache = useRef<Map<string, { data: WardrobeItem[]; time: number }>>(new Map());
    const CACHE_TTL = 30_000;

    const toggleFilterChip = (value: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    };

    const applyFilters = () => {
        setAppliedFilters({
            colors: filterColors,
            seasons: filterSeasons,
            occasions: filterOccasions,
            favoritesOnly: filterFavoritesOnly,
        });
        setFilterSheetVisible(false);
        invalidateCache();
    };

    const resetFilters = () => {
        setFilterColors([]);
        setFilterSeasons([]);
        setFilterOccasions([]);
        setFilterFavoritesOnly(false);
        setAppliedFilters({ colors: [], seasons: [], occasions: [], favoritesOnly: false });
        setFilterSheetVisible(false);
        invalidateCache();
    };

    const openFilterSheet = () => {
        // Sync temp filter states with applied
        setFilterColors([...appliedFilters.colors]);
        setFilterSeasons([...appliedFilters.seasons]);
        setFilterOccasions([...appliedFilters.occasions]);
        setFilterFavoritesOnly(appliedFilters.favoritesOnly);
        setFilterSheetVisible(true);
    };

    const AI_CATEGORIES = [
        { label: 'Topwear', value: 'topwear' },
        { label: 'Bottomwear', value: 'bottomwear' },
        { label: 'Outerwear', value: 'outerwear' },
        { label: 'Footwear', value: 'footwear' },
        { label: 'Accessories', value: 'accessories' },
    ];

    const openTagPicker = (item: WardrobeItem) => {
        setTagPickerMode('tag');
        setTagPickerItemId(item.id);
        setBulkMoveItemIds([]);
        const normalized = normalizeCategory(item.category);
        setPickerCategory(normalized !== 'unclassified' ? normalized : '');
        setTagPickerVisible(true);
    };

    const openBulkMovePicker = () => {
        if (!selectedItemIds.length) return;
        setTagPickerMode('move');
        setTagPickerItemId(null);
        setBulkMoveItemIds(selectedItemIds);
        setPickerCategory('');
        setTagPickerVisible(true);
    };

    const closeTagPicker = () => {
        setTagPickerVisible(false);
        setTagPickerItemId(null);
        setBulkMoveItemIds([]);
        setPickerCategory('');
    };

    const toggleSelectionMode = () => {
        if (selectionMode) {
            setSelectionMode(false);
            setSelectedItemIds([]);
            return;
        }
        setSelectionMode(true);
    };

    const toggleSelectItem = (id: string) => {
        setSelectedItemIds((prev) => {
            const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            if (next.length === 0) setSelectionMode(false);
            return next;
        });
    };

    const beginMultiSelectFromItem = (id: string) => {
        if (!selectionMode) setSelectionMode(true);
        setSelectedItemIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };

    const saveTag = async () => {
        if (!pickerCategory) return;
        try {
            setSavingTag(true);
            const canonicalCategory = pickerCategory as CanonicalCategory;
            const backendCategory = CANONICAL_TO_FILTER_PARAM[canonicalCategory];
            const targetIds =
                tagPickerMode === 'move' && bulkMoveItemIds.length > 0
                    ? bulkMoveItemIds
                    : (tagPickerItemId ? [tagPickerItemId] : []);
            if (!targetIds.length) return;

            const updates = await Promise.all(
                targetIds.map((id) =>
                    wardrobeLocal.updateItem(id, {
                        category: backendCategory,
                        isLowConfidence: false,
                    }),
                ),
            );

            const normalizedMap = new Map(
                updates.map((updated) => [
                    updated.id,
                    { ...updated, category: normalizeCategory(updated.category) } as WardrobeItem,
                ]),
            );

            setItems((prev) => prev.map((i) => normalizedMap.get(i.id) ?? i));
            setSelectedItem((prev) => (prev ? (normalizedMap.get(prev.id) ?? prev) : prev));
            closeTagPicker();

            if (tagPickerMode === 'move' && bulkMoveItemIds.length > 0) {
                setToastType('success');
                setToastMessage(`${bulkMoveItemIds.length} items moved successfully`);
                setToastVisible(true);
                setSelectionMode(false);
                setSelectedItemIds([]);
                invalidateCache();
                await loadItems(true);
            } else {
                setToastType('success');
                setToastMessage(tagPickerMode === 'move' ? 'Item moved successfully' : 'Item category updated');
                setToastVisible(true);
                if (tagPickerMode === 'move') {
                    invalidateCache();
                    await loadItems(true);
                }
            }
        } catch (e: any) {
            setToastType('error');
            setToastMessage(e?.message || (tagPickerMode === 'move' ? 'Could not move item' : 'Could not save tag'));
            setToastVisible(true);
        } finally {
            setSavingTag(false);
        }
    };

    // imageBg mapped to tc.surface for dark/light image backgrounds
    const imageBg = tc.surface;

    const currentFilterCanonical = (FILTER_TO_CANONICAL[selectedCategory] ?? 'all') as CanonicalCategory | 'all';
    const suggestionPool = useMemo(() => {
        const base =
            currentFilterCanonical === 'all'
                ? Object.values(SECTION_SUGGESTIONS).flat()
                : SECTION_SUGGESTIONS[currentFilterCanonical] || [];

        return Array.from(
            new Map(base.map((item) => [`${item.backendCategory}-${item.imageUrl}`, item])).values(),
        );
    }, [currentFilterCanonical]);
    const visibleSuggestions = useMemo(
        () => suggestionPool.slice(0, suggestionVisibleCount),
        [suggestionPool, suggestionVisibleCount],
    );
    const hasMoreSuggestions = suggestionVisibleCount < Math.min(SUGGESTIONS_MAX, suggestionPool.length);

    useEffect(() => {
        setSuggestionVisibleCount(SUGGESTIONS_PAGE_SIZE);
        setFailedSuggestionIds([]);
        setFallbackSuggestionIds([]);
    }, [currentFilterCanonical]);

    const loadMoreSuggestions = useCallback(() => {
        if (!hasMoreSuggestions) return;
        setSuggestionVisibleCount((prev) =>
            Math.min(prev + SUGGESTIONS_PAGE_SIZE, Math.min(SUGGESTIONS_MAX, suggestionPool.length)),
        );
    }, [hasMoreSuggestions, suggestionPool.length]);

    const loadItems = useCallback(async (bypassCache = false) => {
        try {
            const selectedCanonical = FILTER_TO_CANONICAL[selectedCategory] ?? 'all';
            const filterKey = `${appliedFilters.colors.join(',')}|${appliedFilters.seasons.join(',')}|${appliedFilters.occasions.join(',')}|${appliedFilters.favoritesOnly}`;
            const cacheKey = `${selectedCanonical}|${filterKey}`;

            // Check cache first (unless bypassed)
            if (!bypassCache) {
                const cached = itemsCache.current.get(cacheKey);
                if (cached && Date.now() - cached.time < CACHE_TTL) {
                    setItems(cached.data);
                    return;
                }
            }

            setLoading(true);
            const data = await wardrobeLocal.getAllItems({
                category: CANONICAL_TO_FILTER_PARAM[selectedCanonical],
                favorite: appliedFilters.favoritesOnly ? 'true' : undefined,
            });
            let normalized = data.map((item) => ({
                ...item,
                category: normalizeCategory(item.category),
            }));

            // Client-side filtering for color, season, occasion
            if (appliedFilters.colors.length > 0) {
                normalized = normalized.filter(item => {
                    const itemColor = (item.color || '').toLowerCase();
                    return appliedFilters.colors.some(c => itemColor.includes(c.toLowerCase()));
                });
            }
            if (appliedFilters.seasons.length > 0) {
                normalized = normalized.filter(item => {
                    const itemSeasons = (item.season || []).map((s: string) => s.toLowerCase());
                    return appliedFilters.seasons.some(s => itemSeasons.includes(s.toLowerCase()));
                });
            }
            if (appliedFilters.occasions.length > 0) {
                normalized = normalized.filter(item => {
                    const itemOccasions = (item.occasion || []).map((o: string) => o.toLowerCase());
                    return appliedFilters.occasions.some(o => itemOccasions.includes(o.toLowerCase()));
                });
            }

            setItems(normalized);

            // Store in cache
            itemsCache.current.set(cacheKey, { data: normalized, time: Date.now() });
        } catch (e: any) {
            console.log('Failed to load items:', e);
            setToastType('error');
            setToastMessage(
                e?.message?.includes('Network request failed') || e?.message?.includes('fetch')
                    ? 'Cannot reach server. Make sure the backend is running.'
                    : `Could not load wardrobe: ${e?.message || 'Unknown error'}`,
            );
            setToastVisible(true);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, appliedFilters]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    useFocusEffect(useCallback(() => {
        logScreenView('Wardrobe', 'WardrobeScreen');
    }, []));

    const invalidateCache = useCallback(() => {
        itemsCache.current.clear();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        invalidateCache();
        await loadItems(true);
        setRefreshing(false);
    };

    const autoCropAndResize = async (
        uri: string,
        originalWidth?: number,
        originalHeight?: number,
    ): Promise<string> => {
        const actions: any[] = [];

        if (originalWidth && originalHeight) {
            const aspect = originalWidth / originalHeight;

            if (Math.abs(aspect - TARGET_ASPECT_RATIO) > 0.01) {
                let cropWidth = originalWidth;
                let cropHeight = originalHeight;
                let originX = 0;
                let originY = 0;

                if (aspect > TARGET_ASPECT_RATIO) {
                    cropWidth = Math.round(originalHeight * TARGET_ASPECT_RATIO);
                    originX = Math.round((originalWidth - cropWidth) / 2);
                } else {
                    cropHeight = Math.round(originalWidth / TARGET_ASPECT_RATIO);
                    originY = Math.round((originalHeight - cropHeight) / 2);
                }

                actions.push({
                    crop: {
                        originX,
                        originY,
                        width: cropWidth,
                        height: cropHeight,
                    },
                });
            }
        }

        if (originalWidth && originalWidth > TARGET_WIDTH) {
            actions.push({ resize: { width: TARGET_WIDTH } });
        }

        if (!actions.length) {
            return uri;
        }

        const manipulated = await ImageManipulator.manipulateAsync(
            uri,
            actions,
            { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
        );

        return manipulated.uri;
    };

    const getPreferredUploadCategory = (): string | undefined => {
        const selectedCanonical = FILTER_TO_CANONICAL[selectedCategory] ?? 'all';
        if (selectedCanonical === 'all') return undefined;
        return CANONICAL_TO_FILTER_PARAM[selectedCanonical];
    };

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const uploadAssets = async (assets: ImagePicker.ImagePickerAsset[], source: 'gallery' | 'camera') => {
        if (!assets.length) return;

        const preferredCategoryFromFilter = getPreferredUploadCategory();

        // Pre-crop/resize all assets to their upload URIs first (fast, no GPU saturation)
        const prepared = await Promise.all(
            assets.map(async (asset) => ({
                uri: await autoCropAndResize(asset.uri, asset.width, asset.height),
                filename: asset.fileName || `${source}_photo.jpg`,
                preferredCategory: preferredCategoryFromFilter,
            }))
        );

        const start = Date.now();

        // Show the progress bar immediately
        setQueueProgress({ current: 0, total: prepared.length, done: false });

        enqueueAssets(prepared, {
            onProgress: (current, total) => {
                setQueueProgress({ current, total, done: false });
            },
            onItemComplete: (item) => {
                // Prepend each finished item to the list immediately
                invalidateCache();
                setItems((prev) => [item, ...prev]);
            },
            onQueueComplete: (items) => {
                const elapsed = Date.now() - start;
                console.log(`[Queue] Batch (${source}) done in ${elapsed}ms — ${items.length} item(s)`);

                setQueueProgress((prev) => prev ? { ...prev, done: true } : null);
                // Unmount the progress bar after the component's own 2 s dismiss animation
                setTimeout(() => setQueueProgress(null), 3000);

                if (items.length > 0) {
                    logEvent('add_item', {
                        source,
                        count: items.length,
                        category: items[0]?.category ?? 'unknown',
                    });
                    setToastType('success');
                    setToastMessage(
                        items.length === 1
                            ? '1 item added'
                            : `${items.length} items added`,
                    );
                    setToastVisible(true);
                }
            },
            onError: (jobId, error) => {
                console.warn(`[Queue] Job ${jobId} failed:`, error.message);
                // Individual job failure is silent — queue continues.
                // If ALL jobs fail, onQueueComplete still fires with an empty array.
            },
        });
    };

    const handleUpload = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 1,
                allowsMultipleSelection: true,
                orderedSelection: true,
                selectionLimit: 15,
            });

            if (result.canceled || !result.assets.length) return;

            setUploading(true);
            await uploadAssets(result.assets, 'gallery');
        } catch (error: any) {
            setToastType('error');
            setToastMessage(error.message || 'Upload failed');
            setToastVisible(true);
        } finally {
            setUploading(false);
        }
    };

    const askCaptureAnotherPhoto = () =>
        new Promise<boolean>((resolve) => {
            Alert.alert(
                'Add another photo?',
                'You can capture multiple clothing photos and upload them together.',
                [
                    {
                        text: 'Upload now',
                        onPress: () => resolve(false),
                    },
                    {
                        text: 'Add another',
                        onPress: () => resolve(true),
                    },
                ],
                {
                    cancelable: false,
                },
            );
        });

    const handleCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                setToastType('error');
                setToastMessage('Camera permission is needed to take photos.');
                setToastVisible(true);
                return;
            }

            const capturedAssets: ImagePicker.ImagePickerAsset[] = [];
            let captureMore = true;

            while (captureMore) {
                const result = await ImagePicker.launchCameraAsync({
                    allowsEditing: false,
                    quality: 0.8,
                });

                if (result.canceled || !result.assets[0]) {
                    // If at least one shot already exists, continue with upload.
                    if (capturedAssets.length > 0) {
                        break;
                    }
                    return;
                }

                capturedAssets.push(result.assets[0]);

                if (capturedAssets.length >= 15) {
                    setToastType('info');
                    setToastMessage('Maximum 15 photos can be uploaded at once');
                    setToastVisible(true);
                    break;
                }

                captureMore = await askCaptureAnotherPhoto();
            }

            if (!capturedAssets.length) return;

            setUploading(true);
            await uploadAssets(capturedAssets, 'camera');
        } catch (error: any) {
            setToastType('error');
            setToastMessage(error.message || 'Something went wrong');
            setToastVisible(true);
        } finally {
            setUploading(false);
        }
    };

    const handleToggleFavorite = async (id: string) => {
        try {
            await wardrobeLocal.toggleFavorite(id);
            setItems(prev =>
                prev.map(item =>
                    item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
                )
            );
        } catch (e) {
            console.log('Toggle failed:', e);
        }
    };

    const showUploadOptions = () => {
        setUploadOptionsVisible(true);
    };

    const addSuggestionToWardrobe = async (suggestion: SuggestionItem) => {
        try {
            setUploading(true);
            const selectedCanonical = FILTER_TO_CANONICAL[selectedCategory] ?? 'all';
            const targetCategory =
                selectedCanonical === 'all'
                    ? suggestion.backendCategory
                    : CANONICAL_TO_FILTER_PARAM[selectedCanonical];

            const newItem = await wardrobeLocal.createItemManual({
                originalUrl: suggestion.imageUrl,
                processedUrl: suggestion.imageUrl,
                category: targetCategory,
                name: suggestion.name,
                brand: suggestion.brand,
                mimeType: 'image/png',
                size: 0,
                status: 'done',
                isFavorite: false,
            });
            const normalized = {
                ...newItem,
                category: normalizeCategory(newItem.category),
            };
            setItems((prev) => [normalized, ...prev]);
            setToastType('success');
            setToastMessage(`${suggestion.name} added to ${selectedCategory}`);
            setToastVisible(true);
        } catch (e: any) {
            setToastType('error');
            setToastMessage(e?.message || 'Could not add suggested item');
            setToastVisible(true);
        } finally {
            setUploading(false);
        }
    };

    const openItem = (item: WardrobeItem) => {
        setSelectedItem(item);
        setEditingName(false);
        setNameInput(item.name || '');
    };

    const renderItem = ({ item }: { item: WardrobeItem }) => (
        <TouchableOpacity
            style={[
                styles.card,
                { backgroundColor: 'transparent', padding: 0, borderWidth: 0, shadowOpacity: 0, elevation: 0 },
            ]}
            onPress={() => {
                if (selectionMode) {
                    toggleSelectItem(item.id);
                    return;
                }
                openItem(item);
            }}
            onLongPress={() => beginMultiSelectFromItem(item.id)}
            activeOpacity={0.9}
        >
            <View style={{
                width: '100%',
                aspectRatio: 0.82,
                backgroundColor: tc.surface,
                borderRadius: 16,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
            }}>
                <Image
                    source={{ uri: item.processedUrl || item.originalUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                />
                {!selectionMode && (
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => handleToggleFavorite(item.id)}
                    >
                        <Ionicons
                            name={item.isFavorite ? 'heart' : 'heart'}
                            size={16}
                            color={item.isFavorite ? tc.accent : Colors.white}
                        />
                    </TouchableOpacity>
                )}
                {selectionMode && (
                    <View style={styles.selectedBadge}>
                        <Ionicons
                            name={selectedItemIds.includes(item.id) ? 'checkmark-circle' : 'ellipse-outline'}
                            size={22}
                            color={selectedItemIds.includes(item.id) ? tc.accent : Colors.mediumGray}
                        />
                    </View>
                )}
            </View>
            <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 9, color: tc.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700', marginBottom: 2 }} numberOfLines={1}>
                    {item.brand || item.subCategory || 'AURA STUDIO'}
                </Text>
                <Text style={{ fontSize: 13, color: tc.textPrimary, fontWeight: '500' }} numberOfLines={1}>
                    {item.name || 'Untitled Item'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderSuggestion = ({ item }: { item: SuggestionItem }) => (
        <View style={[styles.suggestionCard, { backgroundColor: tc.card }]}>
            <Image
                source={{
                    uri: fallbackSuggestionIds.includes(item.id)
                        ? getSuggestionFallbackImage(item)
                        : item.imageUrl,
                }}
                style={[styles.suggestionImage, { backgroundColor: 'transparent' }]}
                resizeMode="contain"
                onError={() => {
                    if (!failedSuggestionIds.includes(item.id)) {
                        setFailedSuggestionIds((prev) => [...prev, item.id]);
                        setFallbackSuggestionIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
                    }
                }}
            />
            <View style={styles.suggestionInfo}>
                {item.brand ? (
                    <Text style={[styles.suggestionBrand, { color: tc.textPrimary }]} numberOfLines={1}>
                        {item.brand}
                    </Text>
                ) : null}
                <Text style={[styles.suggestionName, { color: tc.textSecondary }]} numberOfLines={1}>
                    {item.name}
                </Text>
                <TouchableOpacity
                    style={styles.suggestionAddBtn}
                    onPress={() => addSuggestionToWardrobe(item)}
                >
                    <Ionicons name="add" size={14} color={Colors.white} />
                    <Text style={styles.suggestionAddBtnText}>Add</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSuggestionsSection = (insideList: boolean = false) => {
        return null;
        return (
            <View style={[styles.suggestionsSection, insideList && styles.suggestionsSectionInList]}>
                <View style={styles.suggestionsHeaderRow}>
                    <Text style={[styles.suggestionsTitle, { color: tc.textPrimary }]}>
                        Suggested To Add
                    </Text>
                    <Text style={[styles.suggestionsHint, { color: tc.textSecondary }]}>
                        PNG cutouts, ready to add
                    </Text>
                </View>
                <View style={styles.suggestionsGridTwo}>
                    {visibleSuggestions.map((item) => (
                        <View key={item.id} style={styles.suggestionGridItem}>
                            {renderSuggestion({ item })}
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <ScreenContainer>
            {/* Header with Edit + Filter */}
            <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="sparkles" size={20} color={tc.accent} />
                    <Text style={[{ color: tc.textPrimary, fontSize: 24, fontWeight: '700', fontFamily: FontFamily.heading }]}>Wardrobe</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={toggleSelectionMode}
                        style={[{ paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm }]}
                    >
                        <Text style={[styles.headerTextBtnLabel, { color: tc.accent }]}>
                            {selectionMode ? 'Done' : 'Edit'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={openFilterSheet}
                        style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm }]}
                    >
                        <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? tc.accent : tc.textSecondary} />
                        {activeFilterCount > 0 && (
                            <View style={[styles.filterBadge, { backgroundColor: tc.accent }]}>
                                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Category Filters */}
            <FlatList
                horizontal
                data={CATEGORIES}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.categoryChip,
                            { 
                                backgroundColor: selectedCategory === item ? tc.accent : tc.card, 
                                borderWidth: 0,
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 20
                            },
                        ]}
                        onPress={() => setSelectedCategory(item)}
                    >
                        {item === 'All Items' && <Ionicons name="grid" size={14} color={selectedCategory === item ? Colors.white : tc.textSecondary} style={{ marginRight: 6 }} />}
                        {item === 'Topwear' && <Ionicons name="body-outline" size={14} color={selectedCategory === item ? Colors.white : tc.textSecondary} style={{ marginRight: 6 }} />}
                        {item === 'Bottoms' && <Ionicons name="shirt-outline" size={14} color={selectedCategory === item ? Colors.white : tc.textSecondary} style={{ marginRight: 6 }} />}
                        {item === 'Outerwear' && <Ionicons name="snow-outline" size={14} color={selectedCategory === item ? Colors.white : tc.textSecondary} style={{ marginRight: 6 }} />}
                        {item === 'Dresses' && <Ionicons name="woman-outline" size={14} color={selectedCategory === item ? Colors.white : tc.textSecondary} style={{ marginRight: 6 }} />}
                        {item === 'Footwear' && <Ionicons name="footsteps-outline" size={14} color={selectedCategory === item ? Colors.white : tc.textSecondary} style={{ marginRight: 6 }} />}
                        {item === 'Bags' && <Ionicons name="bag-outline" size={14} color={selectedCategory === item ? Colors.white : tc.textSecondary} style={{ marginRight: 6 }} />}
                        {item === 'Accessories' && <Ionicons name="watch-outline" size={14} color={selectedCategory === item ? Colors.white : tc.textSecondary} style={{ marginRight: 6 }} />}
                        <Text
                            style={[
                                styles.categoryChipText,
                                { 
                                    color: selectedCategory === item ? Colors.white : tc.textSecondary,
                                    fontWeight: selectedCategory === item ? '700' : '500',
                                    fontSize: 12
                                },
                            ]}
                        >
                            {item === 'All Items' ? 'All' : item}
                        </Text>
                    </TouchableOpacity>
                )}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.categoriesContainer, { marginTop: 0, paddingBottom: Spacing.md }]}
            />

            {/* Active filter tags (dismissible) */}
            {activeFilterCount > 0 && (
                <View style={styles.activeFiltersRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: 6 }}>
                        {appliedFilters.favoritesOnly && (
                            <TouchableOpacity
                                style={[styles.activeFilterTag, { backgroundColor: tc.accentLight, borderColor: tc.accent }]}
                                onPress={() => setAppliedFilters(prev => ({ ...prev, favoritesOnly: false }))}
                            >
                                <Ionicons name="heart" size={12} color={tc.accent} />
                                <Text style={[styles.activeFilterTagText, { color: tc.accent }]}>Favorites</Text>
                                <Ionicons name="close-circle" size={14} color={tc.accent} />
                            </TouchableOpacity>
                        )}
                        {appliedFilters.colors.map(c => (
                            <TouchableOpacity
                                key={c}
                                style={[styles.activeFilterTag, { backgroundColor: tc.accentLight, borderColor: tc.accent }]}
                                onPress={() => {
                                    setAppliedFilters(prev => ({ ...prev, colors: prev.colors.filter(x => x !== c) }));
                                    invalidateCache();
                                }}
                            >
                                <View style={[styles.filterColorDot, { width: 10, height: 10, borderRadius: 5, backgroundColor: c.toLowerCase() === 'beige' ? '#F5DEB3' : c.toLowerCase() === 'navy' ? '#000080' : c.toLowerCase() }]} />
                                <Text style={[styles.activeFilterTagText, { color: tc.accent }]}>{c}</Text>
                                <Ionicons name="close-circle" size={14} color={tc.accent} />
                            </TouchableOpacity>
                        ))}
                        {appliedFilters.seasons.map(s => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.activeFilterTag, { backgroundColor: tc.accentLight, borderColor: tc.accent }]}
                                onPress={() => {
                                    setAppliedFilters(prev => ({ ...prev, seasons: prev.seasons.filter(x => x !== s) }));
                                    invalidateCache();
                                }}
                            >
                                <Text style={[styles.activeFilterTagText, { color: tc.accent }]}>{s}</Text>
                                <Ionicons name="close-circle" size={14} color={tc.accent} />
                            </TouchableOpacity>
                        ))}
                        {appliedFilters.occasions.map(o => (
                            <TouchableOpacity
                                key={o}
                                style={[styles.activeFilterTag, { backgroundColor: tc.accentLight, borderColor: tc.accent }]}
                                onPress={() => {
                                    setAppliedFilters(prev => ({ ...prev, occasions: prev.occasions.filter(x => x !== o) }));
                                    invalidateCache();
                                }}
                            >
                                <Text style={[styles.activeFilterTagText, { color: tc.accent }]}>{o}</Text>
                                <Ionicons name="close-circle" size={14} color={tc.accent} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <FullScreenLoader visible={uploading} message="Preparing images..." />
            <FullScreenLoader visible={isDeleting} message="Deleting item..." />

            {/* Sequential queue progress bar */}
            {queueProgress && (
                <ProcessingProgressBar
                    current={queueProgress.current}
                    total={queueProgress.total}
                    done={queueProgress.done}
                />
            )}

            {/* Items Grid */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <SkeletonGrid count={6} />
                </View>
            ) : items.length === 0 ? (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.emptyScrollContainer}
                    scrollEventThrottle={16}
                    onScroll={({ nativeEvent }) => {
                        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                        const nearBottom =
                            layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;
                        if (nearBottom) loadMoreSuggestions();
                    }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
                    }
                >
                    <View style={styles.uploadedSectionHeader}>
                        <Text style={[styles.uploadedSectionTitle, { color: tc.textPrimary }]}>Uploaded Items</Text>
                        <Text style={[styles.uploadedSectionCount, { color: tc.textSecondary }]}>0</Text>
                    </View>
                    <View style={styles.emptyHeaderContainer}>
                        <Ionicons name="shirt-outline" size={50} color={Colors.lightGray} />
                        <Text style={[styles.emptyTitle, { color: tc.textPrimary }]}>Your wardrobe is empty</Text>
                        <Text style={[styles.emptySubtitle, { color: tc.textSecondary }]}>
                            Tap the + button to add your first clothing item, or get inspired by these staples!
                        </Text>
                    </View>
                    {renderSuggestionsSection(false)}
                </ScrollView>
            ) : (
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    extraData={{ selectionMode, selectedItemIds }}
                    contentContainerStyle={styles.gridContainer}
                    columnWrapperStyle={styles.gridRow}
                    showsVerticalScrollIndicator={false}
                    onEndReachedThreshold={0.25}
                    onEndReached={loadMoreSuggestions}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={8}
                    getItemLayout={(_data, index) => ({
                        length: CARD_WIDTH * TARGET_ASPECT_RATIO + Spacing.md,
                        offset: (CARD_WIDTH * TARGET_ASPECT_RATIO + Spacing.md) * Math.floor(index / 2),
                        index,
                    })}
                    ListHeaderComponent={<View style={{ height: Spacing.md }} />}
                    ListFooterComponent={
                        <View>
                            {renderSuggestionsSection(true)}
                            {hasMoreSuggestions ? (
                                <View style={styles.suggestionLoader}>
                                    <ActivityIndicator size="small" color={Colors.gold} />
                                    <Text style={styles.suggestionLoaderText}>Loading more suggestions...</Text>
                                </View>
                            ) : (
                                <View style={styles.suggestionLoader}>
                                    <Text style={styles.suggestionLoaderText}>No more unique suggestions</Text>
                                </View>
                            )}
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
                    }
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: tc.accent }]}
                onPress={showUploadOptions}
                accessibilityRole="button"
                accessibilityLabel="Add clothing item"
            >
                <Ionicons name="add" size={28} color={Colors.white} />
            </TouchableOpacity>

            {/* Upload Options Modal */}
            <Modal
                visible={uploadOptionsVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setUploadOptionsVisible(false)}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setUploadOptionsVisible(false)}
                >
                    <View style={[styles.bottomSheetContainer, { backgroundColor: tc.card }]}>
                        <View style={styles.bottomSheetHandle} />
                        <Text style={[styles.bottomSheetTitle, { color: tc.textPrimary }]}>Add Clothing</Text>
                        <Text style={[styles.bottomSheetSubtitle, { color: tc.textSecondary }]}>
                            {selectedCategory === 'All Items'
                                ? 'Choose how to add your clothing item'
                                : `Items will be added to ${selectedCategory}`}
                        </Text>

                        <View style={styles.bottomSheetActions}>
                            <TouchableOpacity
                                style={[styles.bottomSheetAction, { backgroundColor: tc.surface }]}
                                onPress={() => {
                                    setUploadOptionsVisible(false);
                                    handleCamera();
                                }}
                            >
                                <View style={styles.bottomSheetIconCircle}>
                                    <Ionicons name="camera" size={22} color={Colors.white} />
                                </View>
                                <View style={styles.bottomSheetActionTextContainer}>
                                    <Text style={[styles.bottomSheetActionTitle, { color: tc.textPrimary }]}>Take Photo</Text>
                                    <Text style={[styles.bottomSheetActionSubtitle, { color: tc.textSecondary }]}>Use your camera to capture</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.bottomSheetAction, { backgroundColor: tc.surface }]}
                                onPress={() => {
                                    setUploadOptionsVisible(false);
                                    handleUpload();
                                }}
                            >
                                <View style={styles.bottomSheetIconCircle}>
                                    <Ionicons name="images" size={22} color={Colors.white} />
                                </View>
                                <View style={styles.bottomSheetActionTextContainer}>
                                    <Text style={[styles.bottomSheetActionTitle, { color: tc.textPrimary }]}>Choose from Gallery</Text>
                                    <Text style={[styles.bottomSheetActionSubtitle, { color: tc.textSecondary }]}>Pick one or more photos</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.bottomSheetCancel}
                                onPress={() => setUploadOptionsVisible(false)}
                            >
                                <Text style={[styles.bottomSheetCancelText, { color: tc.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>

            {/* Item Detail Modal */}
            <Modal
                visible={!!selectedItem}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedItem(null)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setSelectedItem(null)}
                >
                    <View style={[styles.modalContent, { backgroundColor: tc.card }]}>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setSelectedItem(null)}
                            accessibilityRole="button"
                            accessibilityLabel="Close item detail"
                        >
                            <Ionicons name="close" size={24} color={tc.textPrimary} />
                        </TouchableOpacity>

                        {selectedItem && (
                            <>
                                <View style={[styles.expandedImageContainer, { backgroundColor: imageBg }]}>
                                    <Image
                                        source={{ uri: selectedItem.processedUrl || selectedItem.originalUrl }}
                                        style={styles.expandedImage}
                                        resizeMode="contain"
                                    />
                                </View>

                                <View style={styles.modalInfo}>
                                    <Text style={[styles.modalBrand, { color: tc.textPrimary }]}>
                                        {selectedItem.brand || selectedItem.subCategory || selectedItem.category}
                                    </Text>

                                    <View style={styles.nameRow}>
                                        {editingName ? (
                                            <>
                                                <TextInput
                                                    style={[styles.nameInput, { color: tc.textPrimary }]}
                                                    value={nameInput}
                                                    onChangeText={setNameInput}
                                                    placeholder="Item name"
                                                    placeholderTextColor={tc.textSecondary}
                                                />
                                                <TouchableOpacity
                                                    style={styles.nameIconBtn}
                                                    disabled={savingName || !nameInput.trim()}
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Save name"
                                                    onPress={async () => {
                                                        if (!nameInput.trim()) return;
                                                        try {
                                                            setSavingName(true);
                                                            const updated = await wardrobeLocal.updateItem(selectedItem.id, {
                                                                name: nameInput.trim(),
                                                            });
                                                            const normalizedUpdated = {
                                                                ...updated,
                                                                category: normalizeCategory(updated.category),
                                                            };
                                                            setItems(prev =>
                                                                prev.map(i => i.id === normalizedUpdated.id ? normalizedUpdated : i),
                                                            );
                                                            setSelectedItem(normalizedUpdated);
                                                            setEditingName(false);
                                                        } catch (e: any) {
                                                            Alert.alert('Update failed', e?.message || 'Could not rename item');
                                                        } finally {
                                                            setSavingName(false);
                                                        }
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="checkmark"
                                                        size={18}
                                                        color={savingName || !nameInput.trim() ? Colors.mediumGray : Colors.white}
                                                    />
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <>
                                                <Text style={[styles.modalName, { color: tc.textSecondary }]} numberOfLines={1}>
                                                    {selectedItem.name || 'Untitled item'}
                                                </Text>
                                                <TouchableOpacity
                                                    style={styles.nameIconBtn}
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Edit name"
                                                    onPress={() => {
                                                        setNameInput(selectedItem.name || '');
                                                        setEditingName(true);
                                                    }}
                                                >
                                                    <Ionicons name="pencil" size={16} color={Colors.white} />
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>

                                    {selectedItem.mlLabels && selectedItem.mlLabels.length > 0 && (
                                        <View style={styles.labelsChipContainer}>
                                            {selectedItem.mlLabels.slice(0, 3).map((lbl, idx) => (
                                                <View key={idx} style={styles.labelChip}>
                                                    <Text style={styles.labelChipText}>{lbl}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, { backgroundColor: Colors.gold }]}
                                            onPress={async () => {
                                                try {
                                                    const today = new Date().toISOString().split('T')[0];
                                                    await ootdLocal.saveOOTD(today, [selectedItem.id], 'Added from Wardrobe');
                                                    setToastType('success');
                                                    setToastMessage('Added to today\'s outfit');
                                                    setToastVisible(true);
                                                } catch (e: any) {
                                                    setToastType('error');
                                                    setToastMessage('Could not add to outfit');
                                                    setToastVisible(true);
                                                }
                                            }}
                                        >
                                            <Ionicons name="calendar-outline" size={18} color={Colors.white} />
                                            <Text style={styles.modalActionText}>Today's Outfit</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, { backgroundColor: tc.surface }]}
                                            onPress={() => {
                                                setDeleteDialogVisible(true);
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color={Colors.error} />
                                            <Text style={[styles.modalActionText, { color: Colors.error }]}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Low-confidence banner */}
                                    {selectedItem.isLowConfidence && (
                                        <TouchableOpacity
                                            style={styles.lowConfidenceBanner}
                                            onPress={() => openTagPicker(selectedItem)}
                                            activeOpacity={0.85}
                                        >
                                            <Ionicons name="help-circle-outline" size={16} color={Colors.goldDark} />
                                            <Text style={styles.lowConfidenceText}>
                                                We're not sure what this is – help us tag it?
                                            </Text>
                                            <Ionicons name="chevron-forward" size={14} color={Colors.goldDark} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                </Pressable>
            </Modal>

            {/* Tag picker modal for low-confidence items */}
            <Modal
                visible={tagPickerVisible}
                transparent
                animationType="slide"
                onRequestClose={closeTagPicker}
            >
                <Pressable style={styles.bottomSheetOverlay} onPress={closeTagPicker}>
                    <View style={[styles.bottomSheetContainer, { backgroundColor: tc.card }]}>
                        <View style={styles.bottomSheetHandle} />
                        <Text style={[styles.bottomSheetTitle, { color: tc.textPrimary }]}>
                            {tagPickerMode === 'move'
                                ? bulkMoveItemIds.length > 0
                                    ? 'Move selected items'
                                    : 'Move item'
                                : 'Tag this item'}
                        </Text>
                        <Text style={[styles.bottomSheetSubtitle, { color: tc.textSecondary }]}>
                            {tagPickerMode === 'move'
                                ? bulkMoveItemIds.length > 0
                                    ? `Move ${bulkMoveItemIds.length} items to which section?`
                                    : 'Select the section you want to move this item to'
                                : 'What type of clothing is this?'}
                        </Text>

                        <View style={styles.tagPickerGrid}>
                            {AI_CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.value}
                                    style={[
                                        styles.tagPickerChip,
                                        { borderColor: tc.border },
                                        pickerCategory === cat.value && styles.tagPickerChipActive,
                                    ]}
                                    onPress={() => setPickerCategory(cat.value)}
                                >
                                    <Text style={[
                                        styles.tagPickerChipText,
                                        { color: tc.textPrimary },
                                        pickerCategory === cat.value && { color: Colors.white },
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.tagPickerSaveBtn,
                                !pickerCategory && { opacity: 0.4 },
                            ]}
                            onPress={saveTag}
                            disabled={!pickerCategory || savingTag}
                        >
                            {savingTag
                                ? <ActivityIndicator size="small" color={Colors.white} />
                                : <Text style={styles.tagPickerSaveBtnText}>{tagPickerMode === 'move' ? 'Move' : 'Save'}</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            <Toast
                visible={toastVisible}
                type={toastType}
                message={toastMessage}
                onHide={() => setToastVisible(false)}
            />

            <ConfirmDialog
                visible={deleteDialogVisible && !!selectedItem}
                title="Delete Item"
                description="Are you sure you want to remove this from your wardrobe?"
                confirmLabel="Delete"
                cancelLabel="Cancel"
                destructive
                onCancel={() => setDeleteDialogVisible(false)}
                onConfirm={async () => {
                    if (!selectedItem) return;
                    try {
                        setDeleteDialogVisible(false);
                        setIsDeleting(true);
                        await wardrobeLocal.deleteItem(selectedItem.id);
                        logEvent('delete_item', { category: selectedItem.category });
                        setSelectedItem(null);
                        invalidateCache();
                        await loadItems(true);
                        setToastType('success');
                        setToastMessage('Item deleted');
                        setToastVisible(true);
                    } catch (err) {
                        setToastType('error');
                        setToastMessage('Could not delete item');
                        setToastVisible(true);
                    } finally {
                        setIsDeleting(false);
                    }
                }}
            />

            {/* ── Floating Selection Action Bar ── */}
            <Animated.View
                pointerEvents={selectionMode && selectedItemIds.length > 0 ? 'auto' : 'none'}
                style={[
                    styles.floatingSelectionBar,
                    {
                        backgroundColor: tc.card,
                        borderColor: tc.border,
                        opacity: selectionBarAnim,
                        transform: [{
                            translateY: selectionBarAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [80, 0],
                            }),
                        }],
                    },
                ]}
            >
                <TouchableOpacity onPress={toggleSelectionMode} style={styles.floatingCloseBtn}>
                    <Ionicons name="close" size={20} color={tc.textSecondary} />
                </TouchableOpacity>

                <View style={[styles.floatingCountPill, { backgroundColor: tc.accentLight }]}>
                    <Text style={[styles.floatingCountText, { color: tc.accent }]}>
                        {selectedItemIds.length} selected
                    </Text>
                </View>

                <View style={[styles.floatingActions, { marginLeft: 8 }]}>
                    <TouchableOpacity
                        style={[styles.floatingActionBtn, { backgroundColor: tc.accent }]}
                        onPress={openBulkMovePicker}
                    >
                        <Ionicons name="swap-horizontal" size={16} color={Colors.white} />
                        <Text style={styles.floatingActionBtnText}>Move</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.floatingActionBtn, { backgroundColor: Colors.error + '15' }]}
                        onPress={() => {
                            // delete all selected
                            Alert.alert(
                                'Delete Selected',
                                `Delete ${selectedItemIds.length} item(s)?`,
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                setIsDeleting(true);
                                                await Promise.all(selectedItemIds.map(id => wardrobeLocal.deleteItem(id)));
                                                logEvent('delete_item', { count: selectedItemIds.length });
                                                setSelectionMode(false);
                                                setSelectedItemIds([]);
                                                invalidateCache();
                                                await loadItems(true);
                                                setToastType('success');
                                                setToastMessage(`${selectedItemIds.length} items deleted`);
                                                setToastVisible(true);
                                            } catch (err) {
                                                setToastType('error');
                                                setToastMessage('Could not delete items');
                                                setToastVisible(true);
                                            } finally {
                                                setIsDeleting(false);
                                            }
                                        },
                                    },
                                ],
                            );
                        }}
                    >
                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                        <Text style={[styles.floatingActionBtnText, { color: Colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* ── Filter Bottom Sheet ── */}
            <Modal
                visible={filterSheetVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setFilterSheetVisible(false)}
            >
                <Pressable style={styles.bottomSheetOverlay} onPress={() => setFilterSheetVisible(false)}>
                    <Pressable style={[styles.filterSheetContainer, { backgroundColor: tc.card }]} onPress={e => e.stopPropagation()}>
                        <View style={styles.bottomSheetHandle} />
                        <View style={styles.filterSheetHeader}>
                            <Text style={[styles.filterSheetTitle, { color: tc.textPrimary }]}>Filters</Text>
                            {activeFilterCount > 0 && (
                                <TouchableOpacity onPress={resetFilters}>
                                    <Text style={[styles.filterResetText, { color: Colors.error }]}>Reset All</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                            {/* Favorites Toggle */}
                            <View style={styles.filterSectionRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="heart" size={18} color={Colors.error} />
                                    <Text style={[styles.filterSectionTitle, { color: tc.textPrimary, marginBottom: 0 }]}>Favorites Only</Text>
                                </View>
                                <Switch
                                    value={filterFavoritesOnly}
                                    onValueChange={setFilterFavoritesOnly}
                                    trackColor={{ false: tc.border, true: tc.accent + '80' }}
                                    thumbColor={filterFavoritesOnly ? tc.accent : tc.textMuted}
                                />
                            </View>

                            {/* Color */}
                            <Text style={[styles.filterSectionTitle, { color: tc.textPrimary }]}>Color</Text>
                            <View style={styles.filterChipWrap}>
                                {FILTER_COLORS.map(color => {
                                    const active = filterColors.includes(color);
                                    return (
                                        <TouchableOpacity
                                            key={color}
                                            style={[
                                                styles.filterChip,
                                                { borderColor: active ? tc.accent : tc.border, backgroundColor: active ? tc.accentLight : 'transparent' },
                                            ]}
                                            onPress={() => toggleFilterChip(color, filterColors, setFilterColors)}
                                        >
                                            <View style={[styles.filterColorDot, { backgroundColor: color.toLowerCase() === 'beige' ? '#F5DEB3' : color.toLowerCase() === 'navy' ? '#000080' : color.toLowerCase() }]} />
                                            <Text style={[styles.filterChipText, { color: active ? tc.accent : tc.textSecondary }]}>{color}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Season */}
                            <Text style={[styles.filterSectionTitle, { color: tc.textPrimary }]}>Season</Text>
                            <View style={styles.filterChipWrap}>
                                {FILTER_SEASONS.map(season => {
                                    const active = filterSeasons.includes(season);
                                    const icons: Record<string, string> = { Summer: 'sunny-outline', Winter: 'snow-outline', Spring: 'flower-outline', Fall: 'leaf-outline' };
                                    return (
                                        <TouchableOpacity
                                            key={season}
                                            style={[
                                                styles.filterChip,
                                                { borderColor: active ? tc.accent : tc.border, backgroundColor: active ? tc.accentLight : 'transparent' },
                                            ]}
                                            onPress={() => toggleFilterChip(season, filterSeasons, setFilterSeasons)}
                                        >
                                            <Ionicons name={icons[season] as any} size={14} color={active ? tc.accent : tc.textSecondary} />
                                            <Text style={[styles.filterChipText, { color: active ? tc.accent : tc.textSecondary }]}>{season}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Occasion */}
                            <Text style={[styles.filterSectionTitle, { color: tc.textPrimary }]}>Occasion</Text>
                            <View style={styles.filterChipWrap}>
                                {FILTER_OCCASIONS.map(occasion => {
                                    const active = filterOccasions.includes(occasion);
                                    return (
                                        <TouchableOpacity
                                            key={occasion}
                                            style={[
                                                styles.filterChip,
                                                { borderColor: active ? tc.accent : tc.border, backgroundColor: active ? tc.accentLight : 'transparent' },
                                            ]}
                                            onPress={() => toggleFilterChip(occasion, filterOccasions, setFilterOccasions)}
                                        >
                                            <Text style={[styles.filterChipText, { color: active ? tc.accent : tc.textSecondary }]}>{occasion}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {/* Apply / Close buttons */}
                        <View style={styles.filterSheetFooter}>
                            <TouchableOpacity
                                style={[styles.filterApplyBtn, { backgroundColor: tc.accent }]}
                                onPress={applyFilters}
                            >
                                <Ionicons name="checkmark" size={18} color={Colors.white} />
                                <Text style={styles.filterApplyBtnText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.warmGray,
    },

    /* ── New Header ── */
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xxl,
        paddingBottom: Spacing.sm,
    },
    headerTitle: {
        fontSize: 36,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTextBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    headerTextBtnLabel: {
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    filterIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    filterBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: Colors.white,
    },

    categoriesContainer: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.lg,
        gap: Spacing.sm,
    },

    /* ── Floating Selection Bar ── */
    floatingSelectionBar: {
        position: 'absolute',
        bottom: 100,
        left: Spacing.lg,
        right: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        gap: 10,
        zIndex: 200,
        ...Shadows.lg,
    },
    floatingCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingCountPill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
    },
    floatingCountText: {
        fontSize: 13,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    floatingActions: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    floatingActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
        minHeight: 38,
    },
    floatingActionBtnText: {
        fontSize: 13,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        color: Colors.white,
    },

    /* ── Filter Bottom Sheet ── */
    filterSheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.xxl,
        ...Shadows.lg,
    },
    filterSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    filterSheetTitle: {
        fontSize: 22,
        fontFamily: FontFamily.heading,
        fontWeight: '700',
    },
    filterResetText: {
        fontSize: 14,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    filterSectionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        paddingVertical: 4,
    },
    filterSectionTitle: {
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        marginBottom: Spacing.sm,
        marginTop: Spacing.md,
    },
    filterChipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: Spacing.sm,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    filterColorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    filterChipText: {
        fontSize: 13,
        fontFamily: FontFamily.bodyMedium,
        fontWeight: '500',
    },
    filterSheetFooter: {
        marginTop: Spacing.lg,
    },
    filterApplyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xxl,
        borderRadius: BorderRadius.round,
        minHeight: 48,
    },
    filterApplyBtnText: {
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        color: Colors.white,
    },

    /* Active filter tags row */
    activeFiltersRow: {
        marginBottom: Spacing.sm,
    },
    activeFilterTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    activeFilterTagText: {
        fontSize: 12,
        fontFamily: FontFamily.bodyMedium,
        fontWeight: '500',
    },
    categoryChip: {
        paddingHorizontal: Spacing.lg,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
        backgroundColor: Colors.white,
        marginRight: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.lightGray,
    },
    categoryChipActive: {
        backgroundColor: Colors.gold,
        borderColor: Colors.gold,
    },
    categoryChipText: {
        fontSize: 13,
        fontFamily: FontFamily.bodyMedium,
        fontWeight: '500',
        color: Colors.charcoal,
    },
    categoryChipTextActive: {
        color: Colors.white,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    uploadBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.categoryActive,
        marginHorizontal: Spacing.xl,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    uploadText: {
        fontSize: 13,
        fontFamily: FontFamily.bodyMedium,
        color: Colors.goldDark,
        fontWeight: '500',
    },
    processingOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 96,
        alignItems: 'center',
    },
    processingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.charcoal,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        ...Shadows.sm,
    },
    processingTextContainer: {
        marginLeft: Spacing.sm,
    },
    processingTitle: {
        fontSize: 13,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        color: Colors.white,
    },
    processingSubtitle: {
        fontSize: 11,
        color: Colors.mediumGray,
        marginTop: 2,
    },
    gridContainer: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: 100,
    },
    uploadedSectionHeader: {
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    uploadedSectionTitle: {
        ...Typography.heading3,
    },
    uploadedSectionCount: {
        fontSize: 12,
        fontFamily: FontFamily.bodyBold,
        fontWeight: '700',
    },
    gridRow: {
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    card: {
        width: CARD_WIDTH,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    cardSelected: {
        borderWidth: 2,
        borderColor: Colors.gold,
    },
    cardImage: {
        width: '100%',
        height: CARD_WIDTH * 1.1,
        backgroundColor: Colors.warmGray,
    },
    favoriteBtn: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedBadge: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        padding: Spacing.md,
    },
    cardBrand: {
        fontSize: 14,
        fontFamily: FontFamily.bodyBold,
        fontWeight: '700',
        color: Colors.charcoal,
    },
    cardName: {
        fontSize: 12,
        fontFamily: FontFamily.body,
        color: Colors.darkGray,
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: Spacing.xl,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxxl,
    },
    emptyScrollContainer: {
        paddingBottom: 100,
    },
    emptyHeaderContainer: {
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.xxl,
        marginBottom: Spacing.xl,
    },
    emptyTitle: {
        ...Typography.heading3,
        marginTop: Spacing.md,
        marginBottom: Spacing.xs,
    },
    emptySubtitle: {
        ...Typography.bodySmall,
        textAlign: 'center',
        color: Colors.mediumGray,
        lineHeight: 20,
    },
    suggestionsSection: {
        paddingHorizontal: SUGGESTION_SECTION_PADDING,
        marginTop: Spacing.xl,
        marginBottom: Spacing.md,
    },
    // FlatList already has horizontal padding; cancel it so suggestions keep same edge alignment as empty-state layout.
    suggestionsSectionInList: {
        marginHorizontal: -Spacing.xl,
    },
    suggestionsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    suggestionsTitle: {
        ...Typography.heading3,
        color: Colors.charcoal,
    },
    suggestionsHint: {
        fontSize: 11,
        fontWeight: '500',
    },
    suggestionsGridTwo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        columnGap: SUGGESTION_GRID_GAP,
        rowGap: Spacing.md,
    },
    suggestionGridItem: {
        width: '48%',
    },
    suggestionCard: {
        width: '100%',
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    suggestionImage: {
        width: '100%',
        height: 120,
    },
    suggestionInfo: {
        padding: Spacing.sm,
    },
    suggestionBrand: {
        fontSize: 13,
        fontFamily: FontFamily.bodyBold,
        fontWeight: '700',
    },
    suggestionName: {
        fontSize: 11,
        marginTop: 2,
        marginBottom: Spacing.sm,
    },
    suggestionAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.round,
        backgroundColor: Colors.gold,
        minHeight: 30,
    },
    suggestionAddBtnText: {
        color: Colors.white,
        fontSize: 12,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    suggestionLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
    },
    suggestionLoaderText: {
        fontSize: 12,
        color: Colors.darkGray,
        fontWeight: '500',
    },
    fab: {
        position: 'absolute',
        bottom: 110,
        right: Spacing.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.gold,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        ...Shadows.lg,
    },
    bottomSheetOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    bottomSheetContainer: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.xxl,
        ...Shadows.lg,
    },
    bottomSheetHandle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.lightGray,
        marginBottom: Spacing.md,
    },
    bottomSheetTitle: {
        ...Typography.heading3,
        marginBottom: Spacing.xs,
    },
    bottomSheetSubtitle: {
        ...Typography.bodySmall,
        marginBottom: Spacing.lg,
    },
    bottomSheetActions: {
        gap: Spacing.md,
    },
    bottomSheetAction: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.warmGray,
    },
    bottomSheetIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.gold,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    bottomSheetActionTextContainer: {
        flex: 1,
    },
    bottomSheetActionTitle: {
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        color: Colors.charcoal,
    },
    bottomSheetActionSubtitle: {
        fontSize: 12,
        fontFamily: FontFamily.body,
        color: Colors.darkGray,
        marginTop: 2,
    },
    bottomSheetCancel: {
        marginTop: Spacing.sm,
        alignSelf: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.lg,
    },
    bottomSheetCancelText: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.darkGray,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    modalContent: {
        width: '100%',
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        alignItems: 'center',
        position: 'relative',
    },
    closeBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expandedImageContainer: {
        width: '100%',
        height: 350,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginBottom: Spacing.xl,
        marginTop: Spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expandedImage: {
        width: '100%',
        height: '100%',
    },
    modalInfo: {
        width: '100%',
        alignItems: 'center',
    },
    modalBrand: {
        fontSize: 20,
        fontFamily: FontFamily.heading,
        fontWeight: '700',
        marginBottom: 4,
    },
    modalName: {
        fontSize: 16,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        width: '100%',
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
        width: '100%',
    },
    nameInput: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.lightGray,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        fontSize: 14,
    },
    nameIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.gold,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
        minHeight: 42,
    },
    modalActionText: {
        fontSize: 13,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        color: Colors.white,
    },
    lowConfidenceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.goldLight,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        marginTop: Spacing.md,
        width: '100%',
    },
    lowConfidenceText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        color: Colors.goldDark,
    },
    tagPickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginVertical: Spacing.lg,
        width: '100%',
    },
    tagPickerChip: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: Colors.lightGray,
        backgroundColor: 'transparent',
    },
    tagPickerChipActive: {
        backgroundColor: Colors.gold,
        borderColor: Colors.gold,
    },
    tagPickerChipText: {
        fontSize: 13,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        color: Colors.charcoal,
    },
    tagPickerSaveBtn: {
        backgroundColor: Colors.gold,
        borderRadius: BorderRadius.round,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xxl,
        alignSelf: 'center',
        minWidth: 120,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.sm,
        minHeight: 48,
    },
    tagPickerSaveBtnText: {
        fontSize: 15,
        fontFamily: FontFamily.bodyBold,
        fontWeight: '700',
        color: Colors.white,
    },
    labelsChipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
        marginBottom: 8,
    },
    labelChip: {
        backgroundColor: Colors.cream,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: Colors.lightGray,
    },
    labelChipText: {
        fontSize: 11,
        color: Colors.darkGray,
        fontWeight: '500',
    },
});
