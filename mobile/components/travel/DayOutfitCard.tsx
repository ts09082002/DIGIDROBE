import React from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme, useThemeColors } from '../../context/ThemeContext';
import type { TripDay } from '../../services/trips-local';
import type { WardrobeItem } from '../../services/api';

type Props = {
    day: TripDay;
    dayIndex: number;
    dayLabel: string;
    items: WardrobeItem[];
    onAISuggest: () => void;
    onManualPick: () => void;
};

// Maps rough category → accent color for dot indicators
const CATEGORY_COLORS: Record<string, string> = {
    topwear: '#A0627A',
    bottomwear: '#6B8FAB',
    footwear: '#8A7A60',
    outerwear: '#5A7A6A',
    accessory: '#A08060',
};

function getCatColor(cat?: string): string {
    const key = (cat ?? '').toLowerCase();
    return CATEGORY_COLORS[key] ?? '#9E9E9E';
}

export default function DayOutfitCard({ day, dayIndex, dayLabel, items, onAISuggest, onManualPick }: Props) {
    const tc = useThemeColors();
    const { isDarkMode } = useTheme();
    const hasOutfit = items.length > 0;

    // Parse date label — "Day 1 - Mar 24"
    const parts = dayLabel.split(' - ');
    const dayNum = parts[0] ?? dayLabel;   // "Day 1"
    const dateStr = parts[1] ?? '';        // "Mar 24"

    return (
        <View style={[styles.card, { backgroundColor: tc.card }]}>
            {/* ── Top accent bar ── */}
            <LinearGradient
                colors={['#A0627A', '#7A4A5E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.accentBar}
            />

            {/* ── Header row ── */}
            <View style={styles.header}>
                {/* Left: day badge */}
                <View style={styles.dayBadge}>
                    <View style={[styles.dayNumWrap, { backgroundColor: isDarkMode ? '#2A1E25' : '#F5EDF1' }]}>
                        <Text style={[styles.dayNum, { color: tc.accent }]}>{dayIndex + 1}</Text>
                    </View>
                    <View style={styles.dayTextBlock}>
                        <Text style={[styles.dayWord, { color: tc.textPrimary }]}>
                            {dayNum.replace(/^\d+/, '').trim() || 'Day'}
                        </Text>
                        {dateStr ? (
                            <Text style={[styles.dateStr, { color: tc.textMuted }]}>{dateStr}</Text>
                        ) : null}
                    </View>
                </View>

                {/* Right: status + actions */}
                <View style={styles.headerRight}>
                    {hasOutfit ? (
                        <>
                            <View style={[styles.statusPill, { backgroundColor: isDarkMode ? '#1A2E1F' : '#EDFAF3' }]}>
                                <View style={[styles.statusDot, { backgroundColor: '#2D9E6B' }]} />
                                <Text style={[styles.statusText, { color: '#2D9E6B' }]}>Planned</Text>
                            </View>
                            <TouchableOpacity
                                onPress={onManualPick}
                                style={[styles.changeBtn, { borderColor: tc.border }]}
                                accessibilityRole="button"
                            >
                                <Ionicons name="swap-horizontal-outline" size={14} color={tc.textSecondary} />
                                <Text style={[styles.changeBtnText, { color: tc.textSecondary }]}>Edit</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={[styles.statusPill, { backgroundColor: isDarkMode ? '#2A2020' : '#FFF3F3' }]}>
                            <View style={[styles.statusDot, { backgroundColor: '#E57373' }]} />
                            <Text style={[styles.statusText, { color: '#E57373' }]}>Empty</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* ── Outfit items ── */}
            {hasOutfit ? (
                <>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.itemsRow}
                    >
                        {items.map((item) => {
                            const catColor = getCatColor(item.category);
                            return (
                                <View key={item.id} style={styles.itemSlot}>
                                    <View style={[styles.imageWrap, { backgroundColor: isDarkMode ? '#1C1C24' : '#F2F0EC' }]}>
                                        <Image
                                            source={{ uri: item.processedUrl || item.originalUrl }}
                                            style={styles.itemImage}
                                            resizeMode="contain"
                                        />
                                        {/* Category color bar bottom */}
                                        <View style={[styles.catBar, { backgroundColor: catColor }]} />
                                    </View>
                                    <Text style={[styles.itemCategory, { color: tc.textMuted }]} numberOfLines={1}>
                                        {item.subCategory || item.category}
                                    </Text>
                                </View>
                            );
                        })}

                        {/* Add more slot */}
                        <TouchableOpacity
                            style={[styles.addSlot, { borderColor: tc.border, backgroundColor: tc.surface }]}
                            onPress={onManualPick}
                            accessibilityRole="button"
                        >
                            <Ionicons name="add" size={22} color={tc.accent} />
                            <Text style={[styles.addSlotText, { color: tc.accent }]}>Add</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* ── Footer: item count + AI re-suggest ── */}
                    <View style={[styles.footer, { borderTopColor: tc.border }]}>
                        <View style={styles.countPill}>
                            <Ionicons name="shirt-outline" size={12} color={tc.textMuted} />
                            <Text style={[styles.countText, { color: tc.textMuted }]}>
                                {items.length} item{items.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.aiRebtn, { backgroundColor: tc.accentLight }]}
                            onPress={onAISuggest}
                            accessibilityRole="button"
                        >
                            <Ionicons name="sparkles" size={12} color={tc.accent} />
                            <Text style={[styles.aiRebtnText, { color: tc.accent }]}>Re-suggest</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                /* ── Empty state ── */
                <View style={styles.emptyState}>
                    {/* Dashed placeholder slots */}
                    {[0, 1, 2].map((i) => (
                        <View
                            key={i}
                            style={[
                                styles.emptySlot,
                                { borderColor: isDarkMode ? '#3A3A4A' : '#D8D4CF', backgroundColor: isDarkMode ? '#1C1C24' : '#F7F5F2' },
                            ]}
                        >
                            <Ionicons name="shirt-outline" size={20} color={tc.textMuted} style={{ opacity: 0.4 }} />
                        </View>
                    ))}

                    <View style={styles.emptyActions}>
                        <TouchableOpacity
                            style={[styles.aiSuggestBtn, { backgroundColor: tc.accent }]}
                            onPress={onAISuggest}
                            accessibilityRole="button"
                        >
                            <Ionicons name="sparkles" size={14} color="#fff" />
                            <Text style={styles.aiSuggestBtnText}>AI Suggest</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.manualPickBtn, { borderColor: tc.border }]}
                            onPress={onManualPick}
                            accessibilityRole="button"
                        >
                            <Text style={[styles.manualPickText, { color: tc.textSecondary }]}>Pick manually</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: BorderRadius.xl,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
        overflow: 'hidden',
        ...Shadows.md,
    },
    accentBar: {
        height: 3,
        width: '100%',
    },
    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    dayBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    dayNumWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayNum: {
        fontSize: 20,
        fontFamily: FontFamily.heading,
        fontWeight: '700',
        fontStyle: 'italic',
    },
    dayTextBlock: {
        justifyContent: 'center',
    },
    dayWord: {
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    dateStr: {
        fontSize: 11,
        fontFamily: FontFamily.body,
        marginTop: 1,
        letterSpacing: 0.3,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.round,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    changeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BorderRadius.round,
        borderWidth: 1,
    },
    changeBtnText: {
        fontSize: 12,
        fontFamily: FontFamily.bodyMedium,
    },
    /* Items */
    itemsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    itemSlot: {
        alignItems: 'center',
        width: 78,
    },
    imageWrap: {
        width: 78,
        height: 100,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    catBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    itemCategory: {
        fontSize: 10,
        fontFamily: FontFamily.body,
        marginTop: 5,
        textTransform: 'capitalize',
        textAlign: 'center',
        letterSpacing: 0.2,
    },
    addSlot: {
        width: 78,
        height: 100,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    addSlotText: {
        fontSize: 11,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    /* Footer */
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    countPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    countText: {
        fontSize: 12,
        fontFamily: FontFamily.body,
    },
    aiRebtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: Spacing.md,
        paddingVertical: 5,
        borderRadius: BorderRadius.round,
    },
    aiRebtnText: {
        fontSize: 12,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    /* Empty state */
    emptyState: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
        flexWrap: 'wrap',
    },
    emptySlot: {
        width: 78,
        height: 100,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyActions: {
        flex: 1,
        gap: Spacing.sm,
        minWidth: 110,
    },
    aiSuggestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: BorderRadius.round,
    },
    aiSuggestBtnText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    manualPickBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: BorderRadius.round,
        borderWidth: 1,
    },
    manualPickText: {
        fontSize: 12,
        fontFamily: FontFamily.bodyMedium,
    },
});
