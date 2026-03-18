import React, { useState } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
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

export default function TripCard({ trip, itemsMap, onPress, onDelete }: Props) {
    const tc = useThemeColors();
    const [confirmVisible, setConfirmVisible] = useState(false);

    const status = getTripStatus(trip);
    const daysUntil = getDaysUntil(trip);
    const duration = getTripDuration(trip);

    // Compute current day if ongoing
    const today = new Date().toISOString().split('T')[0];
    const currentDayIndex = trip.days.findIndex(d => d.date === today);
    const currentDayNum = currentDayIndex >= 0 ? currentDayIndex + 1 : null;

    // Gather first day's item thumbnails (up to 4)
    const previewItems: WardrobeItem[] = [];
    for (const day of trip.days) {
        for (const itemId of day.itemIds) {
            if (previewItems.length >= 4) break;
            const item = itemsMap.get(itemId);
            if (item && !previewItems.find(p => p.id === item.id)) {
                previewItems.push(item);
            }
        }
        if (previewItems.length >= 4) break;
    }

    const statusConfig = {
        upcoming: {
            label: daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`,
            bg: tc.accentLight,
            text: tc.accent,
        },
        ongoing: {
            label: 'Ongoing',
            bg: '#DCFCE7',
            text: Colors.success,
        },
        completed: {
            label: 'Completed',
            bg: tc.surface,
            text: tc.textMuted,
        },
    };

    const statusStyle = statusConfig[status];

    return (
        <>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: tc.card, borderColor: tc.border }]}
                onPress={onPress}
                onLongPress={() => setConfirmVisible(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Trip to ${trip.destination}, ${statusStyle.label}`}
            >
                {/* Top row: destination + status badge */}
                <View style={styles.topRow}>
                    <View style={styles.titleBlock}>
                        <Text style={[styles.destination, { color: tc.textPrimary }]} numberOfLines={1}>
                            {trip.destination}
                        </Text>
                        <Text style={[styles.dateRange, { color: tc.textSecondary }]}>
                            {formatDateShort(trip.startDate)} - {formatDateShort(trip.endDate)}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                            {statusStyle.label}
                        </Text>
                    </View>
                </View>

                {/* Ongoing progress */}
                {status === 'ongoing' && currentDayNum !== null && (
                    <Text style={[styles.progressText, { color: tc.textSecondary }]}>
                        Day {currentDayNum} of {duration}
                    </Text>
                )}

                {/* Bottom row: occasion pill + preview thumbnails */}
                <View style={styles.bottomRow}>
                    {trip.occasion ? (
                        <View style={[styles.occasionPill, { backgroundColor: tc.surface, borderColor: tc.border }]}>
                            <Text style={[styles.occasionText, { color: tc.textSecondary }]}>
                                {trip.occasion.charAt(0).toUpperCase() + trip.occasion.slice(1)}
                            </Text>
                        </View>
                    ) : <View />}

                    <View style={styles.previewRow}>
                        {previewItems.map((item) => (
                            <Image
                                key={item.id}
                                source={{ uri: item.processedUrl || item.originalUrl }}
                                style={[styles.previewThumb, { backgroundColor: tc.surface }]}
                            />
                        ))}
                        {previewItems.length === 0 && (
                            <View style={[styles.previewThumb, { backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center' }]}>
                                <Ionicons name="shirt-outline" size={16} color={tc.textMuted} />
                            </View>
                        )}
                    </View>
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
        borderWidth: 1,
        padding: Spacing.lg,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    titleBlock: {
        flex: 1,
        marginRight: Spacing.md,
    },
    destination: {
        fontSize: 24,
        fontFamily: FontFamily.heading,
        letterSpacing: -0.3,
    },
    dateRange: {
        fontSize: 13,
        fontFamily: FontFamily.body,
        marginTop: Spacing.xs,
    },
    statusBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.round,
    },
    statusText: {
        fontSize: 12,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    progressText: {
        fontSize: 13,
        fontFamily: FontFamily.bodyMedium,
        marginTop: Spacing.sm,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    occasionPill: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.round,
        borderWidth: 1,
    },
    occasionText: {
        fontSize: 12,
        fontFamily: FontFamily.bodyMedium,
        textTransform: 'capitalize',
    },
    previewRow: {
        flexDirection: 'row',
        gap: -8,
    },
    previewThumb: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
});
