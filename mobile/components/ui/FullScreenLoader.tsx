import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Modal } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface FullScreenLoaderProps {
    visible: boolean;
    message?: string;
}

export default function FullScreenLoader({ visible, message = 'Loading...' }: FullScreenLoaderProps) {
    const tc = useThemeColors();

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.overlay}>
                <View style={[styles.card, { backgroundColor: tc.card }]}>
                    <ActivityIndicator size="large" color={tc.accent} />
                    {!!message && (
                        <Text style={[styles.message, { color: tc.textPrimary }]}>
                            {message}
                        </Text>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    card: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xxxl,
        paddingVertical: Spacing.xxl,
        borderRadius: BorderRadius.lg,
        gap: Spacing.md,
        ...Shadows.lg,
    },
    message: {
        fontSize: 16,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        textAlign: 'center',
    },
});
