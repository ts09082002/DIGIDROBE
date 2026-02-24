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
    Alert,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Modal,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { api, WardrobeItem } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;

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
            const categoryMap: Record<string, string> = {
                'All Items': 'all',
                'Topwear': 'tops',
                'Bottoms': 'bottoms',
                'Outerwear': 'outerwear',
                'Shoes': 'shoes',
                'Accessories': 'accessories',
            };
            const data = await api.getWardrobeItems({
                category: categoryMap[selectedCategory] || 'all',
                search: searchQuery || undefined,
            });
            setItems(data);
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

    const handleUpload = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.9,
            });

            if (result.canceled || !result.assets[0]) return;

            setUploading(true);
            const asset = result.assets[0];
            const filename = asset.fileName || 'clothing.jpg';

            // Upload to backend (background removal happens server-side)
            const uploadResult = await api.uploadClothingImage(asset.uri, filename);

            // Create wardrobe item
            await api.createWardrobeItem({
                id: uploadResult.id,
                originalFilename: uploadResult.originalFilename,
                originalUrl: uploadResult.originalUrl,
                processedUrl: uploadResult.processedUrl,
                category: uploadResult.category,
                name: filename.replace(/\.[^/.]+$/, ''),
                brand: '',
                isFavorite: false,
            });

            Alert.alert('Success! ✨', 'Clothing uploaded and background removed!');
            loadItems();
        } catch (error: any) {
            Alert.alert('Upload Failed', error.message || 'Something went wrong');
        } finally {
            setUploading(false);
        }
    };

    const handleCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.9,
            });

            if (result.canceled || !result.assets[0]) return;

            setUploading(true);
            const asset = result.assets[0];

            const uploadResult = await api.uploadClothingImage(asset.uri, 'camera_photo.jpg');
            await api.createWardrobeItem({
                id: uploadResult.id,
                originalFilename: uploadResult.originalFilename,
                originalUrl: uploadResult.originalUrl,
                processedUrl: uploadResult.processedUrl,
                category: uploadResult.category,
                name: 'Camera Photo',
                brand: '',
                isFavorite: false,
            });

            Alert.alert('Success! ✨', 'Photo captured and processed!');
            loadItems();
        } catch (error: any) {
            Alert.alert('Error', error.message);
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
        Alert.alert(
            'Add Clothing',
            'Choose how to add your clothing item',
            [
                { text: '📷 Take Photo', onPress: handleCamera },
                { text: '🖼️ Choose from Gallery', onPress: handleUpload },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const renderItem = ({ item }: { item: WardrobeItem }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.card }]}
            onPress={() => setSelectedItem(item)}
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
                    <Text style={styles.uploadText}>Processing image & removing background...</Text>
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
                                    <Text style={[styles.modalName, { color: theme.textSecondary }]}>
                                        {selectedItem.name}
                                    </Text>

                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, { backgroundColor: Colors.gold }]}
                                            onPress={() => {
                                                handleToggleFavorite(selectedItem.id);
                                                setSelectedItem(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
                                            }}
                                        >
                                            <Ionicons
                                                name={selectedItem.isFavorite ? "heart" : "heart-outline"}
                                                size={18}
                                                color={Colors.white}
                                            />
                                            <Text style={styles.modalActionText}>
                                                {selectedItem.isFavorite ? "Favorited" : "Favorite"}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, { backgroundColor: isDarkMode ? '#333' : '#F5F5F5' }]}
                                            onPress={() => {
                                                Alert.alert(
                                                    "Delete Item",
                                                    "Are you sure you want to remove this from your wardrobe?",
                                                    [
                                                        { text: "Cancel", style: "cancel" },
                                                        {
                                                            text: "Delete",
                                                            style: "destructive",
                                                            onPress: async () => {
                                                                try {
                                                                    await api.deleteItem(selectedItem.id);
                                                                    setSelectedItem(null);
                                                                    loadItems();
                                                                } catch (err) {
                                                                    Alert.alert("Error", "Could not delete item");
                                                                }
                                                            }
                                                        }
                                                    ]
                                                );
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color={Colors.error} />
                                            <Text style={[styles.modalActionText, { color: Colors.error }]}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </Pressable>
            </Modal>
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
        fontSize: 15,
        marginBottom: Spacing.xl,
    },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        width: '100%',
        justifyContent: 'center',
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
});
