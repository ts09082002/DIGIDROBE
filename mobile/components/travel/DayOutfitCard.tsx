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
import { FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
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

const SLOT_WIDTH = 80;
const SLOT_HEIGHT = 96;

export default function DayOutfitCard({ day, dayIndex, dayLabel, items, onAISuggest, onManualPick }: Props) {
    const tc = useThemeColors();
    const hasOutfit = items.length > 0;

    return (
        <View style={[styles.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.dayLabel, { color: tc.textPrimary }]}>{dayLabel}</Text>
                {hasOutfit ? (
                    <TouchableOpacity
                        onPress={onManualPick}
                        accessibilityRole="button"
                        accessibilityLabel={`Change outfit for ${dayLabel}`}
                    >
                        <Text style={[styles.changeLink, { color: tc.accent }]}>Change</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Outfit items */}
            {hasOutfit ? (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.itemsRow}
                >
                    {items.map((item) => (
                        <View key={item.id} style={styles.itemSlot}>
                            <Image
                                source={{ uri: item.processedUrl || item.originalUrl }}
                                style={[styles.itemImage, { backgroundColor: tc.surface }]}
                                resizeMode="cover"
                            />
                            <Text style={[styles.itemCategory, { color: tc.textSecondary }]} numberOfLines={1}>
                                {item.subCategory || item.category}
                            </Text>
                        </View>
                    ))}
                    {/* Add more slot */}
                    <TouchableOpacity
                        style={[styles.emptySlot, { borderColor: tc.border }]}
                        onPress={onManualPick}
                        accessibilityRole="button"
                        accessibilityLabel={`Add more items to ${dayLabel}`}
                    >
                        <Ionicons name="add" size={24} color={tc.textMuted} />
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <View style={styles.emptyState}>
                    <TouchableOpacity
                        style={[styles.emptySlot, { borderColor: tc.border }]}
                        onPress={onManualPick}
                        accessibilityRole="button"
                        accessibilityLabel={`Pick outfit for ${dayLabel}`}
                    >
                        <Ionicons name="add" size={24} color={tc.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.aiBtn, { backgroundColor: tc.accentLight }]}
                        onPress={onAISuggest}
                        accessibilityRole="button"
                        accessibilityLabel={`AI suggest outfit for ${dayLabel}`}
                    >
                        <Ionicons name="sparkles" size={14} color={tc.accent} />
                        <Text style={[styles.aiBtnText, { color: tc.accent }]}>AI Suggest</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.lg,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    dayLabel: {
        fontSize: 16,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    changeLink: {
        fontSize: 14,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    itemsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    itemSlot: {
        alignItems: 'center',
        width: SLOT_WIDTH,
    },
    itemImage: {
        width: SLOT_WIDTH,
        height: SLOT_HEIGHT,
        borderRadius: BorderRadius.md,
    },
    itemCategory: {
        fontSize: 11,
        fontFamily: FontFamily.body,
        marginTop: Spacing.xs,
        textTransform: 'capitalize',
    },
    emptySlot: {
        width: SLOT_WIDTH,
        height: SLOT_HEIGHT,
        borderRadius: BorderRadius.md,
        borderWidth: 2,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    aiBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
        gap: Spacing.xs,
    },
    aiBtnText: {
        fontSize: 13,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
});
