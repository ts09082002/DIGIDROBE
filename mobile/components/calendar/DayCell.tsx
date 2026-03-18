import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';

type DayCellProps = {
    day: number;
    isToday: boolean;
    isSelected: boolean;
    hasOOTD: boolean;
    isCurrentMonth: boolean;
    onPress: () => void;
};

const CELL_SIZE = 44;

function DayCellInner({ day, isToday, isSelected, hasOOTD, isCurrentMonth, onPress }: DayCellProps) {
    const tc = useThemeColors();

    const textColor = isSelected
        ? '#FFF'
        : isToday
            ? tc.accent
            : isCurrentMonth
                ? tc.textPrimary
                : tc.textMuted;

    return (
        <TouchableOpacity
            style={styles.wrapper}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Day ${day}${isToday ? ', today' : ''}${hasOOTD ? ', outfit planned' : ''}`}
            accessibilityState={{ selected: isSelected }}
        >
            <View
                style={[
                    styles.cell,
                    isToday && !isSelected && { borderColor: tc.accent, borderWidth: 2 },
                    isSelected && { backgroundColor: tc.accent },
                ]}
            >
                <Text style={[styles.dayText, { color: textColor }]}>
                    {day}
                </Text>
            </View>
            {hasOOTD && (
                <View style={[styles.dot, { backgroundColor: isSelected ? tc.accent : tc.accent }]} />
            )}
        </TouchableOpacity>
    );
}

const DayCell = memo(DayCellInner);
export default DayCell;

const styles = StyleSheet.create({
    wrapper: {
        width: `${100 / 7}%`,
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderRadius: CELL_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0,
        borderColor: 'transparent',
    },
    dayText: {
        fontSize: 15,
        fontFamily: FontFamily.bodyMedium,
        fontWeight: '500',
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        marginTop: 2,
    },
});
