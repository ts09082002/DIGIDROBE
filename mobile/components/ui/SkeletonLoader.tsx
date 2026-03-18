import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, type ViewStyle } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { BorderRadius, Spacing } from '../../constants/theme';

type Variant = 'card' | 'text' | 'circle' | 'rect';

type Props = {
    variant?: Variant;
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
    count?: number;
};

function SkeletonItem({ variant = 'rect', width, height, borderRadius, style }: Omit<Props, 'count'>) {
    const tc = useThemeColors();
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [shimmer]);

    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.7] });

    const variantStyles: Record<Variant, ViewStyle> = {
        card: { width: width ?? '100%', height: height ?? 120, borderRadius: borderRadius ?? BorderRadius.lg },
        text: { width: width ?? '80%', height: height ?? 14, borderRadius: borderRadius ?? 7 },
        circle: { width: width ?? 48, height: height ?? 48, borderRadius: borderRadius ?? 24 },
        rect: { width: width ?? '100%', height: height ?? 48, borderRadius: borderRadius ?? BorderRadius.sm },
    };

    return (
        <Animated.View
            style={[
                { backgroundColor: tc.skeleton, opacity },
                variantStyles[variant],
                style,
            ]}
        />
    );
}

export default function SkeletonLoader({ count = 1, ...props }: Props) {
    return (
        <View style={styles.container}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonItem key={i} {...props} style={{ ...props.style, ...(i > 0 ? { marginTop: Spacing.sm } : {}) }} />
            ))}
        </View>
    );
}

/** Pre-built: 2-column grid of card skeletons */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
    const tc = useThemeColors();
    return (
        <View style={styles.grid}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonItem key={i} variant="card" height={160} style={styles.gridItem} />
            ))}
        </View>
    );
}

/** Pre-built: horizontal row of card skeletons */
export function SkeletonRow({ count = 3 }: { count?: number }) {
    return (
        <View style={styles.row}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonItem key={i} variant="card" width={140} height={180} style={i > 0 ? { marginLeft: Spacing.md } : undefined} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {},
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        paddingHorizontal: Spacing.xl,
    },
    gridItem: {
        width: '47%',
    },
    row: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.xl,
    },
});
