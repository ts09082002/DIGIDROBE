import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows, FontFamily } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    visible: boolean;
    type?: ToastType;
    message: string;
    description?: string;
    onHide?: () => void;
    autoHideDuration?: number;
}

export function Toast({
    visible,
    type = 'info',
    message,
    description,
    onHide,
    autoHideDuration = 2200,
}: ToastProps) {
    const tc = useThemeColors();
    const translateY = useRef(new Animated.Value(80)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            const timeout = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(translateY, {
                        toValue: 80,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start(({ finished }) => {
                    if (finished && onHide) onHide();
                });
            }, autoHideDuration);

            return () => clearTimeout(timeout);
        }
    }, [visible, autoHideDuration, onHide, opacity, translateY]);

    if (!visible) return null;

    const palette =
        type === 'success'
            ? { bg: '#DCFCE7', text: '#166534' }
            : type === 'error'
                ? { bg: '#FEE2E2', text: '#B91C1C' }
                : { bg: tc.backgroundElevated, text: tc.textPrimary };

    return (
        <View pointerEvents="none" style={styles.container}>
            <Animated.View
                style={[
                    styles.toast,
                    {
                        backgroundColor: palette.bg,
                        transform: [{ translateY }],
                        opacity,
                    },
                ]}
            >
                <Text style={[styles.message, { color: palette.text }]} numberOfLines={2}>
                    {message}
                </Text>
                {description ? (
                    <Text style={[styles.description, { color: palette.text }]} numberOfLines={2}>
                        {description}
                    </Text>
                ) : null}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 40,
        alignItems: 'center',
        zIndex: 999,
    },
    toast: {
        maxWidth: '90%',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        ...Shadows.md,
    },
    message: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },
    description: {
        fontSize: 12,
        fontFamily: FontFamily.body,
        marginTop: 2,
    },
});
