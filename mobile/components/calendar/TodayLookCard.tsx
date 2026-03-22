import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { FontFamily, Spacing, BorderRadius, Shadows, Colors } from '../../constants/theme';
import type { WardrobeItem } from '../../services/api';
import { useRouter } from 'expo-router';
import { normalizeCategory } from '../../constants/categories';

type TodayLookCardProps = {
    items: WardrobeItem[];
    date: string; // YYYY-MM-DD
    onSuggest: () => void;
    onWoreIt: () => void;
    onPlanManually: () => void;
};

const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateDay = new Date(d);
    dateDay.setHours(0, 0, 0, 0);

    const diffMs = dateDay.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const monthDay = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
    if (diffDays === 0) return `Today, ${monthDay}`;
    if (diffDays === 1) return `Tomorrow, ${monthDay}`;
    if (diffDays === -1) return `Yesterday, ${monthDay}`;
    return monthDay;
}

export default function TodayLookCard({
    items,
    date,
    onSuggest,
    onWoreIt,
    onPlanManually,
}: TodayLookCardProps) {
    const tc = useThemeColors();
    const router = useRouter();
    const hasItems = items.length > 0;
    const label = formatDateLabel(date);

    return (
        <View style={[styles.card, { backgroundColor: tc.card, borderLeftColor: tc.accent }, Shadows.sm]}>
            {/* Header */}
            <View style={styles.header}>
                <Ionicons name="today-outline" size={18} color={tc.accent} />
                <Text style={[styles.dateLabel, { color: tc.textPrimary }]}>{label}</Text>
            </View>

            {hasItems ? (
                <>
                    {/* Item thumbnails */}
                    <View style={styles.itemRow}>
                        {items.slice(0, 5).map((item) => (
                            <View key={item.id} style={styles.itemThumb}>
                                <Image
                                    source={{ uri: item.processedUrl }}
                                    style={[styles.itemImage, { backgroundColor: tc.surface }]}
                                    resizeMode="cover"
                                />
                                <Text
                                    style={[styles.itemCategory, { color: tc.textSecondary }]}
                                    numberOfLines={1}
                                >
                                    {item.category}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.woreItBtn, { backgroundColor: tc.accentLight }]}
                            onPress={onWoreIt}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Mark outfit as worn"
                        >
                            <Ionicons name="checkmark-circle" size={18} color={tc.accent} />
                            <Text style={[styles.woreItText, { color: tc.accent }]}>Wore it</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.seeOnCanvasBtn}
                            onPress={() => {
                                const topItems = items.filter(i => {
                                    const c = normalizeCategory(i.category);
                                    return c === 'topwear' || c === 'dresses';
                                });
                                const bottomItems = items.filter(i => normalizeCategory(i.category) === 'bottomwear');
                                const shoeItems = items.filter(i => normalizeCategory(i.category) === 'footwear');
                                
                                router.replace({
                                    pathname: '/(tabs)/',
                                    params: {
                                        viewOutfit: 'true',
                                        topId: topItems[0]?.id || '',
                                        bottomId: bottomItems[0]?.id || '',
                                        shoeId: shoeItems[0]?.id || ''
                                    }
                                });
                            }}
                        >
                            <Ionicons name="eye-outline" size={16} color={Colors.white} />
                            <Text style={styles.seeOnCanvasBtnText}>See on Canvas</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <>
                    <Text style={[styles.emptyText, { color: tc.textMuted }]}>
                        No outfit planned
                    </Text>
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: tc.accent }]}
                            onPress={onSuggest}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Get AI outfit suggestion"
                        >
                            <Ionicons name="sparkles" size={16} color="#FFF" />
                            <Text style={styles.actionBtnTextLight}>AI Suggest</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: tc.surface, borderColor: tc.border, borderWidth: 1 }]}
                            onPress={onPlanManually}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Plan outfit manually"
                        >
                            <Ionicons name="grid-outline" size={16} color={tc.textPrimary} />
                            <Text style={[styles.actionBtnTextDark, { color: tc.textPrimary }]}>Plan manually</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: Spacing.xl,
        borderRadius: BorderRadius.lg,
        borderLeftWidth: 4,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    dateLabel: {
        fontSize: 16,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    itemRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    itemThumb: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    itemImage: {
        width: 54,
        height: 64,
        borderRadius: BorderRadius.sm,
    },
    itemCategory: {
        fontSize: 10,
        fontFamily: FontFamily.bodyMedium,
        textTransform: 'capitalize',
    },
    woreItBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
    },
    woreItText: {
        fontSize: 14,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 14,
        fontFamily: FontFamily.body,
        marginBottom: Spacing.md,
    },
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm + 2,
        borderRadius: BorderRadius.round,
    },
    actionBtnTextLight: {
        fontSize: 14,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        color: '#FFF',
    },
    actionBtnTextDark: {
        fontSize: 14,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    seeOnCanvasBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gold,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
        gap: 8,
    },
    seeOnCanvasBtnText: {
        color: Colors.white,
        fontFamily: FontFamily.bodyBold,
        fontSize: 13,
    },
});
