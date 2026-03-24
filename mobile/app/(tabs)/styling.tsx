import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    FlatList,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { WardrobeItem } from '../../services/api';
import * as wardrobeLocal from '../../services/wardrobe-local';
import ScreenContainer from '../../components/ui/ScreenContainer';
import CategoryPills from '../../components/ui/CategoryPills';
import EmptyState from '../../components/ui/EmptyState';

const { width } = Dimensions.get('window');

const CATEGORIES = ['All', 'Topwear', 'Bottomwear', 'Outerwear', 'Footwear', 'Accessories'];

const SKIN_TONES = ['#F5D6C3', '#E8C4A8', '#D4A574', '#B8865A', '#8B6542', '#5C3D2E'];

export default function StylingScreen() {
    const tc = useThemeColors();
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [selectedSkinTone, setSelectedSkinTone] = useState('#E8C4A8');
    const [loading, setLoading] = useState(true);

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const category = selectedCategory === 'All' ? undefined : selectedCategory.toLowerCase();
            const result = await wardrobeLocal.getAllItems(category ? { category } : undefined);
            setItems(result);
            if (result.length > 0 && !selectedItem) {
                setSelectedItem(result[0].id);
            }
        } catch {
            // silently handle
        } finally {
            setLoading(false);
        }
    }, [selectedCategory]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleCategoryChange = (cat: string) => {
        setSelectedCategory(cat);
        setSelectedItem(null);
    };

    const selectedItemData = items.find(i => i.id === selectedItem);

    return (
        <ScreenContainer>
            {/* Standard VibeCheck Header */}
            <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="sparkles" size={20} color={tc.accent} />
                    <Text style={[{ color: tc.textPrimary, fontSize: 24, fontWeight: '700', fontFamily: FontFamily.heading }]}>Styling</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedItem(null);
                            setSelectedSkinTone('#E8C4A8');
                        }}
                        style={[{ paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm }]}
                    >
                        <Text style={[styles.resetText, { color: tc.accent }]}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm }]} 
                        onPress={() => router.back()}
                    >
                        <Ionicons name="close" size={20} color={tc.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Avatar Area */}
            <View style={styles.avatarContainer}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: tc.surface }]}>
                    {selectedItemData?.processedUrl ? (
                        <Image
                            source={{ uri: selectedItemData.processedUrl }}
                            style={styles.avatarItemImage}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={styles.avatarBody}>
                            <View style={[styles.avatarHead, { backgroundColor: selectedSkinTone }]} />
                            <View style={[styles.avatarTorso, { backgroundColor: selectedSkinTone }]}>
                                <Ionicons name="person" size={80} color="rgba(0,0,0,0.1)" />
                            </View>
                        </View>
                    )}

                    {/* Dashed guides */}
                    <View style={[styles.guideDashed, { borderColor: tc.accent }]} />
                </View>

                {/* Skin Tone Selector */}
                <View style={styles.skinToneRow}>
                    {SKIN_TONES.map((tone) => (
                        <TouchableOpacity
                            key={tone}
                            style={[
                                styles.skinToneDot,
                                { backgroundColor: tone },
                                selectedSkinTone === tone && { borderColor: tc.accent, borderWidth: 3 },
                            ]}
                            onPress={() => setSelectedSkinTone(tone)}
                            accessibilityRole="button"
                            accessibilityLabel={`Select skin tone`}
                        />
                    ))}
                </View>
            </View>

            {/* Category Tabs */}
            <CategoryPills
                categories={CATEGORIES}
                selected={selectedCategory}
                onSelect={handleCategoryChange}
            />

            {/* Clothing Items */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={tc.accent} />
                </View>
            ) : items.length === 0 ? (
                <EmptyState
                    icon="shirt-outline"
                    title="No items yet"
                    subtitle="Add items to your wardrobe to style your avatar"
                    actionLabel="Add Item"
                    onAction={() => router.navigate('/(tabs)/upload' as any)}
                />
            ) : (
                <FlatList
                    data={items}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.itemsContainer}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        const isSelected = selectedItem === item.id;
                        return (
                            <TouchableOpacity
                                style={styles.itemCard}
                                onPress={() => setSelectedItem(item.id)}
                                accessibilityRole="button"
                                accessibilityLabel={`Select ${item.name || item.category}`}
                            >
                                <View style={[
                                    styles.itemImage,
                                    {
                                        backgroundColor: tc.surface,
                                        borderColor: isSelected ? tc.accent : tc.border,
                                    },
                                ]}>
                                    {item.processedUrl ? (
                                        <Image
                                            source={{ uri: item.processedUrl }}
                                            style={StyleSheet.absoluteFill}
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <Ionicons name="shirt-outline" size={36} color={tc.textMuted} />
                                    )}
                                    {isSelected && (
                                        <View style={styles.checkmark}>
                                            <Ionicons name="checkmark-circle" size={22} color={tc.accent} />
                                        </View>
                                    )}
                                </View>
                                <Text
                                    style={[
                                        styles.itemLabel,
                                        { color: isSelected ? tc.accent : tc.textSecondary },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {item.name || item.category}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            {/* Bottom Actions */}
            <View style={[styles.bottomActions, { backgroundColor: tc.card, borderTopColor: tc.border }]}>
                <View style={styles.bottomLeft}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.navigate('/(tabs)/wardrobe' as any)}
                        accessibilityRole="button"
                        accessibilityLabel="Go to closet"
                    >
                        <Ionicons name="shirt-outline" size={20} color={tc.textSecondary} />
                        <Text style={[styles.actionLabel, { color: tc.textSecondary }]}>CLOSET</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={[styles.finishButton, { backgroundColor: tc.accent }]}
                    onPress={() => {
                        // TODO: Save outfit look
                        router.back();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Finish styling look"
                >
                    <Text style={styles.finishButtonText}>Finish Look</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </TouchableOpacity>
            </View>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        fontFamily: FontFamily.headingMedium,
    },
    resetText: {
        fontSize: 15,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },
    avatarContainer: {
        height: 320,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
    },
    avatarPlaceholder: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    avatarBody: {
        alignItems: 'center',
    },
    avatarHead: {
        width: 70,
        height: 70,
        borderRadius: 35,
        marginBottom: -5,
    },
    avatarTorso: {
        width: 120,
        height: 160,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarItemImage: {
        width: '70%',
        height: '80%',
    },
    guideDashed: {
        position: 'absolute',
        top: 30,
        left: width * 0.15,
        right: width * 0.15,
        height: 200,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: BorderRadius.md,
        opacity: 0.4,
    },
    skinToneRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingTop: Spacing.md,
    },
    skinToneDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    loadingContainer: {
        paddingVertical: Spacing.xxxl,
        alignItems: 'center',
    },
    itemsContainer: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        gap: Spacing.md,
    },
    itemCard: {
        width: 120,
        alignItems: 'center',
    },
    itemImage: {
        width: 110,
        height: 120,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        position: 'relative',
        overflow: 'hidden',
    },
    checkmark: {
        position: 'absolute',
        top: Spacing.xs,
        right: Spacing.xs,
    },
    itemLabel: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        marginTop: Spacing.sm,
        letterSpacing: 0.5,
        textTransform: 'capitalize',
    },
    bottomActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderTopWidth: 1,
    },
    bottomLeft: {
        flexDirection: 'row',
        gap: Spacing.xl,
    },
    actionBtn: {
        alignItems: 'center',
        gap: 4,
    },
    actionLabel: {
        fontSize: 10,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        letterSpacing: 0.5,
    },
    finishButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.round,
        ...Shadows.sm,
    },
    finishButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
    },
});
