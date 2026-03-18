import React from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import type { PackingItem } from '../../services/trips-local';
import type { WardrobeItem } from '../../services/api';

type Props = {
    packingItems: PackingItem[];
    itemsMap: Map<string, WardrobeItem>;
    onToggle: (itemId: string) => void;
    onShare: () => void;
};

/** Map raw wardrobe categories to display groups */
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

export default function PackingChecklist({ packingItems, itemsMap, onToggle, onShare }: Props) {
    const tc = useThemeColors();

    const totalCount = packingItems.length;
    const packedCount = packingItems.filter(p => p.packed).length;
    const progressPercent = totalCount > 0 ? (packedCount / totalCount) * 100 : 0;

    // Group items by category
    const grouped = new Map<string, Array<PackingItem & { wardrobeItem?: WardrobeItem }>>();
    for (const pi of packingItems) {
        const wi = itemsMap.get(pi.itemId);
        const cat = wi ? getDisplayCategory(wi.category) : (pi.category ? getDisplayCategory(pi.category) : 'Other');
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat)!.push({ ...pi, wardrobeItem: wi });
    }

    // Sort category keys for consistent ordering
    const categoryOrder = ['Topwear', 'Bottomwear', 'Outerwear', 'Dresses', 'Footwear', 'Accessories', 'Other'];
    const sortedCategories = Array.from(grouped.keys()).sort(
        (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
    );

    return (
        <View style={styles.container}>
            {/* Progress bar */}
            <View style={styles.progressSection}>
                <Text style={[styles.progressLabel, { color: tc.textPrimary }]}>
                    {packedCount}/{totalCount} items packed
                </Text>
                <View style={[styles.progressBarBg, { backgroundColor: tc.surface }]}>
                    <View
                        style={[
                            styles.progressBarFill,
                            {
                                backgroundColor: packedCount === totalCount && totalCount > 0 ? Colors.success : tc.accent,
                                width: `${progressPercent}%`,
                            },
                        ]}
                    />
                </View>
            </View>

            {/* Category sections */}
            {sortedCategories.map(category => {
                const items = grouped.get(category)!;
                return (
                    <View key={category} style={styles.categorySection}>
                        <View style={styles.categoryHeader}>
                            <Text style={[styles.categoryTitle, { color: tc.textPrimary }]}>{category}</Text>
                            <Text style={[styles.categoryCount, { color: tc.textMuted }]}>{items.length}</Text>
                        </View>

                        {items.map(item => {
                            const wi = item.wardrobeItem;
                            const dayLabels = item.dayIndices.map(d => `Day ${d + 1}`).join(', ');

                            return (
                                <TouchableOpacity
                                    key={item.itemId}
                                    style={[styles.itemRow, { borderBottomColor: tc.border }]}
                                    onPress={() => onToggle(item.itemId)}
                                    activeOpacity={0.6}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: item.packed }}
                                    accessibilityLabel={`${wi?.name || 'Item'}, ${item.packed ? 'packed' : 'not packed'}`}
                                >
                                    {/* Checkbox */}
                                    <View style={[
                                        styles.checkbox,
                                        item.packed
                                            ? { backgroundColor: Colors.success, borderColor: Colors.success }
                                            : { borderColor: tc.border },
                                    ]}>
                                        {item.packed && (
                                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                        )}
                                    </View>

                                    {/* Thumbnail */}
                                    {wi?.processedUrl || wi?.originalUrl ? (
                                        <Image
                                            source={{ uri: wi.processedUrl || wi.originalUrl }}
                                            style={[styles.itemThumb, { backgroundColor: tc.surface }]}
                                        />
                                    ) : (
                                        <View style={[styles.itemThumb, { backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center' }]}>
                                            <Ionicons name="shirt-outline" size={16} color={tc.textMuted} />
                                        </View>
                                    )}

                                    {/* Info */}
                                    <View style={styles.itemInfo}>
                                        <Text
                                            style={[
                                                styles.itemName,
                                                { color: item.packed ? tc.textMuted : tc.textPrimary },
                                                item.packed && styles.itemNamePacked,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {wi?.name || wi?.category || 'Unknown item'}
                                        </Text>
                                        <Text style={[styles.dayLabel, { color: tc.textMuted }]} numberOfLines={1}>
                                            {dayLabels}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                );
            })}

            {/* Share button */}
            <TouchableOpacity
                style={[styles.shareBtn, { borderColor: tc.border }]}
                onPress={onShare}
                accessibilityRole="button"
                accessibilityLabel="Share packing list"
            >
                <Ionicons name="share-outline" size={20} color={tc.accent} />
                <Text style={[styles.shareBtnText, { color: tc.accent }]}>Share Packing List</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxxl,
    },
    progressSection: {
        marginBottom: Spacing.xxl,
    },
    progressLabel: {
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    categorySection: {
        marginBottom: Spacing.xl,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    categoryTitle: {
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    categoryCount: {
        fontSize: 13,
        fontFamily: FontFamily.body,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: Spacing.md,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemThumb: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.sm,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontFamily: FontFamily.bodyMedium,
        fontWeight: '500',
    },
    itemNamePacked: {
        textDecorationLine: 'line-through',
    },
    dayLabel: {
        fontSize: 12,
        fontFamily: FontFamily.body,
        marginTop: 2,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.round,
        borderWidth: 1,
        gap: Spacing.sm,
        marginTop: Spacing.lg,
    },
    shareBtnText: {
        fontSize: 15,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
});
