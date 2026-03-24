import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

type Props = {
    visible: boolean;
    onClose: () => void;
    onCreate: (destination: string, startDate: string, endDate: string, occasion: string) => void;
};

const OCCASIONS = ['Casual', 'Business', 'Vacation', 'Formal', 'Wedding'];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function friendlyDate(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isSameDay(a: Date, b: Date | null): boolean {
    if (!b) return false;
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function startOfDay(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Returns an array of Date | null for a calendar grid (leading nulls = empty cells) */
function buildCalendarGrid(year: number, month: number): (Date | null)[] {
    const first = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const grid: (Date | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= lastDay; d++) grid.push(new Date(year, month, d));
    return grid;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TripCreateModal({ visible, onClose, onCreate }: Props) {
    const tc = useThemeColors();

    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [occasion, setOccasion] = useState('Casual');
    const [errors, setErrors] = useState<{ destination?: string; dates?: string }>({});

    // Calendar state
    const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
    const today = new Date();
    const [calYear, setCalYear] = useState(today.getFullYear());
    const [calMonth, setCalMonth] = useState(today.getMonth());

    const grid = buildCalendarGrid(calYear, calMonth);

    const resetForm = () => {
        setDestination('');
        setStartDate(null);
        setEndDate(null);
        setOccasion('Casual');
        setErrors({});
        setActivePicker(null);
        setCalYear(today.getFullYear());
        setCalMonth(today.getMonth());
    };

    const prevMonth = () => {
        if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
        else setCalMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
        else setCalMonth(m => m + 1);
    };

    const handleDayPress = (day: Date) => {
        if (activePicker === 'start') {
            setStartDate(day);
            if (endDate && startOfDay(day) > startOfDay(endDate)) setEndDate(null);
            // Auto-advance to end date
            setActivePicker('end');
        } else if (activePicker === 'end') {
            setEndDate(day);
            setActivePicker(null); // close calendar
        }
        if (errors.dates) setErrors(e => ({ ...e, dates: undefined }));
    };

    const handleCreate = () => {
        const newErrors: typeof errors = {};
        if (!destination.trim()) newErrors.destination = 'Destination is required';
        if (!startDate || !endDate) newErrors.dates = 'Please select both start and end dates';
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
        onCreate(destination.trim(), toYMD(startDate!), toYMD(endDate!), occasion.toLowerCase());
        resetForm();
    };

    const handleClose = () => { resetForm(); onClose(); };

    const togglePicker = (field: 'start' | 'end') => {
        setActivePicker(prev => (prev === field ? null : field));
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <Pressable style={styles.overlay} onPress={handleClose}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                >
                    <Pressable style={[styles.sheet, { backgroundColor: tc.card }]} onPress={() => {}}>
                        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={[styles.title, { color: tc.textPrimary }]}>New Trip</Text>
                                <TouchableOpacity onPress={handleClose} accessibilityLabel="Close">
                                    <Ionicons name="close" size={24} color={tc.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Destination */}
                            <Text style={[styles.label, { color: tc.textSecondary }]}>DESTINATION</Text>
                            <View style={[styles.inputRow, {
                                borderColor: errors.destination ? Colors.error : tc.border,
                                backgroundColor: tc.surface,
                            }]}>
                                <Ionicons name="location-outline" size={20} color={tc.textSecondary} />
                                <TextInput
                                    style={[styles.textInput, { color: tc.textPrimary }]}
                                    placeholder="Where are you going?"
                                    placeholderTextColor={tc.textMuted}
                                    value={destination}
                                    onChangeText={t => {
                                        setDestination(t);
                                        if (errors.destination) setErrors(e => ({ ...e, destination: undefined }));
                                    }}
                                />
                            </View>
                            {errors.destination && <Text style={styles.errorText}>{errors.destination}</Text>}

                            {/* Date pickers */}
                            <Text style={[styles.label, { color: tc.textSecondary, marginTop: Spacing.lg }]}>TRAVEL DATES</Text>
                            {errors.dates && <Text style={[styles.errorText, { marginBottom: Spacing.sm }]}>{errors.dates}</Text>}

                            <View style={[styles.dateRow, { borderColor: tc.border, backgroundColor: tc.surface }]}>
                                {/* Start date */}
                                <TouchableOpacity
                                    style={[
                                        styles.datePill,
                                        activePicker === 'start' && { borderColor: tc.accent, borderWidth: 1.5 },
                                    ]}
                                    onPress={() => togglePicker('start')}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={16}
                                        color={startDate ? tc.accent : tc.textMuted}
                                    />
                                    <View>
                                        <Text style={[styles.datePillLabel, { color: tc.textMuted }]}>From</Text>
                                        <Text style={[
                                            styles.datePillValue,
                                            { color: startDate ? tc.textPrimary : tc.textMuted },
                                        ]}>
                                            {startDate ? friendlyDate(startDate) : 'Select date'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <Ionicons name="arrow-forward" size={16} color={tc.textMuted} style={styles.dateArrow} />

                                {/* End date */}
                                <TouchableOpacity
                                    style={[
                                        styles.datePill,
                                        activePicker === 'end' && { borderColor: tc.accent, borderWidth: 1.5 },
                                    ]}
                                    onPress={() => togglePicker('end')}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={16}
                                        color={endDate ? tc.accent : tc.textMuted}
                                    />
                                    <View>
                                        <Text style={[styles.datePillLabel, { color: tc.textMuted }]}>To</Text>
                                        <Text style={[
                                            styles.datePillValue,
                                            { color: endDate ? tc.textPrimary : tc.textMuted },
                                        ]}>
                                            {endDate ? friendlyDate(endDate) : 'Select date'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Inline Calendar */}
                            {activePicker !== null && (
                                <View style={[styles.calendar, { backgroundColor: tc.surface, borderColor: tc.border }]}>

                                    {/* Month nav */}
                                    <View style={styles.calMonthRow}>
                                        <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                                            <Ionicons name="chevron-back" size={20} color={tc.textPrimary} />
                                        </TouchableOpacity>
                                        <Text style={[styles.calMonthTitle, { color: tc.textPrimary }]}>
                                            {MONTHS[calMonth]} {calYear}
                                        </Text>
                                        <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                                            <Ionicons name="chevron-forward" size={20} color={tc.textPrimary} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Editing hint */}
                                    <Text style={[styles.calHint, { color: tc.accent }]}>
                                        {activePicker === 'start' ? 'Pick start date' : 'Pick end date'}
                                    </Text>

                                    {/* Day-of-week headers */}
                                    <View style={styles.calDOWRow}>
                                        {DOW.map(d => (
                                            <Text key={d} style={[styles.calDOW, { color: tc.textMuted }]}>{d}</Text>
                                        ))}
                                    </View>

                                    {/* Day grid */}
                                    <View style={styles.calGrid}>
                                        {grid.map((day, i) => {
                                            if (!day) return <View key={`pad-${i}`} style={styles.calCell} />;

                                            const isStart = isSameDay(day, startDate);
                                            const isEnd = isSameDay(day, endDate);
                                            const inRange = startDate && endDate
                                                && startOfDay(day) > startOfDay(startDate)
                                                && startOfDay(day) < startOfDay(endDate);
                                            const isPast = startOfDay(day) < startOfDay(today);
                                            const isDisabledEnd = activePicker === 'end'
                                                && startDate
                                                && startOfDay(day) < startOfDay(startDate);
                                            const isDisabled = isPast || !!isDisabledEnd;
                                            const isToday = isSameDay(day, today);
                                            const isHighlighted = isStart || isEnd;

                                            return (
                                                <TouchableOpacity
                                                    key={day.toISOString()}
                                                    style={[
                                                        styles.calCell,
                                                        inRange && { backgroundColor: tc.accentLight },
                                                        isStart && styles.calCellStart,
                                                        isEnd && styles.calCellEnd,
                                                        isHighlighted && { backgroundColor: tc.accent },
                                                    ]}
                                                    onPress={() => !isDisabled && handleDayPress(day)}
                                                    activeOpacity={isDisabled ? 1 : 0.7}
                                                >
                                                    <Text style={[
                                                        styles.calDayText,
                                                        { color: tc.textPrimary },
                                                        inRange && { color: tc.accent },
                                                        isHighlighted && { color: '#FFFFFF', fontFamily: FontFamily.bodySemiBold },
                                                        isToday && !isHighlighted && { color: tc.accent, fontFamily: FontFamily.bodySemiBold },
                                                        isDisabled && { color: tc.textMuted, opacity: 0.4 },
                                                    ]}>
                                                        {day.getDate()}
                                                    </Text>
                                                    {isToday && !isHighlighted && (
                                                        <View style={[styles.todayDot, { backgroundColor: tc.accent }]} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {/* Occasion */}
                            <Text style={[styles.label, { color: tc.textSecondary, marginTop: Spacing.lg }]}>OCCASION</Text>
                            <View style={styles.occasionRow}>
                                {OCCASIONS.map(occ => {
                                    const isActive = occ === occasion;
                                    return (
                                        <TouchableOpacity
                                            key={occ}
                                            style={[
                                                styles.occasionPill,
                                                {
                                                    backgroundColor: isActive ? tc.accent : tc.surface,
                                                    borderColor: isActive ? tc.accent : tc.border,
                                                },
                                            ]}
                                            onPress={() => setOccasion(occ)}
                                        >
                                            <Text style={[
                                                styles.occasionText,
                                                { color: isActive ? '#FFFFFF' : tc.textSecondary },
                                            ]}>
                                                {occ}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Create */}
                            <TouchableOpacity
                                style={[styles.createBtn, { backgroundColor: tc.accent }]}
                                onPress={handleCreate}
                            >
                                <Ionicons name="airplane" size={18} color="#FFFFFF" />
                                <Text style={styles.createBtnText}>Create Trip</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    </Pressable>
                </KeyboardAvoidingView>
            </Pressable>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        maxHeight: '92%',
        ...Shadows.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    title: {
        fontSize: 24,
        fontFamily: FontFamily.heading,
        fontWeight: '700',
    },
    label: {
        fontSize: 12,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        letterSpacing: 1.2,
        marginBottom: Spacing.sm,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        height: 50,
        gap: Spacing.md,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: FontFamily.body,
        height: '100%',
    },
    errorText: {
        fontSize: 12,
        fontFamily: FontFamily.body,
        color: Colors.error,
        marginTop: Spacing.xs,
    },

    // ── Date row ──────────────────────────────────────────────────────────────
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        gap: 4,
    },
    datePill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    datePillLabel: {
        fontSize: 10,
        fontFamily: FontFamily.bodySemiBold,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    datePillValue: {
        fontSize: 13,
        fontFamily: FontFamily.bodyMedium,
        marginTop: 1,
    },
    dateArrow: {
        marginHorizontal: 2,
    },

    // ── Calendar ──────────────────────────────────────────────────────────────
    calendar: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        overflow: 'hidden',
    },
    calMonthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.xs,
    },
    calNavBtn: {
        padding: Spacing.sm,
    },
    calMonthTitle: {
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    calHint: {
        fontSize: 11,
        fontFamily: FontFamily.bodyMedium,
        textAlign: 'center',
        marginBottom: Spacing.sm,
        letterSpacing: 0.5,
    },
    calDOWRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    calDOW: {
        width: `${100 / 7}%`,
        textAlign: 'center',
        fontSize: 11,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    calGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 50,
    },
    calCellStart: {
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    calCellEnd: {
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
    },
    calDayText: {
        fontSize: 13,
        fontFamily: FontFamily.body,
    },
    todayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        position: 'absolute',
        bottom: 3,
    },

    // ── Occasion ──────────────────────────────────────────────────────────────
    occasionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    occasionPill: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
        borderWidth: 1,
    },
    occasionText: {
        fontSize: 13,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },

    // ── Create button ─────────────────────────────────────────────────────────
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.xxl,
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    createBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
});
