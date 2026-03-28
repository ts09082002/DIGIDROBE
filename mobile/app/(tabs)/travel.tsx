import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Image,
    Share,
    ActivityIndicator,
    Dimensions,
    Modal,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { Toast } from '../../components/Toast';
import ScreenContainer from '../../components/ui/ScreenContainer';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import CategoryPills from '../../components/ui/CategoryPills';
import TripCard from '../../components/travel/TripCard';
import DayOutfitCard from '../../components/travel/DayOutfitCard';
import PackingChecklist from '../../components/travel/PackingChecklist';
import TripCreateModal from '../../components/travel/TripCreateModal';
import * as tripsLocal from '../../services/trips-local';
import { getAllItems } from '../../services/wardrobe-local';
import { generateStyleOfDayForWardrobe } from '../../engine';
import type { Trip, PackingItem } from '../../services/trips-local';
import type { WardrobeItem } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.sm * 2) / 3;

type ViewMode = 'list' | 'detail';
type DetailTab = 'Day by Day' | 'Packing List';

function formatDayLabel(date: string, index: number): string {
    const d = new Date(date + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `Day ${index + 1} - ${months[d.getMonth()]} ${d.getDate()}`;
}

export default function TravelScreen() {
    const tc = useThemeColors();

    // --- State ---
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [trips, setTrips] = useState<Trip[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [itemsMap, setItemsMap] = useState<Map<string, WardrobeItem>>(new Map());
    const [loading, setLoading] = useState(true);
    const [generatingDay, setGeneratingDay] = useState<number | null>(null);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [detailTab, setDetailTab] = useState<DetailTab>('Day by Day');
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [itemPickerVisible, setItemPickerVisible] = useState(false);
    const [pickingDayIndex, setPickingDayIndex] = useState<number>(0);
    const [pickedItemIds, setPickedItemIds] = useState<Set<string>>(new Set());

    // Toast
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
    }, []);

    // --- Data Loading ---
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [tripsData, itemsData] = await Promise.all([
                tripsLocal.getTrips(),
                getAllItems(),
            ]);
            setTrips(tripsData);
            setWardrobeItems(itemsData);
            const map = new Map<string, WardrobeItem>();
            for (const item of itemsData) {
                map.set(item.id, item);
            }
            setItemsMap(map);
        } catch (e) {
            showToast('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Refresh selected trip from trips array
    useEffect(() => {
        if (selectedTrip) {
            const updated = trips.find(t => t.id === selectedTrip.id);
            if (updated) setSelectedTrip(updated);
        }
    }, [trips]);

    // --- Trip CRUD ---
    const handleCreateTrip = async (destination: string, startDate: string, endDate: string, occasion: string) => {
        try {
            const newTrip = await tripsLocal.createTrip(destination, startDate, endDate, occasion);
            setTrips(prev => [...prev, newTrip].sort((a, b) => a.startDate.localeCompare(b.startDate)));
            setCreateModalVisible(false);
            setSelectedTrip(newTrip);
            setViewMode('detail');
            showToast('Trip created!', 'success');
        } catch (e) {
            showToast('Failed to create trip', 'error');
        }
    };

    const handleDeleteTrip = async (tripId: string) => {
        try {
            await tripsLocal.deleteTrip(tripId);
            setTrips(prev => prev.filter(t => t.id !== tripId));
            if (selectedTrip?.id === tripId) {
                setSelectedTrip(null);
                setViewMode('list');
            }
            showToast('Trip deleted', 'info');
        } catch (e) {
            showToast('Failed to delete trip', 'error');
        }
    };

    // --- AI Outfit Generation ---
    const handleAISuggestDay = async (dayIndex: number) => {
        if (!selectedTrip || generatingDay !== null) return;
        const day = selectedTrip.days[dayIndex];
        if (!day) return;

        try {
            setGeneratingDay(dayIndex);
            const context = {
                temperatureC: 22,
                weather: 'sunny' as const,
                occasion: (selectedTrip.occasion || 'casual') as any,
                dayOfWeek: new Date(day.date + 'T00:00:00').getDay(),
                timeOfDay: 'morning' as const,
            };
            const result = await generateStyleOfDayForWardrobe(wardrobeItems, context, day.date);
            if (result) {
                const itemIds = result.outfit.items.map(i => i.id);
                const updated = await tripsLocal.updateTripDay(selectedTrip.id, dayIndex, itemIds);
                if (updated) {
                    setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
                    setSelectedTrip(updated);
                    showToast(`Outfit generated for Day ${dayIndex + 1}`, 'success');
                }
            } else {
                showToast('Could not generate outfit. Add more items to your wardrobe.', 'error');
            }
        } catch (e) {
            showToast('AI generation failed', 'error');
        } finally {
            setGeneratingDay(null);
        }
    };

    const handleGenerateAll = async () => {
        if (!selectedTrip || generatingAll) return;

        try {
            setGeneratingAll(true);
            const dayOutfits: string[][] = [];

            for (let i = 0; i < selectedTrip.days.length; i++) {
                const day = selectedTrip.days[i];
                const context = {
                    temperatureC: 22,
                    weather: 'sunny' as const,
                    occasion: (selectedTrip.occasion || 'casual') as any,
                    dayOfWeek: new Date(day.date + 'T00:00:00').getDay(),
                    timeOfDay: 'morning' as const,
                };
                const result = await generateStyleOfDayForWardrobe(wardrobeItems, context, day.date);
                if (result) {
                    dayOutfits.push(result.outfit.items.map(item => item.id));
                } else {
                    dayOutfits.push([]);
                }
            }

            const updated = await tripsLocal.setAllDayOutfits(selectedTrip.id, dayOutfits);
            if (updated) {
                setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
                setSelectedTrip(updated);
                showToast('All outfits generated!', 'success');
            }
        } catch (e) {
            showToast('Failed to generate all outfits', 'error');
        } finally {
            setGeneratingAll(false);
        }
    };

    // --- Manual item picking ---
    const openItemPicker = (dayIndex: number) => {
        if (!selectedTrip) return;
        setPickingDayIndex(dayIndex);
        const currentIds = selectedTrip.days[dayIndex]?.itemIds || [];
        setPickedItemIds(new Set(currentIds));
        setItemPickerVisible(true);
    };

    const togglePickItem = (itemId: string) => {
        setPickedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    const confirmPick = async () => {
        if (!selectedTrip) return;
        try {
            const ids = Array.from(pickedItemIds);
            const updated = await tripsLocal.updateTripDay(selectedTrip.id, pickingDayIndex, ids);
            if (updated) {
                setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
                setSelectedTrip(updated);
            }
            setItemPickerVisible(false);
        } catch (e) {
            showToast('Failed to update outfit', 'error');
        }
    };

    // --- Packing ---
    const handleTogglePacked = async (itemId: string) => {
        if (!selectedTrip) return;
        try {
            const updated = await tripsLocal.togglePacked(selectedTrip.id, itemId);
            if (updated) {
                setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
                setSelectedTrip(updated);
            }
        } catch (e) {
            showToast('Failed to update packing', 'error');
        }
    };

    const handleSharePacking = async () => {
        if (!selectedTrip) return;
        const packingItems = tripsLocal.getPackingList(selectedTrip);
        if (packingItems.length === 0) {
            showToast('No items to share yet', 'info');
            return;
        }

        const lines = [`Packing list for ${selectedTrip.destination}:\n`];
        for (const pi of packingItems) {
            const wi = itemsMap.get(pi.itemId);
            const name = wi?.name || wi?.category || 'Item';
            const days = pi.dayIndices.map(d => `Day ${d + 1}`).join(', ');
            const check = pi.packed ? '[x]' : '[ ]';
            lines.push(`${check} ${name} (${days})`);
        }

        try {
            await Share.share({ message: lines.join('\n') });
        } catch (e: any) {
            showToast(e.message || 'Could not share', 'error');
        }
    };

    // --- Renderers ---

    const renderListView = () => {
        if (loading) {
            return (
                <View style={styles.skeletonContainer}>
                    <SkeletonLoader variant="card" height={140} style={{ marginHorizontal: Spacing.xl, marginBottom: Spacing.md }} />
                    <SkeletonLoader variant="card" height={140} style={{ marginHorizontal: Spacing.xl, marginBottom: Spacing.md }} />
                    <SkeletonLoader variant="card" height={140} style={{ marginHorizontal: Spacing.xl }} />
                </View>
            );
        }

        if (trips.length === 0) {
            return (
                <EmptyState
                    icon="airplane-outline"
                    title="Plan your first trip"
                    subtitle="Create outfits for every day of your journey"
                    actionLabel="New Trip"
                    onAction={() => setCreateModalVisible(true)}
                />
            );
        }

        return (
            <FlatList
                data={trips}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <TripCard
                        trip={item}
                        itemsMap={itemsMap}
                        onPress={() => {
                            setSelectedTrip(item);
                            setDetailTab('Day by Day');
                            setViewMode('detail');
                        }}
                        onDelete={() => handleDeleteTrip(item.id)}
                    />
                )}
            />
        );
    };

    const renderDetailView = () => {
        if (!selectedTrip) return null;

        const packingItems = tripsLocal.getPackingList(selectedTrip);

        return (
            <View style={styles.detailContainer}>
                {/* Sub-tabs */}
                <View style={styles.tabsRow}>
                    <CategoryPills
                        categories={['Day by Day', 'Packing List']}
                        selected={detailTab}
                        onSelect={(tab) => setDetailTab(tab as DetailTab)}
                    />
                </View>

                {detailTab === 'Day by Day' ? (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.dayByDayContent}
                    >
                        {/* Generate All button */}
                        <TouchableOpacity
                            style={[styles.generateAllBtn, { backgroundColor: tc.accentLight }]}
                            onPress={handleGenerateAll}
                            disabled={generatingAll}
                            accessibilityRole="button"
                            accessibilityLabel="Generate outfits for all days"
                        >
                            {generatingAll ? (
                                <ActivityIndicator size="small" color={tc.accent} />
                            ) : (
                                <>
                                    <Ionicons name="sparkles" size={16} color={tc.accent} />
                                    <Text style={[styles.generateAllText, { color: tc.accent }]}>Generate All Outfits</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {selectedTrip.days.map((day, index) => {
                            const dayItems = day.itemIds
                                .map(id => itemsMap.get(id))
                                .filter((item): item is WardrobeItem => !!item);

                            return (
                                <View key={day.date}>
                                    {generatingDay === index && (
                                        <View style={styles.dayLoading}>
                                            <ActivityIndicator size="small" color={tc.accent} />
                                            <Text style={[styles.dayLoadingText, { color: tc.textSecondary }]}>
                                                Generating...
                                            </Text>
                                        </View>
                                    )}
                                    <DayOutfitCard
                                        day={day}
                                        dayIndex={index}
                                        dayLabel={formatDayLabel(day.date, index)}
                                        items={dayItems}
                                        onAISuggest={() => handleAISuggestDay(index)}
                                        onManualPick={() => openItemPicker(index)}
                                    />
                                </View>
                            );
                        })}
                    </ScrollView>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.packingContent}
                    >
                        {packingItems.length === 0 ? (
                            <EmptyState
                                icon="checkbox-outline"
                                title="No items to pack"
                                subtitle="Add outfits to your trip days first"
                            />
                        ) : (
                            <PackingChecklist
                                packingItems={packingItems}
                                itemsMap={itemsMap}
                                onToggle={handleTogglePacked}
                                onShare={handleSharePacking}
                            />
                        )}
                    </ScrollView>
                )}
            </View>
        );
    };

    return (
        <ScreenContainer>
            {/* Header */}
            {viewMode === 'list' ? (
                <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="sparkles" size={20} color={tc.accent} />
                        <Text style={[{ color: tc.textPrimary, fontSize: 24, fontWeight: '700', fontFamily: FontFamily.heading }]}>Travel</Text>
                    </View>
                    <TouchableOpacity
                        style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: tc.accent, alignItems: 'center', justifyContent: 'center', ...Shadows.sm }]}
                        onPress={() => setCreateModalVisible(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Create new trip"
                    >
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <TouchableOpacity
                            onPress={() => {
                                setViewMode('list');
                                setSelectedTrip(null);
                            }}
                            style={{ marginRight: 8, padding: 4 }}
                            accessibilityRole="button"
                            accessibilityLabel="Go back to trip list"
                        >
                            <Ionicons name="arrow-back" size={22} color={tc.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[{ color: tc.textPrimary, flex: 1, fontSize: 24, fontWeight: '700', fontFamily: FontFamily.heading }]} numberOfLines={1}>
                            {selectedTrip?.destination}
                        </Text>
                    </View>
                </View>
            )}

            {/* Content */}
            {viewMode === 'list' ? renderListView() : renderDetailView()}

            {/* Create Trip Modal */}
            <TripCreateModal
                visible={createModalVisible}
                onClose={() => setCreateModalVisible(false)}
                onCreate={handleCreateTrip}
            />

            {/* Item Picker Modal */}
            <Modal
                visible={itemPickerVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setItemPickerVisible(false)}
            >
                <Pressable style={styles.pickerOverlay} onPress={() => setItemPickerVisible(false)}>
                    <Pressable style={[styles.pickerSheet, { backgroundColor: tc.card }]} onPress={() => {}}>
                        {/* Picker header */}
                        <View style={styles.pickerHeader}>
                            <Text style={[styles.pickerTitle, { color: tc.textPrimary }]}>
                                Pick Items - Day {pickingDayIndex + 1}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setItemPickerVisible(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close item picker"
                            >
                                <Ionicons name="close" size={24} color={tc.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Item grid */}
                        <FlatList
                            data={wardrobeItems}
                            keyExtractor={(item) => item.id}
                            numColumns={3}
                            contentContainerStyle={styles.pickerGrid}
                            showsVerticalScrollIndicator={false}
                            columnWrapperStyle={styles.pickerRow}
                            renderItem={({ item }) => {
                                const isSelected = pickedItemIds.has(item.id);
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.pickerItem,
                                            { borderColor: isSelected ? tc.accent : tc.border },
                                            isSelected && { borderWidth: 2 },
                                        ]}
                                        onPress={() => togglePickItem(item.id)}
                                        activeOpacity={0.7}
                                        accessibilityRole="checkbox"
                                        accessibilityState={{ checked: isSelected }}
                                        accessibilityLabel={item.name || item.category}
                                    >
                                        <Image
                                            source={{ uri: item.processedUrl || item.originalUrl }}
                                            style={[styles.pickerItemImage, { backgroundColor: tc.surface }]}
                                            resizeMode="cover"
                                        />
                                        {isSelected && (
                                            <View style={[styles.checkBadge, { backgroundColor: tc.accent }]}>
                                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                            </View>
                                        )}
                                        <Text style={[styles.pickerItemLabel, { color: tc.textSecondary }]} numberOfLines={1}>
                                            {item.name || item.category}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />

                        {/* Confirm button */}
                        <TouchableOpacity
                            style={[styles.confirmPickBtn, { backgroundColor: tc.accent }]}
                            onPress={confirmPick}
                            accessibilityRole="button"
                            accessibilityLabel={`Confirm ${pickedItemIds.size} items`}
                        >
                            <Text style={styles.confirmPickText}>
                                Done ({pickedItemIds.size} items)
                            </Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Toast */}
            <Toast
                visible={toastVisible}
                type={toastType}
                message={toastMessage}
                onHide={() => setToastVisible(false)}
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    // --- Header ---
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
    },
    backBtn: {
        marginRight: Spacing.md,
        padding: Spacing.xs,
    },

    // --- List View ---
    listContent: {
        paddingTop: Spacing.sm,
        paddingBottom: 100,
    },
    skeletonContainer: {
        paddingTop: Spacing.lg,
    },

    // --- Detail View ---
    detailContainer: {
        flex: 1,
    },
    tabsRow: {
        paddingVertical: Spacing.sm,
    },
    dayByDayContent: {
        paddingTop: Spacing.sm,
        paddingBottom: 100,
    },
    packingContent: {
        paddingTop: Spacing.sm,
        paddingBottom: 100,
    },
    generateAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.lg,
        borderRadius: BorderRadius.round,
        gap: Spacing.sm,
    },
    generateAllText: {
        fontSize: 14,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    dayLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    dayLoadingText: {
        fontSize: 13,
        fontFamily: FontFamily.body,
    },

    // --- Item Picker Modal ---
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    pickerSheet: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        maxHeight: '80%',
        ...Shadows.lg,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    pickerTitle: {
        fontSize: 20,
        fontFamily: FontFamily.heading,
        fontWeight: '700',
    },
    pickerGrid: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.lg,
    },
    pickerRow: {
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    pickerItem: {
        width: GRID_ITEM_SIZE,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        overflow: 'hidden',
    },
    pickerItemImage: {
        width: '100%',
        height: GRID_ITEM_SIZE * 1.2,
    },
    checkBadge: {
        position: 'absolute',
        top: Spacing.xs,
        right: Spacing.xs,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerItemLabel: {
        fontSize: 11,
        fontFamily: FontFamily.body,
        textAlign: 'center',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.xs,
        textTransform: 'capitalize',
    },
    confirmPickBtn: {
        marginHorizontal: Spacing.xl,
        minHeight: 50,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xxl,
        borderRadius: BorderRadius.round,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
    },
    confirmPickText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
});
