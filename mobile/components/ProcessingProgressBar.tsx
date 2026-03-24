/**
 * Floating bottom progress bar for sequential image processing.
 *
 * Slides up when processing starts, updates count label in real-time,
 * and auto-dismisses 2 s after the queue completes.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';

interface Props {
    current: number;
    total: number;
    /** Pass true once the queue finishes — bar will auto-dismiss after 2 s */
    done?: boolean;
}

export default function ProcessingProgressBar({ current, total, done = false }: Props) {
    const tc = useThemeColors();

    // Slide-up / slide-down
    const slideAnim = useRef(new Animated.Value(80)).current;
    // Animated progress fill (0 → 1)
    const fillAnim = useRef(new Animated.Value(0)).current;

    const isVisible = total > 0;
    const progress = total > 0 ? current / total : 0;

    // Slide in when we first become visible
    useEffect(() => {
        if (!isVisible) return;
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
        }).start();
    }, [isVisible]);

    // Animate the fill bar whenever progress changes
    useEffect(() => {
        Animated.timing(fillAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    // Auto-dismiss 2 s after done
    useEffect(() => {
        if (!done) return;
        const timer = setTimeout(() => {
            Animated.timing(slideAnim, {
                toValue: 80,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }, 2000);
        return () => clearTimeout(timer);
    }, [done]);

    if (!isVisible) return null;

    const label = done
        ? `Done — ${total} item${total !== 1 ? 's' : ''} added`
        : `Processing ${current} of ${total}…`;

    return (
        <Animated.View
            style={[
                styles.container,
                { backgroundColor: tc.card, transform: [{ translateY: slideAnim }] },
            ]}
            pointerEvents="none"
        >
            {/* Track */}
            <View style={[styles.track, { backgroundColor: tc.border }]}>
                <Animated.View
                    style={[
                        styles.fill,
                        {
                            backgroundColor: done ? Colors.success ?? Colors.gold : Colors.gold,
                            width: fillAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                        },
                    ]}
                />
            </View>

            <Text style={[styles.label, { color: tc.textSecondary }]}>{label}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90,          // above tab bar
        left: Spacing.xl,
        right: Spacing.xl,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        ...Shadows.md,
        zIndex: 100,
    },
    track: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 2,
    },
    label: {
        fontSize: 13,
        fontFamily: FontFamily.body,
        textAlign: 'center',
    },
});
