import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, type ViewStyle } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

type Props = {
    title: string;
    onPress: () => void;
    variant?: Variant;
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    accessibilityLabel?: string;
};

export default function Button({ title, onPress, variant = 'primary', loading, disabled, style, accessibilityLabel }: Props) {
    const tc = useThemeColors();

    const variantStyles: Record<Variant, { bg: string; text: string; border?: string }> = {
        primary: { bg: tc.accent, text: '#FFFFFF' },
        secondary: { bg: tc.surface, text: tc.textPrimary },
        outline: { bg: 'transparent', text: tc.accent, border: tc.accent },
        ghost: { bg: 'transparent', text: tc.textSecondary },
    };

    const v = variantStyles[variant];
    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || title}
            accessibilityState={{ disabled: isDisabled }}
            style={[
                styles.btn,
                { backgroundColor: v.bg, opacity: isDisabled ? 0.5 : 1 },
                v.border ? { borderWidth: 1.5, borderColor: v.border } : undefined,
                variant === 'primary' ? Shadows.sm : undefined,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator size="small" color={v.text} />
            ) : (
                <Text style={[styles.text, { color: v.text }]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.round,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    text: {
        fontSize: 15,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },
});
