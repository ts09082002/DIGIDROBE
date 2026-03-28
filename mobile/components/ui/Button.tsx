import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type Props = {
    title: string;
    onPress: () => void;
    variant?: Variant;
    size?: Size;
    icon?: keyof typeof Ionicons.glyphMap;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
    accessibilityLabel?: string;
};

const SIZE: Record<Size, { py: number; px: number; fontSize: number; iconSize: number; height: number }> = {
    sm: { py: 9,  px: 18, fontSize: 13, iconSize: 15, height: 38 },
    md: { py: 13, px: 24, fontSize: 15, iconSize: 17, height: 48 },
    lg: { py: 16, px: 32, fontSize: 16, iconSize: 19, height: 56 },
};

export default function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    loading,
    disabled,
    fullWidth = false,
    style,
    accessibilityLabel,
}: Props) {
    const tc = useThemeColors();
    const isDisabled = disabled || loading;
    const s = SIZE[size];

    const variantStyles: Record<Variant, { bg: string; text: string; border?: string; shadow?: boolean }> = {
        primary:   { bg: tc.accent,                text: '#FFFFFF',       shadow: true },
        secondary: { bg: tc.surface,               text: tc.textPrimary,  border: tc.border },
        outline:   { bg: 'transparent',            text: tc.accent,       border: tc.accent },
        danger:    { bg: 'transparent',            text: '#EF4444',       border: '#EF4444' },
        ghost:     { bg: 'transparent',            text: tc.textSecondary },
    };

    const v = variantStyles[variant];

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? title}
            accessibilityState={{ disabled: isDisabled }}
            style={[
                styles.base,
                {
                    backgroundColor: v.bg,
                    paddingVertical: s.py,
                    paddingHorizontal: s.px,
                    minHeight: s.height,
                    opacity: isDisabled ? 0.48 : 1,
                    alignSelf: fullWidth ? 'stretch' : 'center',
                },
                v.border ? { borderWidth: 1.5, borderColor: v.border } : null,
                v.shadow ? Shadows.sm : null,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator size="small" color={v.text} />
            ) : (
                <View style={styles.inner}>
                    {icon && iconPosition === 'left' && (
                        <Ionicons name={icon} size={s.iconSize} color={v.text} style={styles.iconLeft} />
                    )}
                    <Text style={[styles.label, { color: v.text, fontSize: s.fontSize }]}>
                        {title}
                    </Text>
                    {icon && iconPosition === 'right' && (
                        <Ionicons name={icon} size={s.iconSize} color={v.text} style={styles.iconRight} />
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: BorderRadius.round,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        letterSpacing: 0.2,
        textAlign: 'center',
    },
    iconLeft:  { marginRight: 7 },
    iconRight: { marginLeft: 7 },
});
