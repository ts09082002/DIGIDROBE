import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { api, WardrobeItem } from '../../services/api';
import * as wardrobeLocal from '../../services/wardrobe-local';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.38;
const BODY_PHOTO_KEY = '@digidrobe_body_photo_url';

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
    const [bodyPhotoUri, setBodyPhotoUri] = useState<string | null>(null);
    const [bodyPhotoUploading, setBodyPhotoUploading] = useState(false);
    const [showPhotoActionSheet, setShowPhotoActionSheet] = useState(false);
    const { isDarkMode, toggleTheme } = useTheme();
    const router = useRouter();

    // Load saved body photo on mount
    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem(BODY_PHOTO_KEY);
                if (saved) setBodyPhotoUri(saved);
            } catch { }
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

    const renderClothingCard = ({ item }: { item: WardrobeItem }) => {
        const imageUrl = item.processedUrl || item.originalUrl;
        const resolvedUrl = imageUrl || null;

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
                {/* ─── Your Photo / Model Viewer ─── */}
                <View style={[styles.modelContainer, { backgroundColor: cardBg }]}>
                    {bodyPhotoUploading ? (
                        <View style={styles.uploadPlaceholder}>
                            <ActivityIndicator size="large" color={gold} />
                            <Text style={[styles.uploadingText, { color: textSecondary }]}>
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
                                colors={['transparent', 'rgba(26,20,16,0.85)']}
                                style={styles.modelGradient}
                            />
                            <TouchableOpacity
                                style={styles.changePhotoBtn}
                                onPress={() => setShowPhotoActionSheet(true)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="camera-outline" size={14} color="#FFF" />
                                <Text style={styles.changePhotoText}>Change Photo</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.uploadPlaceholder}>
                            <View style={styles.uploadIconCircle}>
                                <Ionicons name="person-outline" size={40} color={gold} />
                            </View>
                            <Text style={[styles.uploadTitle, { color: textPrimary }]}>
                                Upload Your Photo
                            </Text>
                            <Text style={[styles.uploadSubtitle, { color: textSecondary }]}>
                                Add a full-body photo to see outfit suggestions on you
                            </Text>
                            <View style={styles.uploadBtnRow}>
                                <TouchableOpacity
                                    style={[styles.uploadBtn, { backgroundColor: gold }]}
                                    onPress={() => pickBodyPhoto('camera')}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="camera-outline" size={16} color="#000" />
                                    <Text style={styles.uploadBtnTextDark}>Camera</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.uploadBtn, { backgroundColor: surfaceBg, borderWidth: 1, borderColor: gold }]}
                                    onPress={() => pickBodyPhoto('gallery')}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="images-outline" size={16} color={gold} />
                                    <Text style={[styles.uploadBtnTextLight, { color: gold }]}>Gallery</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
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

            {/* Custom Action Sheet for Photo Upload */}
            {showPhotoActionSheet && (
                <View style={styles.actionSheetOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setShowPhotoActionSheet(false)}
                    />
                    <View style={[styles.actionSheetContainer, { backgroundColor: cardBg }]}>
                        <View style={styles.actionSheetHandle} />
                        <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>Update Photo</Text>
                        <Text style={[styles.actionSheetSubtitle, { color: textSecondary }]}>
                            Choose a clear, full-body photo for the best AI try-on experience.
                        </Text>

                        <View style={styles.actionSheetRow}>
                            <TouchableOpacity
                                style={[styles.actionSheetBtn, { backgroundColor: surfaceBg }]}
                                onPress={() => pickBodyPhoto('camera')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.actionSheetIconBox, { backgroundColor: 'rgba(212,168,67,0.15)' }]}>
                                    <Ionicons name="camera" size={24} color={gold} />
                                </View>
                                <Text style={[styles.actionSheetBtnText, { color: textPrimary }]}>Camera</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionSheetBtn, { backgroundColor: surfaceBg }]}
                                onPress={() => pickBodyPhoto('gallery')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.actionSheetIconBox, { backgroundColor: 'rgba(212,168,67,0.15)' }]}>
                                    <Ionicons name="images" size={24} color={gold} />
                                </View>
                                <Text style={[styles.actionSheetBtnText, { color: textPrimary }]}>Gallery</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.actionSheetCancel}
                            onPress={() => setShowPhotoActionSheet(false)}
                        >
                            <Text style={[styles.actionSheetCancelText, { color: textMuted }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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

    /* ── Model Viewer / Photo Upload ── */
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

    /* ── Upload Placeholder ── */
    uploadPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        gap: 12,
    },
    uploadIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(212,168,67,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    uploadTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    uploadSubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    uploadingText: {
        fontSize: 14,
        marginTop: 8,
    },
    uploadBtnRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14,
        gap: 8,
    },
    uploadBtnTextDark: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },
    uploadBtnTextLight: {
        fontSize: 14,
        fontWeight: '700',
    },
    changePhotoBtn: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    changePhotoText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
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
});
