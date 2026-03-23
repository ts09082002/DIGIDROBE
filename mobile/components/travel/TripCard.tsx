import React, { useState } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme, useThemeColors } from '../../context/ThemeContext';
import { ConfirmDialog } from '../ConfirmDialog';
import type { Trip } from '../../services/trips-local';
import { getTripStatus, getDaysUntil, getTripDuration } from '../../services/trips-local';
import type { WardrobeItem } from '../../services/api';

type Props = {
    trip: Trip;
    itemsMap: Map<string, WardrobeItem>;
    onPress: () => void;
    onDelete: () => void;
};

function formatDateShort(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
}

const STATUS_GRADIENTS: Record<string, [string, string]> = {
    upcoming: ['#A0627A', '#7A4A5E'],
    ongoing:  ['#2D9E6B', '#1E7A52'],
    completed: ['#6B7280', '#4B5563'],
};

const STATUS_ICONS: Record<string, string> = {
    upcoming: 'airplane-outline',
    ongoing: 'navigate-outline',
    completed: 'checkmark-circle-outline',
};

export default function TripCard({ trip, itemsMap, onPress, onDelete }: Props) {
    const tc = useThemeColors();
    const { isDarkMode } = useTheme();
    const [confirmVisible, setConfirmVisible] = useState(false);

    const status = getTripStatus(trip);
    const daysUntil = getDaysUntil(trip);
    const duration = getTripDuration(trip);

    const today = new Date().toISOString().split('T')[0];
    const currentDayIndex = trip.days.findIndex(d => d.date === today);
    const currentDayNum = currentDayIndex >= 0 ? currentDayIndex + 1 : null;

    // Gather preview items (up to 5)
    const previewItems: WardrobeItem[] = [];
    for (const day of trip.days) {
        for (const itemId of day.itemIds) {
            if (previewItems.length >= 5) break;
            const item = itemsMap.get(itemId);
            if (item && !previewItems.find(p => p.id === item.id)) {
                previewItems.push(item);
            }
        }
        if (previewItems.length >= 5) break;
    }

    const [gradFrom, gradTo] = STATUS_GRADIENTS[status] ?? STATUS_GRADIENTS.upcoming;
    const iconName = STATUS_ICONS[status] ?? 'airplane-outline';

    const statusLabel =
        status === 'upcoming'
            ? daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`
            : status === 'ongoing'
            ? currentDayNum !== null ? `Day ${currentDayNum} of ${duration}` : 'Ongoing'
            : 'Completed';

    const packedCount = trip.days.reduce((sum, d) => sum + d.itemIds.length, 0);

    return (
        <>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: tc.card }]}
                onPress={onPress}
                onLongPress={() => setConfirmVisible(true)}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={`Trip to ${trip.destination}, ${statusLabel}`}
            >
                {/* ── Hero gradient header ── */}
                <LinearGradient
                    colors={[gradFrom, gradTo]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.hero}
                >
                    {/* Icon badge */}
                    <View style={styles.iconBadge}>
                        <Ionicons name={iconName as any} size={18} color="#fff" />
                    </View>

                    {/* Destination + dates */}
                    <View style={styles.heroBody}>
                        <Text style={styles.destination} numberOfLines={1}>
                            {trip.destination}
                        </Text>
                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.dateText}>
                                {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)}
                            </Text>
                        </View>
                    </View>

                    {/* Status pill top-right */}
                    <View style={styles.statusPill}>
                        <Text style={styles.statusText}>{statusLabel}</Text>
                    </View>
                </LinearGradient>

                {/* ── Stats row ── */}
                <View style={[styles.statsRow, { borderBottomColor: tc.border }]}>
                    <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: tc.textPrimary }]}>{duration}</Text>
                        <Text style={[styles.statLabel, { color: tc.textMuted }]}>days</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: tc.border }]} />
                    <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: tc.textPrimary }]}>{packedCount}</Text>
                        <Text style={[styles.statLabel, { color: tc.textMuted }]}>items</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: tc.border }]} />
                    <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: tc.textPrimary }]}>{trip.days.length}</Text>
                        <Text style={[styles.statLabel, { color: tc.textMuted }]}>outfits</Text>
                    </View>
                    {trip.occasion ? (
                        <>
                            <View style={[styles.statDivider, { backgroundColor: tc.border }]} />
                            <View style={[styles.occasionPill, { backgroundColor: tc.surface }]}>
                                <Text style={[styles.occasionText, { color: tc.accent }]}>
                                    {trip.occasion.charAt(0).toUpperCase() + trip.occasion.slice(1)}
                                </Text>
                            </View>
                        </>
                    ) : null}
                </View>

                {/* ── Wardrobe preview strip ── */}
                <View style={styles.previewStrip}>
                    {previewItems.length > 0 ? (
                        <View style={styles.thumbRow}>
                            {previewItems.map((item, i) => (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.thumbWrap,
                                        { marginLeft: i === 0 ? 0 : -10, zIndex: previewItems.length - i },
                                        { borderColor: isDarkMode ? '#2A2A36' : '#fff' },
                                    ]}
                                >
                                    <Image
                                        source={{ uri: item.processedUrl || item.originalUrl }}
                                        style={[styles.thumb, { backgroundColor: tc.surface }]}
                                    />
                                </View>
                            ))}
                            <Text style={[styles.previewLabel, { color: tc.textMuted }]}>
                                {packedCount > 5 ? `+${packedCount - 5} more` : 'packed'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.emptyPreview}>
                            <Ionicons name="shirt-outline" size={14} color={tc.textMuted} />
                            <Text style={[styles.previewLabel, { color: tc.textMuted }]}>No items packed yet</Text>
                        </View>
                    )}

                    <Ionicons name="chevron-forward" size={16} color={tc.textMuted} style={{ marginLeft: 'auto' }} />
                </View>
            </TouchableOpacity>

            <ConfirmDialog
                visible={confirmVisible}
                title="Delete Trip"
                description={`Are you sure you want to delete your trip to ${trip.destination}?`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                destructive
                onConfirm={() => {
                    setConfirmVisible(false);
                    onDelete();
                }}
                onCancel={() => setConfirmVisible(false)}
            />
        </>
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
    /* Hero */
    hero: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: Spacing.lg,
        paddingBottom: Spacing.md,
        gap: Spacing.md,
    },
    iconBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    heroBody: {
        flex: 1,
    },
    destination: {
        fontSize: 22,
        fontFamily: FontFamily.heading,
        fontStyle: 'italic',
        color: '#fff',
        letterSpacing: -0.2,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    dateText: {
        fontSize: 12,
        fontFamily: FontFamily.body,
        color: 'rgba(255,255,255,0.82)',
        letterSpacing: 0.3,
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.round,
        backgroundColor: 'rgba(255,255,255,0.22)',
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    statusText: {
        fontSize: 11,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        color: '#fff',
    },
    /* Stats */
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: Spacing.md,
    },
    stat: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontFamily: FontFamily.heading,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 10,
        fontFamily: FontFamily.body,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginTop: 1,
    },
    statDivider: {
        width: StyleSheet.hairlineWidth,
        height: 24,
    },
    occasionPill: {
        marginLeft: 'auto' as any,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.round,
    },
    occasionText: {
        fontSize: 11,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    /* Preview strip */
    previewStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    thumbRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    thumbWrap: {
        borderRadius: 20,
        borderWidth: 2,
    },
    thumb: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    previewLabel: {
        fontSize: 12,
        fontFamily: FontFamily.body,
        marginLeft: Spacing.sm,
    },
    emptyPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
});
