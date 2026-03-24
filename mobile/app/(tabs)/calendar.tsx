import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme, useThemeColors } from '../../context/ThemeContext';
import { OOTD, WardrobeItem } from '../../services/api';
import * as wardrobeLocal from '../../services/wardrobe-local';
import * as ootdLocal from '../../services/ootd-local';
import { generateStyleOfDayForWardrobe } from '../../engine';
import { Toast } from '../../components/Toast';
import ScreenContainer from '../../components/ui/ScreenContainer';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import FullScreenLoader from '../../components/ui/FullScreenLoader';
import MonthGrid from '../../components/calendar/MonthGrid';
import TodayLookCard from '../../components/calendar/TodayLookCard';
import DayDetailSheet from '../../components/calendar/DayDetailSheet';
import MonthStats from '../../components/calendar/MonthStats';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function getTodayStr(): string {
    return new Date().toISOString().split('T')[0];
}

function getWeekDates(dateStr: string): string[] {
    const d = new Date(dateStr + 'T00:00:00');
    const dow = d.getDay(); // 0=Sun
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
        const wd = new Date(d);
        wd.setDate(d.getDate() - dow + i);
        dates.push(wd.toISOString().split('T')[0]);
    }
    return dates;
}

export default function CalendarScreen() {
    const { isDarkMode } = useTheme();
    const tc = useThemeColors();

    // Calendar state
    const today = getTodayStr();
    const [year, setYear] = useState(() => new Date().getFullYear());
    const [month, setMonth] = useState(() => new Date().getMonth() + 1); // 1-12
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Data state
    const [ootds, setOotds] = useState<OOTD[]>([]);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoFilling, setAutoFilling] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);

    // Sheet state
    const [sheetVisible, setSheetVisible] = useState(false);
    const [sheetDate, setSheetDate] = useState<string>(today);

    // Toast state
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

    // Derived data
    const ootdDates = useMemo(
        () => new Set(ootds.map((o) => o.date)),
        [ootds]
    );

    const todayOOTD = useMemo(
        () => ootds.find((o) => o.date === today),
        [ootds, today]
    );

    const todayItems = useMemo(() => {
        if (!todayOOTD) return [];
        return todayOOTD.itemIds
            .map((id) => wardrobeItems.find((i) => i.id === id))
            .filter((i): i is WardrobeItem => i != null);
    }, [todayOOTD, wardrobeItems]);

    const sheetOOTD = useMemo(
        () => ootds.find((o) => o.date === sheetDate) ?? null,
        [ootds, sheetDate]
    );

    // ---------- Data loading ----------

    const loadData = useCallback(async (y: number, m: number) => {
        try {
            setLoading(true);
            const [ootdRes, wardrobeRes] = await Promise.all([
                ootdLocal.getOOTDByMonth(y, m),
                wardrobeLocal.getAllItems(),
            ]);
            setOotds(ootdRes);
            setWardrobeItems(wardrobeRes.filter((i) => i.status === 'done' && i.processedUrl));
        } catch (e) {
            console.error('Calendar loadData error:', e);
            showToast('error', 'Could not load calendar data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(year, month);
    }, [year, month, loadData]);

    // ---------- Helpers ----------

    const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
        setToastType(type);
        setToastMessage(message);
        setToastVisible(true);
    }, []);

    const navigateMonth = useCallback((delta: number) => {
        setMonth((prev) => {
            let newMonth = prev + delta;
            let newYear = year;
            if (newMonth < 1) {
                newMonth = 12;
                newYear = year - 1;
            } else if (newMonth > 12) {
                newMonth = 1;
                newYear = year + 1;
            }
            setYear(newYear);
            return newMonth;
        });
    }, [year]);

    // ---------- AI suggestion ----------

    const suggestOutfit = useCallback(
        async (dateStr: string): Promise<string[]> => {
            if (wardrobeItems.length === 0) {
                showToast('info', 'Add items to your wardrobe first');
                return [];
            }
            const d = new Date(dateStr + 'T00:00:00');
            const hour = new Date().getHours();
            const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

            const result = await generateStyleOfDayForWardrobe(
                wardrobeItems as any, // WardrobeItem -> EngineWardrobeItem mapping handled internally
                {
                    temperatureC: 22,
                    weather: 'sunny',
                    occasion: 'casual',
                    dayOfWeek: d.getDay(),
                    timeOfDay,
                },
                dateStr
            );

            if (!result || !result.outfit.items.length) {
                showToast('info', 'Could not generate a suggestion');
                return [];
            }

            return result.outfit.items.map((item) => item.id);
        },
        [wardrobeItems, showToast]
    );

    // ---------- Day tap -> open sheet ----------

    const handleSelectDate = useCallback((dateStr: string) => {
        setSelectedDate(dateStr);
        setSheetDate(dateStr);
        setSheetVisible(true);
    }, []);

    // ---------- Save OOTD ----------

    const handleSaveOOTD = useCallback(
        async (itemIds: string[], notes: string) => {
            try {
                await ootdLocal.saveOOTD(sheetDate, itemIds, notes);
                setSheetVisible(false);
                setSelectedDate(null);
                await loadData(year, month);
                showToast('success', 'Outfit saved');
            } catch (e) {
                console.error('Save OOTD error:', e);
                showToast('error', 'Could not save outfit');
            }
        },
        [sheetDate, year, month, loadData, showToast]
    );

    // ---------- Today card actions ----------

    const handleTodaySuggest = useCallback(async () => {
        try {
            setIsSuggesting(true);
            const ids = await suggestOutfit(today);
            if (ids.length > 0) {
                await ootdLocal.saveOOTD(today, ids);
                await loadData(year, month);
                showToast('success', 'AI outfit planned for today');
            } else {
                showToast('error', 'Could not save suggestion');
            }
        } catch {
            showToast('error', 'Could not save suggestion');
        } finally {
            setIsSuggesting(false);
        }
    }, [today, suggestOutfit, year, month, loadData, showToast]);

    const handleTodayWoreIt = useCallback(async () => {
        // Mark today's outfit as confirmed (already saved, just show feedback)
        showToast('success', 'Outfit logged');
    }, [showToast]);

    const handleTodayPlanManually = useCallback(() => {
        setSheetDate(today);
        setSelectedDate(today);
        setSheetVisible(true);
    }, [today]);

    // ---------- Auto-fill week ----------

    const handleAutoFillWeek = useCallback(async () => {
        if (wardrobeItems.length === 0) {
            showToast('info', 'Add items to your wardrobe first');
            return;
        }
        try {
            setAutoFilling(true);
            const weekDates = getWeekDates(today);
            let filled = 0;

            for (const dateStr of weekDates) {
                if (ootdDates.has(dateStr)) continue; // skip already planned days
                const ids = await suggestOutfit(dateStr);
                if (ids.length > 0) {
                    await ootdLocal.saveOOTD(dateStr, ids);
                    filled++;
                }
            }

            await loadData(year, month);
            if (filled > 0) {
                showToast('success', `Planned ${filled} day${filled > 1 ? 's' : ''} this week`);
            } else {
                showToast('info', 'All days already planned');
            }
        } catch (e) {
            console.error('Auto-fill error:', e);
            showToast('error', 'Could not auto-fill week');
        } finally {
            setAutoFilling(false);
        }
    }, [wardrobeItems, today, ootdDates, suggestOutfit, year, month, loadData, showToast]);

    // ---------- Sheet AI suggest handler ----------

    const handleSheetAISuggest = useCallback(async (): Promise<string[]> => {
        return suggestOutfit(sheetDate);
    }, [sheetDate, suggestOutfit]);

    // ---------- Render ----------

    return (
        <ScreenContainer>
            {/* Header */}
            <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="sparkles" size={20} color={tc.accent} />
                    <Text style={[{ color: tc.textPrimary, fontSize: 24, fontWeight: '700', fontFamily: FontFamily.heading }]}>Calendar</Text>
                </View>
                <TouchableOpacity
                    onPress={handleAutoFillWeek}
                    disabled={autoFilling}
                    style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm }]}
                    accessibilityRole="button"
                    accessibilityLabel="Auto-fill week with AI suggestions"
                >
                    {autoFilling ? (
                        <ActivityIndicator size="small" color={tc.accent} />
                    ) : (
                        <Ionicons name="color-wand" size={18} color={tc.accent} />
                    )}
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.skeletonContainer}>
                    <SkeletonLoader variant="card" height={120} style={{ marginHorizontal: Spacing.xl, marginBottom: Spacing.lg }} />
                    <SkeletonLoader variant="rect" height={40} style={{ marginHorizontal: Spacing.xl, marginBottom: Spacing.md }} />
                    <SkeletonLoader variant="card" height={260} style={{ marginHorizontal: Spacing.xl, marginBottom: Spacing.lg }} />
                    <SkeletonLoader variant="rect" height={80} style={{ marginHorizontal: Spacing.xl }} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scroll}
                >
                    {/* Today's Look Card */}
                    <TodayLookCard
                        items={todayItems}
                        date={today}
                        onSuggest={handleTodaySuggest}
                        onWoreIt={handleTodayWoreIt}
                        onPlanManually={handleTodayPlanManually}
                    />

                    {/* Month navigation */}
                    <View style={styles.monthNav}>
                        <TouchableOpacity
                            onPress={() => navigateMonth(-1)}
                            style={[styles.monthNavBtn, { backgroundColor: tc.surface }]}
                            accessibilityRole="button"
                            accessibilityLabel="Previous month"
                        >
                            <Ionicons name="chevron-back" size={20} color={tc.textPrimary} />
                        </TouchableOpacity>

                        <Text style={[styles.monthLabel, { color: tc.textPrimary }]}>
                            {MONTH_NAMES[month - 1]} {year}
                        </Text>

                        <TouchableOpacity
                            onPress={() => navigateMonth(1)}
                            style={[styles.monthNavBtn, { backgroundColor: tc.surface }]}
                            accessibilityRole="button"
                            accessibilityLabel="Next month"
                        >
                            <Ionicons name="chevron-forward" size={20} color={tc.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Month Grid */}
                    <MonthGrid
                        year={year}
                        month={month}
                        ootdDates={ootdDates}
                        today={today}
                        selectedDate={selectedDate}
                        onSelectDate={handleSelectDate}
                    />

                    {/* Month Stats */}
                    <View style={{ marginTop: Spacing.xl }}>
                        <MonthStats
                            ootds={ootds}
                            items={wardrobeItems}
                            totalItems={wardrobeItems.length}
                        />
                    </View>

                    {/* Bottom padding for tab bar */}
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            {/* Day Detail Sheet */}
            <DayDetailSheet
                visible={sheetVisible}
                date={sheetDate}
                ootd={sheetOOTD}
                allItems={wardrobeItems}
                onSave={handleSaveOOTD}
                onClose={() => {
                    setSheetVisible(false);
                    setSelectedDate(null);
                }}
                onAISuggest={handleSheetAISuggest}
            />

            <FullScreenLoader visible={autoFilling} message="Planning your week..." />
            <FullScreenLoader visible={isSuggesting} message="Generating AI style..." />

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
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    autoFillBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skeletonContainer: {
        paddingTop: Spacing.xl,
    },
    scroll: {
        flexGrow: 1,
        paddingBottom: 100,
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    monthNavBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthLabel: {
        fontSize: 18,
        fontFamily: FontFamily.heading,
        fontWeight: '700',
    },
});
