import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../constants/theme';

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
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <Pressable style={styles.overlay} onPress={onCancel}>
                <View style={styles.card}>
                    <Text style={styles.title}>{title}</Text>
                    {description ? <Text style={styles.description}>{description}</Text> : null}

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={onCancel}>
                            <Text style={styles.secondaryText}>{cancelLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.primaryBtn,
                                destructive && { backgroundColor: Colors.error || '#DC2626' },
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
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        ...Shadows.md,
    },
    title: {
        ...Typography.heading3,
        marginBottom: Spacing.xs,
    },
    description: {
        ...Typography.bodySmall,
        color: Colors.darkGray,
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
        backgroundColor: Colors.warmGray,
    },
    secondaryText: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.charcoal,
    },
    primaryBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.gold,
    },
    primaryText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.white,
    },
});

