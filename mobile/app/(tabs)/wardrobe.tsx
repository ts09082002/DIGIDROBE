import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { CANONICAL_TO_FILTER_PARAM, FILTER_TO_CANONICAL, normalizeCategory } from '../../constants/categories';
import { api, WardrobeItem } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { Toast } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;
const TARGET_WIDTH = 800;
const TARGET_ASPECT_RATIO = 4 / 5;

    const CATEGORIES = ['All Items', 'Topwear', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'];

const SUGGESTED_ITEMS = [
    {
        id: 's1',
        name: 'Linen Blend Shirt',
        brand: 'Zara',
        imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&auto=format&fit=crop&q=60',
        category: 'Topwear'
    },
    {
        id: 's2',
        name: 'Original Jeans',
        brand: 'Levi\'s',
        imageUrl: 'https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?w=500&auto=format&fit=crop&q=60',
        category: 'Bottoms'
    },
    {
        id: 's3',
        name: 'Classic Coat',
        brand: 'Mango',
        imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=60',
        category: 'Outerwear'
    },
    {
        id: 's4',
        name: 'Sneakers',
        brand: 'Nike',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60',
        category: 'Shoes'
    },
];

export default function WardrobeScreen() {
    const { isDarkMode } = useTheme();
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
    const [pickerCategory, setPickerCategory] = useState('');
    const [savingTag, setSavingTag] = useState(false);
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
        setTagPickerItemId(item.id);
        setPickerCategory(item.category !== 'unclassified' ? item.category : '');
        setTagPickerVisible(true);
    };

    const saveTag = async () => {
        if (!tagPickerItemId || !pickerCategory) return;
        try {
            setSavingTag(true);
            const updated = await api.updateWardrobeItem(tagPickerItemId, {
                category: pickerCategory,
                isLowConfidence: false,
            });
            setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
            if (selectedItem?.id === tagPickerItemId) setSelectedItem(updated);
            setTagPickerVisible(false);
        } catch (e: any) {
            setToastType('error');
            setToastMessage(e?.message || 'Could not save tag');
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

    const loadItems = useCallback(async () => {
        try {
            setLoading(true);
            const selectedCanonical = FILTER_TO_CANONICAL[selectedCategory] ?? 'all';
            const data = await api.getWardrobeItems({
                category: CANONICAL_TO_FILTER_PARAM[selectedCanonical],
                search: searchQuery || undefined,
            });
            setItems(
                data.map((item) => ({
                    ...item,
                    category: normalizeCategory(item.category),
                })),
            );
        } catch (e) {
            // Server might not be running
            console.log('Failed to load items:', e);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, searchQuery]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadItems();
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

    const handleUpload = async () => {
        try {
            const start = Date.now();
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
            });

            if (result.canceled || !result.assets[0]) return;

            setUploading(true);
            const asset = result.assets[0];
            const filename = asset.fileName || 'clothing.jpg';

            const uploadUri = await autoCropAndResize(
                asset.uri,
                asset.width,
                asset.height,
            );

            // Step 2: Upload image to backend, which now creates the wardrobe item
            const newItem = await api.uploadClothingImage(
                uploadUri,
                filename,
                'image/jpeg'
            );

            // Optimistically add the new item to local state
            setItems((prev) => [newItem, ...prev]);

            const elapsed = Date.now() - start;
            console.log(`Wardrobe upload (gallery) completed in ${elapsed}ms`);
            setProcessingVisible(true);
            setTimeout(() => setProcessingVisible(false), 2200);
        } catch (error: any) {
            setToastType('error');
            setToastMessage(error.message || 'Upload failed');
            setToastVisible(true);
        } finally {
            setUploading(false);
        }
    };

    const handleCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                setToastType('error');
                setToastMessage('Camera permission is needed to take photos.');
                setToastVisible(true);
                return;
            }

            const start = Date.now();
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 0.8,
            });

            if (result.canceled || !result.assets[0]) return;

            setUploading(true);
            const asset = result.assets[0];

            const uploadUri = await autoCropAndResize(
                asset.uri,
                asset.width,
                asset.height,
            );

            // Step 2: Upload image to backend, which now creates the wardrobe item
            const newItem = await api.uploadClothingImage(
                uploadUri,
                'camera_photo.jpg',
                'image/jpeg'
            );

            // Optimistically add the new item to local state
            setItems((prev) => [newItem, ...prev]);

            const elapsed = Date.now() - start;
            console.log(`Wardrobe upload (camera) completed in ${elapsed}ms`);
            setProcessingVisible(true);
            setTimeout(() => setProcessingVisible(false), 2200);
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
            await api.toggleFavorite(id);
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

    const openItem = (item: WardrobeItem) => {
        setSelectedItem(item);
        setEditingName(false);
        setNameInput(item.name || '');
    };

    const renderItem = ({ item }: { item: WardrobeItem }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.card }]}
            onPress={() => openItem(item)}
            activeOpacity={0.9}
        >
            <Image
                source={{ uri: api.getImageUrl(item.processedUrl || item.originalUrl) }}
                style={[styles.cardImage, { backgroundColor: theme.imageBg }]}
                resizeMode="contain"
            />
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
            <View style={styles.cardInfo}>
                <Text style={[styles.cardBrand, { color: theme.text }]} numberOfLines={1}>
                    {item.brand || item.category}
                </Text>
                <Text style={[styles.cardName, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.name}
                </Text>
            </View>
        </TouchableOpacity>
    );

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
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
                    }
                >
                    <View style={styles.emptyHeaderContainer}>
                        <Ionicons name="shirt-outline" size={50} color={Colors.lightGray} />
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>Your wardrobe is empty</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                            Tap the + button to add your first clothing item, or get inspired by these staples!
                        </Text>
                    </View>

                    <View style={styles.suggestionsHeader}>
                        <Text style={[styles.suggestionsTitle, { color: theme.text }]}>Suggested Additions</Text>
                    </View>

                    <View style={styles.suggestionsGrid}>
                        {SUGGESTED_ITEMS.map((item) => (
                            <View key={item.id} style={[styles.card, { backgroundColor: theme.card }]}>
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    style={[styles.cardImage, { backgroundColor: theme.imageBg }]}
                                    resizeMode="cover"
                                />
                                <TouchableOpacity
                                    style={styles.addSuggestionBtn}
                                    onPress={() => Alert.alert('Add to Wardrobe', `Would you like to find similar items to ${item.name}?`, [
                                        { text: 'Not Now', style: 'cancel' },
                                        { text: 'Search Similar', onPress: () => setSearchQuery(item.name) }
                                    ])}
                                >
                                    <Ionicons name="add" size={18} color={Colors.white} />
                                </TouchableOpacity>
                                <View style={styles.cardInfo}>
                                    <Text style={[styles.cardBrand, { color: theme.text }]} numberOfLines={1}>
                                        {item.brand}
                                    </Text>
                                    <Text style={[styles.cardName, { color: theme.textSecondary }]} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            ) : (
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.gridContainer}
                    columnWrapperStyle={styles.gridRow}
                    showsVerticalScrollIndicator={false}
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
                            Choose how to add your clothing item
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
                                    <Text style={styles.bottomSheetActionSubtitle}>Pick an existing photo</Text>
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
                                        {selectedItem.brand || selectedItem.category}
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
                                                            setItems(prev =>
                                                                prev.map(i => i.id === updated.id ? updated : i),
                                                            );
                                                            setSelectedItem(updated);
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
                onRequestClose={() => setTagPickerVisible(false)}
            >
                <Pressable style={styles.bottomSheetOverlay} onPress={() => setTagPickerVisible(false)}>
                    <View style={[styles.bottomSheetContainer, { backgroundColor: theme.card }]}>
                        <View style={styles.bottomSheetHandle} />
                        <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>Tag this item</Text>
                        <Text style={[styles.bottomSheetSubtitle, { color: theme.textSecondary }]}>
                            What type of clothing is this?
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
                                : <Text style={styles.tagPickerSaveBtnText}>Save</Text>
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
    suggestionsHeader: {
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
    },
    suggestionsTitle: {
        ...Typography.heading3,
        color: Colors.charcoal,
    },
    suggestionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: Spacing.xl,
        justifyContent: 'space-between',
        rowGap: Spacing.md,
    },
    addSuggestionBtn: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: Colors.gold,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
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
});
