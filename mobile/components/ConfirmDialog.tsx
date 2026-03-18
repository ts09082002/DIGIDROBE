import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows, FontFamily } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';

interface ConfirmDialogProps {
    visible: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    visible,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const tc = useThemeColors();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <Pressable style={styles.overlay} onPress={onCancel}>
                <View style={[styles.card, { backgroundColor: tc.card }]}>
                    <Text style={[styles.title, { color: tc.textPrimary }]}>{title}</Text>
                    {description ? <Text style={[styles.description, { color: tc.textSecondary }]}>{description}</Text> : null}

                    <View style={styles.actions}>
                        <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: tc.surface }]} onPress={onCancel}>
                            <Text style={[styles.secondaryText, { color: tc.textPrimary }]}>{cancelLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.primaryBtn,
                                { backgroundColor: destructive ? Colors.error : tc.accent },
                            ]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.primaryText}>{confirmLabel}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    card: {
        width: '100%',
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        ...Shadows.md,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        fontFamily: FontFamily.headingMedium,
        marginBottom: Spacing.xs,
    },
    description: {
        fontSize: 14,
        fontFamily: FontFamily.body,
        marginBottom: Spacing.lg,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.sm,
    },
    secondaryBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
    },
    secondaryText: {
        fontSize: 14,
        fontWeight: '500',
        fontFamily: FontFamily.bodyMedium,
    },
    primaryBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
    },
    primaryText: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        color: '#FFFFFF',
    },
});
