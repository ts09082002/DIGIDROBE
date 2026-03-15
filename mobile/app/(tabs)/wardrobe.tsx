import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import {
    CANONICAL_TO_FILTER_PARAM,
    FILTER_TO_CANONICAL,
    normalizeCategory,
    CanonicalCategory,
} from '../../constants/categories';
import { api, WardrobeItem } from '../../services/api';
import { classifyClothing, canonicalToBackend } from '../../services/ml-classifier';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Toast } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;
const SUGGESTION_SECTION_PADDING = Spacing.lg;
const SUGGESTION_GRID_GAP = Spacing.sm;
const SUGGESTIONS_PAGE_SIZE = 6;
const SUGGESTIONS_MAX = 120;
const TARGET_WIDTH = 800;
const TARGET_ASPECT_RATIO = 4 / 5;

const CATEGORIES = ['All Items', 'Topwear', 'Bottoms', 'Outerwear', 'Footwear', 'Bags', 'Accessories'];

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
    const { user, isLoading: authLoading } = useAuth();
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('All Items');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
    const [uploadOptionsVisible, setUploadOptionsVisible] = useState(false);
    const [processingVisible, setProcessingVisible] = useState(false);
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
                    api.updateWardrobeItem(id, {
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
                await loadItems();
            } else {
                setToastType('success');
                setToastMessage(tagPickerMode === 'move' ? 'Item moved successfully' : 'Item category updated');
                setToastVisible(true);
                if (tagPickerMode === 'move') {
                    await loadItems();
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

    const theme = {
        background: isDarkMode ? '#1A1A1A' : Colors.warmGray,
        card: isDarkMode ? '#242424' : Colors.white,
        text: isDarkMode ? '#FFFFFF' : Colors.charcoal,
        textSecondary: isDarkMode ? '#A0A0A0' : Colors.darkGray,
        border: isDarkMode ? '#333333' : Colors.lightGray,
        iconBtnBg: isDarkMode ? '#333333' : Colors.white,
        imageBg: isDarkMode ? '#111111' : Colors.warmGray,
    };

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

    const loadItems = useCallback(async (showErrorToast = false) => {
        if (authLoading) return;
        try {
            setLoading(true);
            const selectedCanonical = FILTER_TO_CANONICAL[selectedCategory] ?? 'all';
            const data = await api.getWardrobeItems({
                category: CANONICAL_TO_FILTER_PARAM[selectedCanonical],
                search: searchQuery || undefined,
            });
            setItems(
                (data ?? []).map((item) => ({
                    ...item,
                    category: normalizeCategory(item.category),
                })),
            );
        } catch (e: any) {
            console.log('Failed to load items:', e);
            setItems([]);
            if (showErrorToast) {
                setToastType('error');
                setToastMessage(e?.message || 'Could not load wardrobe items. Check your connection.');
                setToastVisible(true);
            }
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, searchQuery, authLoading]);

    useEffect(() => {
        const migrateItems = async () => {
            if (user && !authLoading) {
                try {
                    const result = await api.claimGuestItems();
                    if (result.count > 0) {
                        console.log(`Migrated ${result.count} guest items`);
                        await loadItems();
                    }
                } catch (e) {
                    console.warn('Migration failed:', e);
                }
            }
        };
        migrateItems();
    }, [user, authLoading, loadItems]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const onRefresh = async () => {
        setRefreshing(true);
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

    const watchProcessingItems = async (itemIds: string[]) => {
        if (!itemIds.length) return;
        const pending = new Set(itemIds);

        for (let attempt = 0; attempt < 20 && pending.size > 0; attempt++) {
            await wait(1500);
            const updates = await Promise.all(
                Array.from(pending).map(async (id) => {
                    try {
                        const item = await api.getWardrobeItem(id);
                        return {
                            ...item,
                            category: normalizeCategory(item.category),
                        } as WardrobeItem;
                    } catch {
                        return null;
                    }
                }),
            );

            const valid = updates.filter((u): u is WardrobeItem => u !== null);
            if (!valid.length) continue;

            const byId = new Map(valid.map((u) => [u.id, u]));
            valid.forEach((u) => {
                if (u.status !== 'processing') pending.delete(u.id);
            });

            setItems((prev) =>
                prev.map((item) => byId.get(item.id) ?? item),
            );
            setSelectedItem((prev) => (prev ? (byId.get(prev.id) ?? prev) : prev));
        }
    };

    const uploadAssets = async (assets: ImagePicker.ImagePickerAsset[], source: 'gallery' | 'camera') => {
        if (!assets.length) return;

        const start = Date.now();
        // Only use the UI filter category as an override if the user has explicitly chosen one.
        const preferredCategoryFromFilter = getPreferredUploadCategory();

        const uploadedItems = await Promise.all(
            assets.map(async (asset) => {
                const filename = asset.fileName || `${source}_photo.jpg`;
                const uploadUri = await autoCropAndResize(asset.uri, asset.width, asset.height);

                // ── On-Device ML Kit Classification ──────────────────────
                // Always run ML Kit on the image first to get accurate category.
                // Only fall back to the UI filter category if ML Kit returns unclassified.
                let finalCategory: string | undefined = preferredCategoryFromFilter;

                const mlResult = await classifyClothing(uploadUri);
                console.log(
                    `[ML Kit] ${filename} → category: ${mlResult.category}, ` +
                    `subCategory: ${mlResult.subCategory}, confidence: ${mlResult.confidence}, ` +
                    `labels: [${mlResult.mlLabels.slice(0, 5).join(', ')}]`
                );

                if (!mlResult.isLowConfidence && mlResult.category !== 'unclassified') {
                    // ML Kit is confident — use its result regardless of UI filter
                    finalCategory = canonicalToBackend(mlResult.category);
                } else if (preferredCategoryFromFilter) {
                    // If ML Kit is uncertain/missing, use the current folder/filter the user is in
                    finalCategory = preferredCategoryFromFilter;
                }
                // ─────────────────────────────────────────────────────────

                const newItem = await api.uploadClothingImage(
                    uploadUri,
                    filename,
                    'image/jpeg',
                    finalCategory,
                    mlResult.mlLabels,
                    mlResult.subCategory,
                );
                return {
                    ...newItem,
                    category: normalizeCategory(newItem.category),
                } as WardrobeItem;
            }),
        );

        if (uploadedItems.length > 0) {
            setItems((prev) => [...uploadedItems, ...prev]);
            const elapsed = Date.now() - start;
            console.log(`Wardrobe upload (${source}) completed in ${elapsed}ms for ${uploadedItems.length} image(s)`);
            setProcessingVisible(true);
            setTimeout(() => setProcessingVisible(false), 2200);
            setToastType('success');
            setToastMessage(
                uploadedItems.length === 1
                    ? '1 item added'
                    : `${uploadedItems.length} items added`,
            );
            setToastVisible(true);
            // Auto-refresh each uploaded item until backend background processing finishes.
            watchProcessingItems(uploadedItems.map((item) => item.id));
        }
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
            setToastMessage(error?.message || 'Upload failed');
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
            setToastMessage(error?.message || 'Something went wrong');
            setToastVisible(true);
        } finally {
            setUploading(false);
        }
    };

    const handleToggleFavorite = async (id: string) => {
        try {
            await api.toggleFavorite(id);
            setItems(prev =>
                prev.map(item =>
                    item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
                )
            );
        } catch (e: any) {
            setToastType('error');
            setToastMessage(e?.message || 'Failed to update favorite status');
            setToastVisible(true);
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

            const newItem = await api.createWardrobeItem({
                originalFilename: `${suggestion.name.replace(/\s+/g, '_').toLowerCase()}.png`,
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
                { backgroundColor: theme.card },
                selectionMode && selectedItemIds.includes(item.id) && styles.cardSelected,
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
            <Image
                source={{ uri: api.getImageUrl(item.processedUrl || item.originalUrl) }}
                style={[styles.cardImage, { backgroundColor: theme.imageBg }]}
                resizeMode="contain"
            />
            {!selectionMode && (
                <TouchableOpacity
                    style={[styles.favoriteBtn, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)' }]}
                    onPress={() => handleToggleFavorite(item.id)}
                >
                    <Ionicons
                        name={item.isFavorite ? 'heart' : 'heart-outline'}
                        size={18}
                        color={item.isFavorite ? Colors.amber : theme.textSecondary}
                    />
                </TouchableOpacity>
            )}
            {selectionMode && (
                <View style={styles.selectedBadge}>
                    <Ionicons
                        name={selectedItemIds.includes(item.id) ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={selectedItemIds.includes(item.id) ? Colors.gold : Colors.mediumGray}
                    />
                </View>
            )}
            <View style={styles.cardInfo}>
                <Text style={[styles.cardBrand, { color: theme.text }]} numberOfLines={1}>
                    {item.brand || item.subCategory || item.category}
                </Text>
                <Text style={[styles.cardName, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.name}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderSuggestion = ({ item }: { item: SuggestionItem }) => (
        <View style={[styles.suggestionCard, { backgroundColor: theme.card }]}>
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
                    <Text style={[styles.suggestionBrand, { color: theme.text }]} numberOfLines={1}>
                        {item.brand}
                    </Text>
                ) : null}
                <Text style={[styles.suggestionName, { color: theme.textSecondary }]} numberOfLines={1}>
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
        if (visibleSuggestions.length === 0) return null;
        return (
            <View style={[styles.suggestionsSection, insideList && styles.suggestionsSectionInList]}>
                <View style={styles.suggestionsHeaderRow}>
                    <Text style={[styles.suggestionsTitle, { color: theme.text }]}>
                        Suggested To Add
                    </Text>
                    <Text style={[styles.suggestionsHint, { color: theme.textSecondary }]}>
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
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>My Wardrobe</Text>
                <TouchableOpacity style={[styles.filterBtn, { backgroundColor: theme.iconBtnBg }]}>
                    <Ionicons name="options-outline" size={22} color={theme.text} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: theme.iconBtnBg }]}>
                <Ionicons name="search" size={18} color={theme.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search your collection..."
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={loadItems}
                />
            </View>

            {/* Bulk move controls */}
            <View style={[styles.bulkActionBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.bulkActionText, { color: theme.textSecondary }]}>
                    {selectionMode
                        ? `${selectedItemIds.length} selected`
                        : 'Select items to move between sections'}
                </Text>
                <View style={styles.bulkActionButtons}>
                    <TouchableOpacity
                        style={[styles.bulkActionBtn, { borderColor: theme.border }]}
                        onPress={toggleSelectionMode}
                    >
                        <Text style={[styles.bulkActionBtnText, { color: theme.text }]}>
                            {selectionMode ? 'Cancel' : 'Select'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.bulkActionBtn,
                            styles.bulkActionBtnPrimary,
                            selectedItemIds.length === 0 && styles.bulkActionBtnDisabled,
                        ]}
                        onPress={openBulkMovePicker}
                        disabled={selectedItemIds.length === 0}
                    >
                        <Text style={styles.bulkActionBtnPrimaryText}>Move</Text>
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
                            { backgroundColor: theme.card, borderColor: theme.border },
                            selectedCategory === item && styles.categoryChipActive,
                        ]}
                        onPress={() => setSelectedCategory(item)}
                    >
                        <Text
                            style={[
                                styles.categoryChipText,
                                { color: theme.textSecondary },
                                selectedCategory === item && styles.categoryChipTextActive,
                            ]}
                        >
                            {item}
                        </Text>
                    </TouchableOpacity>
                )}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
            />

            {/* Upload Progress */}
            {uploading && (
                <View style={styles.uploadBanner}>
                    <ActivityIndicator size="small" color={Colors.gold} />
                    <Text style={styles.uploadText}>Uploading image...</Text>
                </View>
            )}

            {/* Background processing feedback */}
            {processingVisible && (
                <View style={styles.processingOverlay}>
                    <View style={styles.processingCard}>
                        <ActivityIndicator size="small" color={Colors.gold} />
                        <View style={styles.processingTextContainer}>
                            <Text style={styles.processingTitle}>Removing background…</Text>
                            <Text style={styles.processingSubtitle}>We’ll update your item in a moment.</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Items Grid */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.gold} />
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
                        <Text style={[styles.uploadedSectionTitle, { color: theme.text }]}>Uploaded Items</Text>
                        <Text style={[styles.uploadedSectionCount, { color: theme.textSecondary }]}>0</Text>
                    </View>
                    <View style={styles.emptyHeaderContainer}>
                        <Ionicons name="shirt-outline" size={50} color={Colors.lightGray} />
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>Your wardrobe is empty</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
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
                    ListHeaderComponent={
                        <View style={styles.uploadedSectionHeader}>
                            <Text style={[styles.uploadedSectionTitle, { color: theme.text }]}>Uploaded Items</Text>
                            <Text style={[styles.uploadedSectionCount, { color: theme.textSecondary }]}>{items.length}</Text>
                        </View>
                    }
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
            <TouchableOpacity style={styles.fab} onPress={showUploadOptions}>
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
                    <View style={[styles.bottomSheetContainer, { backgroundColor: theme.card }]}>
                        <View style={styles.bottomSheetHandle} />
                        <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>Add Clothing</Text>
                        <Text style={[styles.bottomSheetSubtitle, { color: theme.textSecondary }]}>
                            {selectedCategory === 'All Items'
                                ? 'Choose how to add your clothing item'
                                : `Items will be added to ${selectedCategory}`}
                        </Text>

                        <View style={styles.bottomSheetActions}>
                            <TouchableOpacity
                                style={styles.bottomSheetAction}
                                onPress={() => {
                                    setUploadOptionsVisible(false);
                                    handleCamera();
                                }}
                            >
                                <View style={styles.bottomSheetIconCircle}>
                                    <Ionicons name="camera" size={22} color={Colors.white} />
                                </View>
                                <View style={styles.bottomSheetActionTextContainer}>
                                    <Text style={styles.bottomSheetActionTitle}>Take Photo</Text>
                                    <Text style={styles.bottomSheetActionSubtitle}>Use your camera to capture</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.bottomSheetAction}
                                onPress={() => {
                                    setUploadOptionsVisible(false);
                                    handleUpload();
                                }}
                            >
                                <View style={styles.bottomSheetIconCircle}>
                                    <Ionicons name="images" size={22} color={Colors.white} />
                                </View>
                                <View style={styles.bottomSheetActionTextContainer}>
                                    <Text style={styles.bottomSheetActionTitle}>Choose from Gallery</Text>
                                    <Text style={styles.bottomSheetActionSubtitle}>Pick one or more photos</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.bottomSheetCancel}
                                onPress={() => setUploadOptionsVisible(false)}
                            >
                                <Text style={styles.bottomSheetCancelText}>Cancel</Text>
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
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setSelectedItem(null)}
                        >
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>

                        {selectedItem && (
                            <>
                                <View style={[styles.expandedImageContainer, { backgroundColor: theme.imageBg }]}>
                                    <Image
                                        source={{ uri: api.getImageUrl(selectedItem.processedUrl || selectedItem.originalUrl) }}
                                        style={styles.expandedImage}
                                        resizeMode="contain"
                                    />
                                </View>

                                <View style={styles.modalInfo}>
                                    <Text style={[styles.modalBrand, { color: theme.text }]}>
                                        {selectedItem.brand || selectedItem.subCategory || selectedItem.category}
                                    </Text>

                                    <View style={styles.nameRow}>
                                        {editingName ? (
                                            <>
                                                <TextInput
                                                    style={[styles.nameInput, { color: theme.text }]}
                                                    value={nameInput}
                                                    onChangeText={setNameInput}
                                                    placeholder="Item name"
                                                    placeholderTextColor={theme.textSecondary}
                                                />
                                                <TouchableOpacity
                                                    style={styles.nameIconBtn}
                                                    disabled={savingName || !nameInput.trim()}
                                                    onPress={async () => {
                                                        if (!nameInput.trim()) return;
                                                        try {
                                                            setSavingName(true);
                                                            const updated = await api.updateWardrobeItem(selectedItem.id, {
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
                                                <Text style={[styles.modalName, { color: theme.textSecondary }]} numberOfLines={1}>
                                                    {selectedItem.name || 'Untitled item'}
                                                </Text>
                                                <TouchableOpacity
                                                    style={styles.nameIconBtn}
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
                                                    await api.saveOOTD(today, [selectedItem.id], 'Added from Wardrobe');
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
                                            style={[styles.modalActionBtn, { backgroundColor: isDarkMode ? '#333' : '#F5F5F5' }]}
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
                                            <Ionicons name="help-circle-outline" size={16} color="#B45309" />
                                            <Text style={styles.lowConfidenceText}>
                                                We're not sure what this is – help us tag it?
                                            </Text>
                                            <Ionicons name="chevron-forward" size={14} color="#B45309" />
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
                    <View style={[styles.bottomSheetContainer, { backgroundColor: theme.card }]}>
                        <View style={styles.bottomSheetHandle} />
                        <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>
                            {tagPickerMode === 'move'
                                ? bulkMoveItemIds.length > 0
                                    ? 'Move selected items'
                                    : 'Move item'
                                : 'Tag this item'}
                        </Text>
                        <Text style={[styles.bottomSheetSubtitle, { color: theme.textSecondary }]}>
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
                                        pickerCategory === cat.value && styles.tagPickerChipActive,
                                    ]}
                                    onPress={() => setPickerCategory(cat.value)}
                                >
                                    <Text style={[
                                        styles.tagPickerChipText,
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
                        await api.deleteItem(selectedItem.id);
                        setSelectedItem(null);
                        setDeleteDialogVisible(false);
                        loadItems();
                        setToastType('success');
                        setToastMessage('Item deleted');
                        setToastVisible(true);
                    } catch (err) {
                        setToastType('error');
                        setToastMessage('Could not delete item');
                        setToastVisible(true);
                    }
                }}
            />
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
        paddingBottom: Spacing.sm,
    },
    title: {
        ...Typography.heading1,
    },
    filterBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        marginHorizontal: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        marginBottom: Spacing.lg,
        ...Shadows.sm,
    },
    searchInput: {
        flex: 1,
        marginLeft: Spacing.sm,
        fontSize: 14,
        color: Colors.charcoal,
    },
    categoriesContainer: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.lg,
        gap: Spacing.sm,
    },
    bulkActionBar: {
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.sm,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Shadows.sm,
    },
    bulkActionText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        marginRight: Spacing.md,
    },
    bulkActionButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'center',
    },
    bulkActionBtn: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.white,
    },
    bulkActionBtnPrimary: {
        backgroundColor: Colors.gold,
        borderColor: Colors.gold,
    },
    bulkActionBtnDisabled: {
        opacity: 0.45,
    },
    bulkActionBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    bulkActionBtnPrimaryText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.white,
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
        fontWeight: '500',
        color: Colors.charcoal,
    },
    categoryChipTextActive: {
        color: Colors.white,
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
        fontWeight: '700',
        color: Colors.charcoal,
    },
    cardName: {
        fontSize: 12,
        color: Colors.darkGray,
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.gold,
    },
    suggestionAddBtnText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
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
        bottom: 20,
        right: Spacing.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.gold,
        justifyContent: 'center',
        alignItems: 'center',
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
        fontWeight: '600',
        color: Colors.charcoal,
    },
    bottomSheetActionSubtitle: {
        fontSize: 12,
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
        fontWeight: '700',
        marginBottom: 4,
    },
    modalName: {
        fontSize: 16,
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
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    modalActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.white,
    },
    lowConfidenceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF3C7',
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
        color: '#B45309',
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
        fontWeight: '600',
        color: Colors.charcoal,
    },
    tagPickerSaveBtn: {
        backgroundColor: Colors.gold,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        alignSelf: 'center',
        minWidth: 120,
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    tagPickerSaveBtnText: {
        fontSize: 15,
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
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    labelChipText: {
        fontSize: 11,
        color: '#4B5563',
        fontWeight: '500',
    },
});
