import React from 'react';
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
import Button from '../ui/Button';
import type { PackingItem } from '../../services/trips-local';
import type { WardrobeItem } from '../../services/api';

type Props = {
    packingItems: PackingItem[];
    itemsMap: Map<string, WardrobeItem>;
    onToggle: (itemId: string) => void;
    onShare: () => void;
};

function getDisplayCategory(category: string): string {
    const c = category.toLowerCase();
    if (c.includes('top') || c.includes('shirt') || c.includes('tee') || c.includes('blouse')) return 'Topwear';
    if (c.includes('bottom') || c.includes('pant') || c.includes('jean') || c.includes('skirt') || c.includes('short')) return 'Bottomwear';
    if (c.includes('shoe') || c.includes('sneaker') || c.includes('boot') || c.includes('sandal') || c.includes('foot')) return 'Footwear';
    if (c.includes('accessor') || c.includes('hat') || c.includes('bag') || c.includes('belt') || c.includes('watch') || c.includes('jewel')) return 'Accessories';
    if (c.includes('outer') || c.includes('jacket') || c.includes('coat')) return 'Outerwear';
    if (c.includes('dress') || c.includes('gown') || c.includes('jumpsuit')) return 'Dresses';
    return 'Other';
}

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
    Topwear:     { icon: 'shirt-outline',         color: '#A0627A' },
    Bottomwear:  { icon: 'ellipse-outline',        color: '#6B8FAB' },
    Footwear:    { icon: 'footsteps-outline',      color: '#8A7A60' },
    Accessories: { icon: 'watch-outline',          color: '#A08060' },
    Outerwear:   { icon: 'cloudy-outline',         color: '#5A7A6A' },
    Dresses:     { icon: 'color-palette-outline',  color: '#9A6AB0' },
    Other:       { icon: 'albums-outline',         color: '#808080' },
};

