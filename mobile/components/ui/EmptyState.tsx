import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { Colors, FontFamily, Spacing, BorderRadius } from '../../constants/theme';

type Props = {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
};

export default function EmptyState({ icon = 'folder-open-outline', title, subtitle, actionLabel, onAction }: Props) {
    const tc = useThemeColors();

    return (
        <View style={styles.container}>
            <View style={[styles.iconCircle, { backgroundColor: tc.accentLight }]}>
                <Ionicons name={icon} size={32} color={tc.accent} />
            </View>
            <Text style={[styles.title, { color: tc.textPrimary }]}>{title}</Text>
            {subtitle && <Text style={[styles.subtitle, { color: tc.textSecondary }]}>{subtitle}</Text>}
            {actionLabel && onAction && (
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: tc.accent }]}
                    onPress={onAction}
                    accessibilityRole="button"
                    accessibilityLabel={actionLabel}
                >
                    <Text style={styles.actionText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: Spacing.xl,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: FontFamily.body,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 260,
    },
    actionBtn: {
        marginTop: Spacing.xl,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.round,
    },
    actionText: {
        fontSize: 15,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        color: '#FFFFFF',
    },
});
