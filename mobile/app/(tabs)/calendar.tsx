import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Modal,
    FlatList,
    Image,
    Dimensions,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { api, OOTD, WardrobeItem } from '../../services/api';
import { Toast } from '../../components/Toast';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 60) / 3;

// Day names
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CalendarScreen() {
    const { isDarkMode } = useTheme();
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
    const insets = useSafeAreaInsets();

    const theme = {
        background: isDarkMode ? '#1A1A1A' : Colors.warmGray,
        card: isDarkMode ? '#242424' : Colors.white,
        text: isDarkMode ? '#FFFFFF' : Colors.charcoal,
        textSecondary: isDarkMode ? '#A0A0A0' : Colors.darkGray,
        border: isDarkMode ? '#333333' : Colors.lightGray,
        gold: Colors.gold,
        inputBg: isDarkMode ? '#2A2A2A' : '#F5F5F5',
    };

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Build week view: -3 to +3 days around today
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
                api.getOOTDByMonth(year, month),
                api.getWardrobeItems(),
            ]);
            setOotds(ootdRes);
            const ready = wardrobeRes.filter(i => i.status === 'done' && i.processedUrl);
            setWardrobe(ready);

            // Build stats: count how many times each item was worn
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
            await api.saveOOTD(selectedDay, selectedItems, notes);
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
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Planning</Text>
                <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color={theme.text} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.gold} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scroll}
                >

                    {/* Month + Week Strip */}
                    <Text style={[styles.monthLabel, { color: theme.textSecondary }]}>
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
                                        { backgroundColor: theme.card, borderColor: isToday ? theme.gold : theme.border },
                                        isToday && styles.todayCard,
                                    ]}
                                    onPress={() => openPicker(day.dateStr)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.dayName, { color: isToday ? theme.gold : theme.textSecondary }]}>
                                        {day.dayName}
                                    </Text>
                                    <Text style={[styles.dayDate, { color: isToday ? theme.gold : theme.text }]}>
                                        {day.date.getDate()}
                                    </Text>

                                    {hasOutfit && previewItems.length > 0 ? (
                                        <View style={styles.previewStack}>
                                            {previewItems.slice(0, 2).map((item, i) => (
                                                <Image
                                                    key={i}
                                                    source={{ uri: api.getImageUrl(item.processedUrl) }}
                                                    style={[styles.previewImg, { marginTop: i > 0 ? -8 : 0 }]}
                                                />
                                            ))}
                                        </View>
                                    ) : (
                                        <View style={[styles.addDot, { backgroundColor: hasOutfit ? theme.gold : theme.border }]}>
                                            <Ionicons name={hasOutfit ? 'shirt' : 'add'} size={10} color={hasOutfit ? Colors.white : theme.textSecondary} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Today's Outfit Preview */}
                    {ootdForDay(todayStr) && (
                        <View style={[styles.todaySection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <View style={styles.todayHeader}>
                                <Ionicons name="today" size={18} color={theme.gold} />
                                <Text style={[styles.todaySectionTitle, { color: theme.text }]}>Today's Planned Look</Text>
                                <TouchableOpacity onPress={() => openPicker(todayStr)}>
                                    <Text style={[styles.editLink, { color: theme.gold }]}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {itemsForOOTD(ootdForDay(todayStr)!).map((item, i) => (
                                    <Image
                                        key={i}
                                        source={{ uri: api.getImageUrl(item.processedUrl) }}
                                        style={styles.todayItemImg}
                                        resizeMode="contain"
                                    />
                                ))}
                            </ScrollView>
                            {ootdForDay(todayStr)!.notes ? (
                                <Text style={[styles.todayNotes, { color: theme.textSecondary }]}>
                                    📝 {ootdForDay(todayStr)!.notes}
                                </Text>
                            ) : null}
                        </View>
                    )}

                    {/* Most Worn Stats */}
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MOST WORN THIS MONTH</Text>
                    <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        {statsItems.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="shirt-outline" size={32} color={theme.border} />
                                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                    Plan outfits to see stats
                                </Text>
                            </View>
                        ) : (
                            statsItems.map(({ item, count }, i) => (
                                <View key={i} style={[styles.statRow, { borderBottomColor: theme.border }]}>
                                    <Image
                                        source={{ uri: api.getImageUrl(item.processedUrl) }}
                                        style={styles.statImg}
                                        resizeMode="contain"
                                    />
                                    <View style={styles.statInfo}>
                                        <Text style={[styles.statName, { color: theme.text }]} numberOfLines={1}>
                                            {item.name || item.category}
                                        </Text>
                                        <Text style={[styles.statCat, { color: theme.textSecondary }]}>
                                            {item.category}
                                        </Text>
                                    </View>
                                    <View style={[styles.statBadge, { backgroundColor: theme.gold }]}>
                                        <Text style={styles.statBadgeText}>{count}×</Text>
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
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                    <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

                    <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                        <TouchableOpacity onPress={() => setPickerVisible(false)}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Plan Outfit</Text>
                        <TouchableOpacity onPress={saveOutfit} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator size="small" color={theme.gold} />
                            ) : (
                                <Text style={[styles.saveBtn, { color: theme.gold }]}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {selectedDay && (
                        <Text style={[styles.modalDate, { color: theme.textSecondary }]}>
                            {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                    )}

                    {/* Notes input */}
                    <View style={[styles.notesContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                        <Ionicons name="pencil-outline" size={16} color={theme.textSecondary} />
                        <TextInput
                            style={[styles.notesInput, { color: theme.text }]}
                            placeholder="Add a note (optional)..."
                            placeholderTextColor={theme.textSecondary}
                            value={notes}
                            onChangeText={setNotes}
                        />
                    </View>

                    <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>
                        TAP ITEMS TO SELECT  •  {selectedItems.length} selected
                    </Text>

                    {wardrobe.length === 0 ? (
                        <View style={styles.center}>
                            <Ionicons name="shirt-outline" size={48} color={theme.border} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                Add items to your wardrobe first
                            </Text>
                        </View>
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
                                            { borderColor: isSelected ? theme.gold : 'transparent' },
                                            isSelected && styles.pickerItemSelected,
                                        ]}
                                        onPress={() => toggleItem(item.id)}
                                        activeOpacity={0.8}
                                    >
                                        <Image
                                            source={{ uri: api.getImageUrl(item.processedUrl) }}
                                            style={styles.pickerImg}
                                            resizeMode="cover"
                                        />
                                        {isSelected && (
                                            <View style={styles.checkOverlay}>
                                                <Ionicons name="checkmark-circle" size={24} color={theme.gold} />
                                            </View>
                                        )}
                                        <Text style={[styles.pickerCat, { color: theme.textSecondary }]} numberOfLines={1}>
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
        </SafeAreaView>
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
    headerTitle: { fontSize: 28, fontWeight: '700' },
    refreshBtn: { padding: 8 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    scroll: { flexGrow: 1, paddingBottom: 100 },
    monthLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginHorizontal: 20,
        marginTop: 8,
        marginBottom: 10,
    },
    weekStrip: { paddingHorizontal: 12, marginBottom: 20 },
    dayCard: {
        width: 68,
        minHeight: 110,
        borderRadius: 16,
        borderWidth: 1.5,
        marginHorizontal: 4,
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        gap: 6,
        ...Shadows.sm,
    },
    todayCard: { borderWidth: 2 },
    dayName: { fontSize: 11, fontWeight: '600' },
    dayDate: { fontSize: 20, fontWeight: '700' },
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
        marginHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
    },
    todayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    todaySectionTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
    editLink: { fontSize: 14, fontWeight: '600' },
    todayItemImg: { width: 80, height: 100, borderRadius: 10, marginRight: 8 },
    todayNotes: { marginTop: 10, fontSize: 13, fontStyle: 'italic' },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginHorizontal: 20,
        marginBottom: 10,
    },
    statsCard: {
        marginHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    emptyState: { alignItems: 'center', padding: 24, gap: 10 },
    emptyText: { fontSize: 14, fontStyle: 'italic', textAlign: 'center' },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    statImg: { width: 48, height: 54, borderRadius: 8 },
    statInfo: { flex: 1 },
    statName: { fontSize: 14, fontWeight: '600' },
    statCat: { fontSize: 12, textTransform: 'capitalize', marginTop: 2 },
    statBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statBadgeText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
    // Modal
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 17, fontWeight: '700' },
    saveBtn: { fontSize: 16, fontWeight: '700' },
    modalDate: {
        fontSize: 14,
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 8,
    },
    notesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
        marginBottom: 12,
    },
    notesInput: { flex: 1, fontSize: 14 },
    pickerLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginHorizontal: 20,
        marginBottom: 10,
    },
    pickerGrid: { paddingHorizontal: 16, paddingBottom: 40 },
    pickerItem: {
        width: ITEM_SIZE,
        margin: 4,
        borderRadius: 12,
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
        textAlign: 'center',
        paddingVertical: 4,
        textTransform: 'capitalize',
    },
});



