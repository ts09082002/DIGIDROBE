import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { OOTD, WardrobeItem } from '../../services/api';

type MonthStatsProps = {
    ootds: OOTD[];
    items: WardrobeItem[];
    totalItems: number;
};

function computeStreak(ootds: OOTD[]): number {
    if (ootds.length === 0) return 0;
    const dateSet = new Set(ootds.map((o) => o.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const d = new Date(today);

    while (true) {
        const dateStr = d.toISOString().split('T')[0];
        if (dateSet.has(dateStr)) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

function computeCoverage(ootds: OOTD[]): number {
    const worn = new Set<string>();
    ootds.forEach((o) => o.itemIds.forEach((id) => worn.add(id)));
    return worn.size;
}

function computeMostWorn(
    ootds: OOTD[],
    items: WardrobeItem[]
): { item: WardrobeItem; count: number } | null {
    const counts: Record<string, number> = {};
    ootds.forEach((o) =>
        o.itemIds.forEach((id) => {
            counts[id] = (counts[id] || 0) + 1;
        })
    );
    const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);
    if (entries.length === 0) return null;
    const [topId, topCount] = entries[0];
    const found = items.find((i) => i.id === topId);
    return found ? { item: found, count: topCount } : null;
}

export default function MonthStats({ ootds, items, totalItems }: MonthStatsProps) {
    const tc = useThemeColors();

    const streak = useMemo(() => computeStreak(ootds), [ootds]);
    const wornCount = useMemo(() => computeCoverage(ootds), [ootds]);
    const mostWorn = useMemo(() => computeMostWorn(ootds, items), [ootds, items]);
    const coverageRatio = totalItems > 0 ? wornCount / totalItems : 0;

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>
                THIS MONTH
            </Text>

            <View style={styles.row}>
                {/* Streak card */}
                <View style={[styles.card, { backgroundColor: tc.card }, Shadows.sm]}>
                    <Ionicons name="flame-outline" size={22} color={tc.accent} />
                    <Text style={[styles.statValue, { color: tc.textPrimary }]}>{streak}</Text>
                    <Text style={[styles.statLabel, { color: tc.textMuted }]}>Day Streak</Text>
                </View>

                {/* Coverage card */}
                <View style={[styles.card, { backgroundColor: tc.card }, Shadows.sm]}>
                    <Ionicons name="shirt-outline" size={22} color={tc.accent} />
                    <Text style={[styles.statValue, { color: tc.textPrimary }]}>
                        {wornCount}/{totalItems}
                    </Text>
                    <Text style={[styles.statLabel, { color: tc.textMuted }]}>Items Worn</Text>
                    {/* Mini progress bar */}
                    <View style={[styles.progressTrack, { backgroundColor: tc.surface }]}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    backgroundColor: tc.accent,
                                    width: `${Math.min(coverageRatio * 100, 100)}%`,
                                },
                            ]}
                        />
                    </View>
                </View>

                {/* Most worn card */}
                <View style={[styles.card, { backgroundColor: tc.card }, Shadows.sm]}>
                    {mostWorn ? (
                        <>
                            <Image
                                source={{ uri: mostWorn.item.processedUrl }}
                                style={[styles.mostWornImg, { backgroundColor: tc.surface }]}
                                resizeMode="cover"
                            />
                            <Text
                                style={[styles.mostWornName, { color: tc.textPrimary }]}
                                numberOfLines={1}
                            >
                                {mostWorn.item.name || mostWorn.item.category}
                            </Text>
                            <Text style={[styles.statLabel, { color: tc.textMuted }]}>
                                {mostWorn.count}x worn
                            </Text>
                        </>
                    ) : (
                        <>
                            <Ionicons name="trophy-outline" size={22} color={tc.textMuted} />
                            <Text style={[styles.statLabel, { color: tc.textMuted, marginTop: Spacing.xs }]}>
                                No data
                            </Text>
                        </>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        letterSpacing: 1.5,
        marginBottom: Spacing.md,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    card: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.md,
        gap: Spacing.xs,
    },
    statValue: {
        fontSize: 22,
        fontFamily: FontFamily.heading,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 10,
        fontFamily: FontFamily.bodyMedium,
        fontWeight: '500',
        textAlign: 'center',
    },
    progressTrack: {
        width: '80%',
        height: 4,
        borderRadius: 2,
        marginTop: Spacing.xs,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    mostWornImg: {
        width: 36,
        height: 44,
        borderRadius: BorderRadius.sm,
    },
    mostWornName: {
        fontSize: 11,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        textAlign: 'center',
        textTransform: 'capitalize',
    },
});
