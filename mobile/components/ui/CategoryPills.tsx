import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { Colors, FontFamily, Spacing, BorderRadius } from '../../constants/theme';

type Props = {
    categories: string[];
    selected: string;
    onSelect: (category: string) => void;
};

export default function CategoryPills({ categories, selected, onSelect }: Props) {
    const tc = useThemeColors();

    return (
        <FlatList
            horizontal
            data={categories}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
                const isActive = item === selected;
                return (
                    <TouchableOpacity
                        onPress={() => onSelect(item)}
                        style={[
                            styles.pill,
                            {
                                backgroundColor: isActive ? tc.accent : tc.surface,
                                borderColor: isActive ? tc.accent : tc.border,
                            },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`Filter by ${item}`}
                    >
                        <Text
                            style={[
                                styles.pillText,
                                { color: isActive ? '#FFFFFF' : tc.textSecondary },
                            ]}
                        >
                            {item}
                        </Text>
                    </TouchableOpacity>
                );
            }}
        />
    );
}

const styles = StyleSheet.create({
    list: {
        paddingHorizontal: Spacing.xl,
        gap: Spacing.sm,
    },
    pill: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
        borderWidth: 1,
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },
});
