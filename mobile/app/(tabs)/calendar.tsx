import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    FlatList,
    Image,
    Dimensions,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme, useThemeColors } from '../../context/ThemeContext';
import { OOTD, WardrobeItem } from '../../services/api';
import * as wardrobeLocal from '../../services/wardrobe-local';
import * as ootdLocal from '../../services/ootd-local';
import { Toast } from '../../components/Toast';
import ScreenContainer from '../../components/ui/ScreenContainer';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 60) / 3;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CalendarScreen() {
    const { isDarkMode } = useTheme();
    const tc = useThemeColors();
    const [loading, setLoading] = useState(false);
    const [ootds, setOotds] = useState<OOTD[]>([]);
    const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [statsItems, setStatsItems] = useState<{ item: WardrobeItem; count: number }[]>([]);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const weekDays: { date: Date; dateStr: string; dayName: string }[] = [];
    for (let i = -3; i <= 3; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        weekDays.push({
            date: d,
            dateStr: d.toISOString().split('T')[0],
            dayName: DAY_NAMES[d.getDay()],
        });
    }

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const year = today.getFullYear();
            const month = today.getMonth() + 1;
            const [ootdRes, wardrobeRes] = await Promise.all([
                ootdLocal.getOOTDByMonth(year, month),
                wardrobeLocal.getAllItems(),
            ]);
            setOotds(ootdRes);
            const ready = wardrobeRes.filter(i => i.status === 'done' && i.processedUrl);
            setWardrobe(ready);

            const itemCountMap: Record<string, number> = {};
            ootdRes.forEach(o => {
                o.itemIds.forEach(id => {
                    itemCountMap[id] = (itemCountMap[id] || 0) + 1;
                });
            });
            const sorted = Object.entries(itemCountMap)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5);
            const statsWithItems = sorted.map(([id, count]) => {
                const item = ready.find(i => i.id === id);
                return item ? { item, count } : null;
            }).filter((x): x is { item: WardrobeItem; count: number } => x !== null);
            setStatsItems(statsWithItems);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, []);

    const openPicker = (dateStr: string) => {
        const existing = ootds.find(o => o.date === dateStr);
        setSelectedDay(dateStr);
        setSelectedItems(existing?.itemIds ?? []);
        setNotes(existing?.notes ?? '');
        setPickerVisible(true);
    };

    const toggleItem = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const saveOutfit = async () => {
        if (!selectedDay) return;
        try {
            setSaving(true);
            await ootdLocal.saveOOTD(selectedDay, selectedItems, notes);
            setPickerVisible(false);
            await loadData();
            setToastType('success');
            setToastMessage('Your outfit has been planned');
            setToastVisible(true);
        } catch (e) {
            setToastType('error');
            setToastMessage('Could not save outfit');
            setToastVisible(true);
        } finally {
            setSaving(false);
        }
    };

    const ootdForDay = (ds: string) => ootds.find(o => o.date === ds);
    const itemsForOOTD = (ootd: OOTD) => ootd.itemIds.slice(0, 3).map(id => wardrobe.find(i => i.id === id)).filter(Boolean) as WardrobeItem[];

    return (
        <ScreenContainer>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: tc.textPrimary }]}>Planning</Text>
                <TouchableOpacity
                    onPress={loadData}
                    style={[styles.refreshBtn, { backgroundColor: tc.surface }]}
                    accessibilityRole="button"
                    accessibilityLabel="Refresh calendar"
                >
                    <Ionicons name="refresh" size={20} color={tc.textPrimary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.skeletonContainer}>
                    <SkeletonLoader variant="rect" height={110} style={{ marginHorizontal: Spacing.xl, marginBottom: Spacing.lg }} />
                    <SkeletonLoader variant="card" height={160} style={{ marginHorizontal: Spacing.xl }} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scroll}
                >
                    {/* Month + Week Strip */}
                    <Text style={[styles.monthLabel, { color: tc.textSecondary }]}>
                        {MONTH_NAMES[today.getMonth()].toUpperCase()} {today.getFullYear()}
                    </Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekStrip}>
                        {weekDays.map((day, idx) => {
                            const isToday = day.dateStr === todayStr;
                            const ootd = ootdForDay(day.dateStr);
                            const hasOutfit = !!ootd;
                            const previewItems = hasOutfit ? itemsForOOTD(ootd) : [];

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.dayCard,
                                        { backgroundColor: tc.card, borderColor: isToday ? tc.accent : tc.border },
                                        isToday && styles.todayCard,
                                    ]}
                                    onPress={() => openPicker(day.dateStr)}
                                    activeOpacity={0.75}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${day.dayName} ${day.date.getDate()}, ${hasOutfit ? 'outfit planned' : 'no outfit'}`}
                                >
                                    <Text style={[styles.dayName, { color: isToday ? tc.accent : tc.textSecondary }]}>
                                        {day.dayName}
                                    </Text>
                                    <Text style={[styles.dayDate, { color: isToday ? tc.accent : tc.textPrimary }]}>
                                        {day.date.getDate()}
                                    </Text>

                                    {hasOutfit && previewItems.length > 0 ? (
                                        <View style={styles.previewStack}>
                                            {previewItems.slice(0, 2).map((item, i) => (
                                                <Image
                                                    key={i}
                                                    source={{ uri: item.processedUrl }}
                                                    style={[styles.previewImg, { marginTop: i > 0 ? -8 : 0 }]}
                                                />
                                            ))}
                                        </View>
                                    ) : (
                                        <View style={[styles.addDot, { backgroundColor: hasOutfit ? tc.accent : tc.border }]}>
                                            <Ionicons name={hasOutfit ? 'shirt' : 'add'} size={10} color={hasOutfit ? '#FFF' : tc.textSecondary} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Today's Outfit Preview */}
                    {ootdForDay(todayStr) && (
                        <View style={[styles.todaySection, { backgroundColor: tc.card, borderColor: tc.border }]}>
                            <View style={styles.todayHeader}>
                                <Ionicons name="today" size={18} color={tc.accent} />
                                <Text style={[styles.todaySectionTitle, { color: tc.textPrimary }]}>Today's Planned Look</Text>
                                <TouchableOpacity onPress={() => openPicker(todayStr)}>
                                    <Text style={[styles.editLink, { color: tc.accent }]}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {itemsForOOTD(ootdForDay(todayStr)!).map((item, i) => (
                                    <Image
                                        key={i}
                                        source={{ uri: item.processedUrl }}
                                        style={styles.todayItemImg}
                                        resizeMode="contain"
                                    />
                                ))}
                            </ScrollView>
                            {ootdForDay(todayStr)!.notes ? (
                                <Text style={[styles.todayNotes, { color: tc.textSecondary }]}>
                                    {ootdForDay(todayStr)!.notes}
                                </Text>
                            ) : null}
                        </View>
                    )}

                    {/* Most Worn Stats */}
                    <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>MOST WORN THIS MONTH</Text>
                    <View style={[styles.statsCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
                        {statsItems.length === 0 ? (
                            <EmptyState
                                icon="shirt-outline"
                                title="No stats yet"
                                subtitle="Plan outfits to see your most worn items"
                            />
                        ) : (
                            statsItems.map(({ item, count }, i) => (
                                <View key={i} style={[styles.statRow, { borderBottomColor: tc.border }]}>
                                    <Image
                                        source={{ uri: item.processedUrl }}
                                        style={styles.statImg}
                                        resizeMode="contain"
                                    />
                                    <View style={styles.statInfo}>
                                        <Text style={[styles.statName, { color: tc.textPrimary }]} numberOfLines={1}>
                                            {item.name || item.category}
                                        </Text>
                                        <Text style={[styles.statCat, { color: tc.textSecondary }]}>
                                            {item.category}
                                        </Text>
                                    </View>
                                    <View style={[styles.statBadge, { backgroundColor: tc.accent }]}>
                                        <Text style={styles.statBadgeText}>{count}x</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            {/* Outfit Picker Modal */}
            <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: tc.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: tc.border }]}>
                        <TouchableOpacity onPress={() => setPickerVisible(false)} accessibilityLabel="Close">
                            <Ionicons name="close" size={24} color={tc.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: tc.textPrimary }]}>Plan Outfit</Text>
                        <TouchableOpacity onPress={saveOutfit} disabled={saving} accessibilityLabel="Save outfit">
                            {saving ? (
                                <ActivityIndicator size="small" color={tc.accent} />
                            ) : (
                                <Text style={[styles.saveBtn, { color: tc.accent }]}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {selectedDay && (
                        <Text style={[styles.modalDate, { color: tc.textSecondary }]}>
                            {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                    )}

                    <View style={[styles.notesContainer, { backgroundColor: tc.surface, borderColor: tc.border }]}>
                        <Ionicons name="pencil-outline" size={16} color={tc.textSecondary} />
                        <TextInput
                            style={[styles.notesInput, { color: tc.textPrimary }]}
                            placeholder="Add a note (optional)..."
                            placeholderTextColor={tc.textMuted}
                            value={notes}
                            onChangeText={setNotes}
                        />
                    </View>

                    <Text style={[styles.pickerLabel, { color: tc.textSecondary }]}>
                        TAP ITEMS TO SELECT  •  {selectedItems.length} selected
                    </Text>

                    {wardrobe.length === 0 ? (
                        <EmptyState
                            icon="shirt-outline"
                            title="No wardrobe items"
                            subtitle="Add items to your wardrobe first"
                        />
                    ) : (
                        <FlatList
                            data={wardrobe}
                            numColumns={3}
                            keyExtractor={i => i.id}
                            contentContainerStyle={styles.pickerGrid}
                            renderItem={({ item }) => {
                                const isSelected = selectedItems.includes(item.id);
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.pickerItem,
                                            { borderColor: isSelected ? tc.accent : 'transparent' },
                                            isSelected && styles.pickerItemSelected,
                                        ]}
                                        onPress={() => toggleItem(item.id)}
                                        activeOpacity={0.8}
                                    >
                                        <Image
                                            source={{ uri: item.processedUrl }}
                                            style={styles.pickerImg}
                                            resizeMode="cover"
                                        />
                                        {isSelected && (
                                            <View style={styles.checkOverlay}>
                                                <Ionicons name="checkmark-circle" size={24} color={tc.accent} />
                                            </View>
                                        )}
                                        <Text style={[styles.pickerCat, { color: tc.textSecondary }]} numberOfLines={1}>
                                            {item.category}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}
                </SafeAreaView>
            </Modal>

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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.sm,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    refreshBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skeletonContainer: { paddingTop: Spacing.xl },
    scroll: { flexGrow: 1, paddingBottom: 100 },
    monthLabel: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: FontFamily.bodySemiBold,
        letterSpacing: 1.5,
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
    },
    weekStrip: { paddingHorizontal: Spacing.md, marginBottom: Spacing.xl },
    dayCard: {
        width: 68,
        minHeight: 110,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        marginHorizontal: 4,
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        gap: 6,
        ...Shadows.sm,
    },
    todayCard: { borderWidth: 2 },
    dayName: { fontSize: 11, fontWeight: '600', fontFamily: FontFamily.bodySemiBold },
    dayDate: { fontSize: 20, fontWeight: '700', fontFamily: FontFamily.heading },
    previewStack: { alignItems: 'center', gap: 2 },
    previewImg: { width: 36, height: 36, borderRadius: 6 },
    addDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    todaySection: {
        marginHorizontal: Spacing.xl,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    todayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    todaySectionTitle: { flex: 1, fontSize: 15, fontWeight: '600', fontFamily: FontFamily.bodySemiBold },
    editLink: { fontSize: 14, fontWeight: '600', fontFamily: FontFamily.bodySemiBold },
    todayItemImg: { width: 80, height: 100, borderRadius: 10, marginRight: Spacing.sm },
    todayNotes: { marginTop: 10, fontSize: 13, fontFamily: FontFamily.body, fontStyle: 'italic' },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: FontFamily.bodySemiBold,
        letterSpacing: 1.5,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
    },
    statsCard: {
        marginHorizontal: Spacing.xl,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: Spacing.md,
    },
    statImg: { width: 48, height: 54, borderRadius: BorderRadius.sm },
    statInfo: { flex: 1 },
    statName: { fontSize: 14, fontWeight: '600', fontFamily: FontFamily.bodySemiBold },
    statCat: { fontSize: 12, fontFamily: FontFamily.body, textTransform: 'capitalize', marginTop: 2 },
    statBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.md,
    },
    statBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '700', fontFamily: FontFamily.bodyBold },
    // Modal
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', fontFamily: FontFamily.heading },
    saveBtn: { fontSize: 16, fontWeight: '700', fontFamily: FontFamily.bodyBold },
    modalDate: {
        fontSize: 14,
        fontFamily: FontFamily.body,
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    notesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.xl,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    notesInput: { flex: 1, fontSize: 14, fontFamily: FontFamily.body },
    pickerLabel: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: FontFamily.bodySemiBold,
        letterSpacing: 1.2,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
    },
    pickerGrid: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
    pickerItem: {
        width: ITEM_SIZE,
        margin: 4,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        borderWidth: 2,
        position: 'relative',
    },
    pickerItemSelected: { opacity: 0.95 },
    pickerImg: { width: '100%', height: ITEM_SIZE * 1.1 },
    checkOverlay: {
        position: 'absolute',
        top: 4,
        right: 4,
    },
    pickerCat: {
        fontSize: 10,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        textAlign: 'center',
        paddingVertical: 4,
        textTransform: 'capitalize',
    },
});
