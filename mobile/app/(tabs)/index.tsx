import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    Platform,
    FlatList,
    Alert,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeColors } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { api, WardrobeItem } from '../../services/api';
import * as wardrobeLocal from '../../services/wardrobe-local';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenContainer from '../../components/ui/ScreenContainer';
import CategoryPills from '../../components/ui/CategoryPills';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonRow } from '../../components/ui/SkeletonLoader';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.38;
const BODY_PHOTO_KEY = '@drobeo_body_photo_url';

const CATEGORIES = ['All Items', 'Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories'];

const CATEGORY_MAP: Record<string, string> = {
    'All Items': '',
    'Tops': 'top',
    'Bottoms': 'bottom',
    'Footwear': 'footwear',
    'Outerwear': 'outerwear',
    'Accessories': 'accessories',
};

function getSubLabel(item: WardrobeItem): string {
    return item.category?.charAt(0).toUpperCase() + item.category?.slice(1) || 'Item';
}

export default function HomeScreen() {
    const [activeCategory, setActiveCategory] = useState('All Items');
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [bodyPhotoUri, setBodyPhotoUri] = useState<string | null>(null);
    const [bodyPhotoUploading, setBodyPhotoUploading] = useState(false);
    const [showPhotoActionSheet, setShowPhotoActionSheet] = useState(false);
    const { isDarkMode, toggleTheme } = useTheme();
    const tc = useThemeColors();
    const router = useRouter();

    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem(BODY_PHOTO_KEY);
                if (saved) setBodyPhotoUri(saved);
            } catch {}
        })();
    }, []);

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const category = CATEGORY_MAP[activeCategory] || undefined;
            const data = await wardrobeLocal.getAllItems(category ? { category } : undefined);
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

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchItems();
        setRefreshing(false);
    }, [fetchItems]);

    const pickBodyPhoto = async (source: 'camera' | 'gallery') => {
        try {
            const permission =
                source === 'camera'
                    ? await ImagePicker.requestCameraPermissionsAsync()
                    : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert('Permission needed', `Please allow ${source} access to continue.`);
                return;
            }

            const result =
                source === 'camera'
                    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
                    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });

            if (result.canceled || !result.assets?.length) return;

            const asset = result.assets[0];
            setBodyPhotoUploading(true);

            const uploaded = await api.uploadBodyPhoto(
                asset.uri,
                asset.fileName || `body-photo-${Date.now()}.jpg`,
                asset.mimeType || 'image/jpeg',
            );

            const photoUrl = api.getImageUrl(uploaded.processedUrl || uploaded.originalUrl);
            setBodyPhotoUri(photoUrl);
            await AsyncStorage.setItem(BODY_PHOTO_KEY, photoUrl);
            setShowPhotoActionSheet(false);
        } catch (error: any) {
            Alert.alert('Upload failed', error?.message || 'Could not upload photo');
        } finally {
            setBodyPhotoUploading(false);
        }
    };

    const handleViewItem = (item: WardrobeItem) => {
        router.push({ pathname: '/(tabs)/wardrobe', params: { viewItemId: item.id } });
    };

    const renderClothingCard = ({ item }: { item: WardrobeItem }) => {
        const imageUrl = item.processedUrl || item.originalUrl;

        return (
            <View style={styles.clothingCard}>
                <View style={[styles.clothingImageContainer, { backgroundColor: tc.surface }]}>
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.clothingImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <Ionicons name="shirt-outline" size={40} color={tc.textMuted} />
                    )}
                </View>
                <View style={styles.clothingInfo}>
                    <Text style={[styles.clothingSubLabel, { color: tc.textMuted }]} numberOfLines={1}>
                        {getSubLabel(item)}
                    </Text>
                    <Text style={[styles.clothingName, { color: tc.textPrimary }]} numberOfLines={1}>
                        {item.name || 'Unnamed'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.viewButton, { backgroundColor: tc.accent }]}
                    onPress={() => handleViewItem(item)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${item.name || 'item'}`}
                >
                    <Text style={styles.viewButtonText}>VIEW</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <ScreenContainer>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <View style={[styles.logoIconBg, { backgroundColor: tc.accent }]}>
                        <Ionicons name="diamond" size={14} color="#FFF" />
                    </View>
                    <Text style={[styles.logoText, { color: tc.textPrimary }]}>Drobeo</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        onPress={toggleTheme}
                        style={[styles.iconBtn, { backgroundColor: tc.surface }]}
                        accessibilityRole="button"
                        accessibilityLabel={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={20} color={tc.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)/profile')}
                        style={[styles.iconBtn, { backgroundColor: tc.surface }]}
                        accessibilityRole="button"
                        accessibilityLabel="Go to profile"
                    >
                        <Ionicons name="person-outline" size={20} color={tc.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={tc.accent}
                        colors={[tc.accent]}
                    />
                }
            >
                {/* Your Photo / Model Viewer */}
                <View style={[styles.modelContainer, { backgroundColor: tc.card }]}>
                    {bodyPhotoUploading ? (
                        <View style={styles.uploadPlaceholder}>
                            <View style={[styles.uploadIconCircle, { backgroundColor: tc.accentLight }]}>
                                <Ionicons name="cloud-upload-outline" size={32} color={tc.accent} />
                            </View>
                            <Text style={[styles.uploadTitle, { color: tc.textSecondary }]}>
                                Uploading your photo...
                            </Text>
                        </View>
                    ) : bodyPhotoUri ? (
                        <>
                            <Image
                                source={{ uri: bodyPhotoUri }}
                                style={styles.modelImage}
                                resizeMode="contain"
                            />
                            <LinearGradient
                                colors={['transparent', isDarkMode ? 'rgba(28,25,23,0.85)' : 'rgba(0,0,0,0.3)']}
                                style={styles.modelGradient}
                            />
                            <TouchableOpacity
                                style={styles.changePhotoBtn}
                                onPress={() => setShowPhotoActionSheet(true)}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel="Change body photo"
                            >
                                <Ionicons name="camera-outline" size={14} color="#FFF" />
                                <Text style={styles.changePhotoText}>Change Photo</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.uploadPlaceholder}>
                            <View style={[styles.uploadIconCircle, { backgroundColor: tc.accentLight }]}>
                                <Ionicons name="person-outline" size={40} color={tc.accent} />
                            </View>
                            <Text style={[styles.uploadTitle, { color: tc.textPrimary }]}>
                                Upload Your Photo
                            </Text>
                            <Text style={[styles.uploadSubtitle, { color: tc.textSecondary }]}>
                                Add a full-body photo to see outfit suggestions on you
                            </Text>
                            <View style={styles.uploadBtnRow}>
                                <TouchableOpacity
                                    style={[styles.uploadBtn, { backgroundColor: tc.accent }]}
                                    onPress={() => pickBodyPhoto('camera')}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Take photo with camera"
                                >
                                    <Ionicons name="camera-outline" size={16} color="#FFF" />
                                    <Text style={styles.uploadBtnTextLight}>Camera</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.uploadBtn, { backgroundColor: tc.surface, borderWidth: 1, borderColor: tc.accent }]}
                                    onPress={() => pickBodyPhoto('gallery')}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Choose from gallery"
                                >
                                    <Ionicons name="images-outline" size={16} color={tc.accent} />
                                    <Text style={[styles.uploadBtnTextAccent, { color: tc.accent }]}>Gallery</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Category Filter */}
                <View style={styles.categorySection}>
                    <CategoryPills
                        categories={CATEGORIES}
                        selected={activeCategory}
                        onSelect={setActiveCategory}
                    />
                </View>

                {/* Clothing Items */}
                {loading ? (
                    <View style={styles.skeletonContainer}>
                        <SkeletonRow count={3} />
                    </View>
                ) : items.length === 0 ? (
                    <EmptyState
                        icon="shirt-outline"
                        title="No items found"
                        subtitle="Upload clothes in the Wardrobe tab to see them here"
                        actionLabel="Go to Wardrobe"
                        onAction={() => router.push('/(tabs)/wardrobe')}
                    />
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

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: tc.surface }]}>
                        <Ionicons name="shirt" size={22} color={tc.accent} />
                        <Text style={[styles.statNumber, { color: tc.textPrimary }]}>{items.length}</Text>
                        <Text style={[styles.statLabel, { color: tc.textSecondary }]}>Items</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: tc.surface }]}>
                        <Ionicons name="heart" size={22} color={Colors.error} />
                        <Text style={[styles.statNumber, { color: tc.textPrimary }]}>
                            {items.filter((i) => i.isFavorite).length}
                        </Text>
                        <Text style={[styles.statLabel, { color: tc.textSecondary }]}>Favorites</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: tc.surface }]}>
                        <Ionicons name="layers" size={22} color={Colors.info} />
                        <Text style={[styles.statNumber, { color: tc.textPrimary }]}>
                            {new Set(items.map((i) => i.category)).size}
                        </Text>
                        <Text style={[styles.statLabel, { color: tc.textSecondary }]}>Categories</Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Action Sheet for Photo Upload */}
            {showPhotoActionSheet && (
                <View style={styles.actionSheetOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setShowPhotoActionSheet(false)}
                    />
                    <View style={[styles.actionSheetContainer, { backgroundColor: tc.card }]}>
                        <View style={[styles.actionSheetHandle, { backgroundColor: tc.textMuted }]} />
                        <Text style={[styles.actionSheetTitle, { color: tc.textPrimary }]}>Update Photo</Text>
                        <Text style={[styles.actionSheetSubtitle, { color: tc.textSecondary }]}>
                            Choose a clear, full-body photo for the best experience.
                        </Text>

                        <View style={styles.actionSheetRow}>
                            <TouchableOpacity
                                style={[styles.actionSheetBtn, { backgroundColor: tc.surface }]}
                                onPress={() => pickBodyPhoto('camera')}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel="Take photo with camera"
                            >
                                <View style={[styles.actionSheetIconBox, { backgroundColor: tc.accentLight }]}>
                                    <Ionicons name="camera" size={24} color={tc.accent} />
                                </View>
                                <Text style={[styles.actionSheetBtnText, { color: tc.textPrimary }]}>Camera</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionSheetBtn, { backgroundColor: tc.surface }]}
                                onPress={() => pickBodyPhoto('gallery')}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel="Choose from gallery"
                            >
                                <View style={[styles.actionSheetIconBox, { backgroundColor: tc.accentLight }]}>
                                    <Ionicons name="images" size={24} color={tc.accent} />
                                </View>
                                <Text style={[styles.actionSheetBtnText, { color: tc.textPrimary }]}>Gallery</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.actionSheetCancel}
                            onPress={() => setShowPhotoActionSheet(false)}
                        >
                            <Text style={[styles.actionSheetCancelText, { color: tc.textMuted }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    /* Header */
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
        gap: Spacing.sm,
    },
    logoIconBg: {
        width: 30,
        height: 30,
        borderRadius: BorderRadius.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
        letterSpacing: -0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    scrollContent: {
        paddingBottom: 20,
    },

    /* Model Viewer / Photo Upload */
    modelContainer: {
        marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        height: height * 0.42,
        position: 'relative',
        marginBottom: Spacing.lg,
        ...Shadows.sm,
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

    /* Upload Placeholder */
    uploadPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        gap: Spacing.md,
    },
    uploadIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    uploadTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: FontFamily.headingMedium,
        textAlign: 'center',
    },
    uploadSubtitle: {
        fontSize: 14,
        fontFamily: FontFamily.body,
        textAlign: 'center',
        lineHeight: 20,
    },
    uploadBtnRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.sm,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
    },
    uploadBtnTextLight: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: FontFamily.bodyBold,
        color: '#FFF',
    },
    uploadBtnTextAccent: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: FontFamily.bodyBold,
    },
    changePhotoBtn: {
        position: 'absolute',
        bottom: Spacing.lg,
        right: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
        gap: 6,
    },
    changePhotoText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },

    /* Category Filters */
    categorySection: {
        marginBottom: Spacing.lg,
    },

    /* Skeleton */
    skeletonContainer: {
        paddingVertical: Spacing.xl,
    },

    /* Clothing Cards */
    clothingListContent: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
    },
    clothingCard: {
        width: CARD_WIDTH,
    },
    clothingImageContainer: {
        width: '100%',
        height: CARD_WIDTH * 0.95,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    clothingImage: {
        width: '100%',
        height: '100%',
    },
    clothingInfo: {
        marginBottom: Spacing.sm,
        paddingHorizontal: 2,
    },
    clothingSubLabel: {
        fontSize: 11,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    clothingName: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: FontFamily.bodyBold,
    },
    viewButton: {
        paddingVertical: 10,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewButtonText: {
        fontSize: 12,
        fontWeight: '800',
        fontFamily: FontFamily.bodyBold,
        color: '#FFF',
        letterSpacing: 1,
    },

    /* Stats Row */
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        marginTop: Spacing.xl,
    },
    statCard: {
        flex: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        gap: Spacing.xs,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '800',
        fontFamily: FontFamily.heading,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
        fontFamily: FontFamily.bodyMedium,
    },

    /* Action Sheet */
    actionSheetOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
        zIndex: 999,
    },
    actionSheetContainer: {
        borderTopLeftRadius: BorderRadius.xxl || 24,
        borderTopRightRadius: BorderRadius.xxl || 24,
        paddingHorizontal: Spacing.xl,
        paddingBottom: 40,
        paddingTop: Spacing.md,
        alignItems: 'center',
    },
    actionSheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginBottom: Spacing.xl,
    },
    actionSheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
        marginBottom: 6,
    },
    actionSheetSubtitle: {
        fontSize: 14,
        fontFamily: FontFamily.body,
        textAlign: 'center',
        marginBottom: Spacing.xxl,
        paddingHorizontal: Spacing.xl,
    },
    actionSheetRow: {
        flexDirection: 'row',
        gap: Spacing.lg,
        width: '100%',
        marginBottom: Spacing.xl,
    },
    actionSheetBtn: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.xxl,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
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
        fontFamily: FontFamily.bodySemiBold,
    },
    actionSheetCancel: {
        paddingVertical: Spacing.md,
        width: '100%',
        alignItems: 'center',
    },
    actionSheetCancelText: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },
});
