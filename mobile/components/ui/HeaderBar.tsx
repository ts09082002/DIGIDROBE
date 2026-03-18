import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { FontFamily, Spacing, Shadows, BorderRadius } from '../../constants/theme';

type Props = {
    title: string;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    onLeftPress?: () => void;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightPress?: () => void;
    rightContent?: React.ReactNode;
};

export default function HeaderBar({ title, leftIcon, onLeftPress, rightIcon, onRightPress, rightContent }: Props) {
    const tc = useThemeColors();

    return (
        <View style={styles.container}>
            {leftIcon && onLeftPress ? (
                <TouchableOpacity
                    onPress={onLeftPress}
                    style={[styles.iconBtn, { backgroundColor: tc.iconBtnBg }]}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name={leftIcon} size={22} color={tc.textPrimary} />
                </TouchableOpacity>
            ) : (
                <View style={styles.placeholder} />
            )}

            <Text style={[styles.title, { color: tc.textPrimary }]}>{title}</Text>

            {rightContent ? (
                rightContent
            ) : rightIcon && onRightPress ? (
                <TouchableOpacity
                    onPress={onRightPress}
                    style={[styles.iconBtn, { backgroundColor: tc.iconBtnBg }]}
                    accessibilityRole="button"
                    accessibilityLabel="Settings"
                >
                    <Ionicons name={rightIcon} size={22} color={tc.textPrimary} />
                </TouchableOpacity>
            ) : (
                <View style={styles.placeholder} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
    },
    placeholder: {
        width: 40,
    },
});