export default function PackingChecklist({ packingItems, itemsMap, onToggle, onShare }: Props) {
    const tc = useThemeColors();
    const { isDarkMode } = useTheme();

    const totalCount = packingItems.length;
    const packedCount = packingItems.filter(p => p.packed).length;
    const progressPercent = totalCount > 0 ? (packedCount / totalCount) * 100 : 0;
    const allDone = totalCount > 0 && packedCount === totalCount;

    // Group by category
    const grouped = new Map<string, Array<PackingItem & { wardrobeItem?: WardrobeItem }>>();
    for (const pi of packingItems) {
        const wi = itemsMap.get(pi.itemId);
        const cat = wi ? getDisplayCategory(wi.category) : (pi.category ? getDisplayCategory(pi.category) : 'Other');
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat)!.push({ ...pi, wardrobeItem: wi });
    }

    const categoryOrder = ['Topwear', 'Bottomwear', 'Outerwear', 'Dresses', 'Footwear', 'Accessories', 'Other'];
    const sortedCategories = Array.from(grouped.keys()).sort(
        (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
    );

    return (
        <View style={styles.container}>

            {/* ── Hero progress card ── */}
            <LinearGradient
                colors={allDone ? ['#2D9E6B', '#1E7A52'] : ['#A0627A', '#7A4A5E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.progressCard}
            >
                {/* Left: counts */}
                <View style={styles.progressLeft}>
                    <Text style={styles.progressBig}>{packedCount}</Text>
                    <Text style={styles.progressSub}>of {totalCount} packed</Text>
                </View>

                {/* Centre: circular ring progress */}
                <View style={styles.ringWrap}>
                    <View style={styles.ringOuter}>
                        {/* Background ring */}
                        <View style={styles.ringBg} />
                        {/* Filled arc approximated with a thick border + clip */}
                        <View
                            style={[
                                styles.ringFill,
                                {
                                    // rotate the fill arc based on progress
                                    transform: [{ rotate: `${(progressPercent / 100) * 360}deg` }],
                                },
                            ]}
                        />
                        <View style={styles.ringCenter}>
                            <Text style={styles.ringPercent}>{Math.round(progressPercent)}%</Text>
                        </View>
                    </View>
                </View>

                {/* Right: status */}
                <View style={styles.progressRight}>
                    <View style={styles.statusBadge}>
                        <Ionicons
                            name={allDone ? 'checkmark-circle' : 'time-outline'}
                            size={14}
                            color="#fff"
                        />
                        <Text style={styles.statusBadgeText}>
                            {allDone ? 'All Set!' : 'In Progress'}
                        </Text>
                    </View>
                    <Text style={styles.remainText}>
                        {totalCount - packedCount > 0
                            ? `${totalCount - packedCount} left`
                            : 'Nothing left'}
                    </Text>
                </View>
            </LinearGradient>

            {/* ── Progress bar strip ── */}
            <View style={[styles.barWrap, { backgroundColor: tc.surface }]}>
                <View
                    style={[
                        styles.barFill,
                        {
                            width: `${progressPercent}%` as any,
                            backgroundColor: allDone ? '#2D9E6B' : tc.accent,
                        },
                    ]}
                />
            </View>

            {/* ── Category sections ── */}
            {sortedCategories.map(category => {
                const items = grouped.get(category)!;
                const meta = CATEGORY_META[category] ?? CATEGORY_META.Other;
                const catPacked = items.filter(i => i.packed).length;

                return (
                    <View key={category} style={[styles.section, { backgroundColor: tc.card }]}>
                        {/* Category header */}
                        <View style={[styles.sectionHeader, { borderBottomColor: tc.border }]}>
                            <View style={[styles.catIconWrap, { backgroundColor: meta.color + '22' }]}>
                                <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                            </View>
                            <Text style={[styles.catTitle, { color: tc.textPrimary }]}>{category}</Text>
                            <View style={[styles.catCount, { backgroundColor: tc.surface }]}>
                                <Text style={[styles.catCountText, { color: catPacked === items.length ? '#2D9E6B' : tc.textMuted }]}>
                                    {catPacked}/{items.length}
                                </Text>
                            </View>
                        </View>

                        {/* Items */}
                        {items.map((item, idx) => {
                            const wi = item.wardrobeItem;
                            const dayLabels = item.dayIndices.map(d => `Day ${d + 1}`).join(' · ');
                            const isLast = idx === items.length - 1;

                            return (
                                <TouchableOpacity
                                    key={item.itemId}
                                    style={[
                                        styles.itemRow,
                                        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tc.border },
                                    ]}
                                    onPress={() => onToggle(item.itemId)}
                                    activeOpacity={0.6}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: item.packed }}
                                >
                                    {/* Checkbox */}
                                    <TouchableOpacity
                                        onPress={() => onToggle(item.itemId)}
                                        style={[
                                            styles.checkbox,
                                            item.packed
                                                ? { backgroundColor: '#2D9E6B', borderColor: '#2D9E6B' }
                                                : { borderColor: tc.border, backgroundColor: 'transparent' },
                                        ]}
                                        accessibilityRole="checkbox"
                                    >
                                        {item.packed && (
                                            <Ionicons name="checkmark" size={13} color="#fff" />
                                        )}
                                    </TouchableOpacity>

                                    {/* Thumbnail */}
                                    <View style={[styles.thumbWrap, { backgroundColor: tc.surfacePressed }]}>
                                        {wi?.processedUrl || wi?.originalUrl ? (
                                            <Image
                                                source={{ uri: wi.processedUrl || wi.originalUrl }}
                                                style={styles.thumb}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <Ionicons name="shirt-outline" size={18} color={tc.textMuted} />
                                        )}
                                        {/* Category color bar */}
                                        <View style={[styles.thumbCatBar, { backgroundColor: meta.color }]} />
                                    </View>

                                    {/* Info */}
                                    <View style={styles.itemInfo}>
                                        <Text
                                            style={[
                                                styles.itemName,
                                                { color: item.packed ? tc.textMuted : tc.textPrimary },
                                                item.packed && styles.strikethrough,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {wi?.name || wi?.subCategory || wi?.category || 'Item'}
                                        </Text>
                                        {dayLabels ? (
                                            <View style={styles.dayRow}>
                                                <Ionicons name="calendar-outline" size={10} color={tc.textMuted} />
                                                <Text style={[styles.dayText, { color: tc.textMuted }]} numberOfLines={1}>
                                                    {dayLabels}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>

                                    {/* Packed badge */}
                                    {item.packed && (
                                        <View style={styles.packedBadge}>
                                            <Text style={styles.packedBadgeText}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                );
            })}

            {/* ── Share button ── */}
            <Button
                title="Share Packing List"
                onPress={onShare}
                icon="share-outline"
                variant="primary"
                fullWidth
                style={{ marginTop: Spacing.sm }}
            />

            <View style={{ height: 40 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        gap: Spacing.md,
    },

    /* Progress hero card */
    progressCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
        ...Shadows.md,
    },
    progressLeft: {
        flex: 1,
    },
    progressBig: {
        fontSize: 48,
        fontFamily: FontFamily.heading,
        fontWeight: '700',
        fontStyle: 'italic',
        color: '#fff',
        lineHeight: 52,
    },
    progressSub: {
        fontSize: 13,
        fontFamily: FontFamily.body,
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: 0.3,
    },
    ringWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringOuter: {
        width: 72,
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringBg: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 6,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    ringFill: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 6,
        borderColor: 'transparent',
        borderTopColor: '#fff',
        borderRightColor: '#fff',
    },
    ringCenter: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringPercent: {
        fontSize: 16,
        fontFamily: FontFamily.heading,
        fontWeight: '700',
        color: '#fff',
    },
    progressRight: {
        flex: 1,
        alignItems: 'flex-end',
        gap: Spacing.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.22)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BorderRadius.round,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        color: '#fff',
    },
    remainText: {
        fontSize: 13,
        fontFamily: FontFamily.body,
        color: 'rgba(255,255,255,0.75)',
    },

    /* Progress bar */
    barWrap: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: -Spacing.sm,
    },
    barFill: {
        height: '100%',
        borderRadius: 2,
    },

    /* Category section card */
    section: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    catIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catTitle: {
        flex: 1,
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    catCount: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: BorderRadius.round,
    },
    catCountText: {
        fontSize: 12,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },

    /* Item row */
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    checkbox: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbWrap: {
        width: 48,
        height: 56,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumb: {
        width: '100%',
        height: '100%',
    },
    thumbCatBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    itemInfo: {
        flex: 1,
        gap: 3,
    },
    itemName: {
        fontSize: 14,
        fontFamily: FontFamily.bodyMedium,
        fontWeight: '500',
    },
    strikethrough: {
        textDecorationLine: 'line-through',
        opacity: 0.55,
    },
    dayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dayText: {
        fontSize: 11,
        fontFamily: FontFamily.body,
        letterSpacing: 0.2,
    },
    packedBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#EDFAF3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    packedBadgeText: {
        fontSize: 11,
        color: '#2D9E6B',
        fontWeight: '700',
    },

    /* Share button */
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.round,
        marginTop: Spacing.sm,
        ...Shadows.sm,
    },
    shareBtnText: {
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        color: '#fff',
    },
});
