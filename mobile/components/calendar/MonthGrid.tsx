import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { FontFamily, Spacing } from '../../constants/theme';
import DayCell from './DayCell';

type MonthGridProps = {
    year: number;
    month: number; // 1-12
    ootdDates: Set<string>;
    today: string; // YYYY-MM-DD
    selectedDate: string | null;
    onSelectDate: (date: string) => void;
};

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function MonthGrid({
    year,
    month,
    ootdDates,
    today,
    selectedDate,
    onSelectDate,
}: MonthGridProps) {
    const tc = useThemeColors();

    const cells = useMemo(() => {
        const firstDay = new Date(year, month - 1, 1);
        const startDow = firstDay.getDay(); // 0=Sun
        const daysInMonth = new Date(year, month, 0).getDate();
        const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

        const result: {
            key: string;
            day: number;
            dateStr: string;
            isCurrentMonth: boolean;
        }[] = [];

        // Previous month padding
        for (let i = startDow - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            const prevMonth = month - 1 < 1 ? 12 : month - 1;
            const prevYear = month - 1 < 1 ? year - 1 : year;
            const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            result.push({ key: `prev-${d}`, day: d, dateStr, isCurrentMonth: false });
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            result.push({ key: `cur-${d}`, day: d, dateStr, isCurrentMonth: true });
        }

        // Next month padding to fill last row
        const remaining = 7 - (result.length % 7);
        if (remaining < 7) {
            for (let d = 1; d <= remaining; d++) {
                const nextMonth = month + 1 > 12 ? 1 : month + 1;
                const nextYear = month + 1 > 12 ? year + 1 : year;
                const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                result.push({ key: `next-${d}`, day: d, dateStr, isCurrentMonth: false });
            }
        }

        return result;
    }, [year, month]);

    return (
        <View style={styles.container}>
            {/* Day-of-week headers */}
            <View style={styles.headerRow}>
                {DAY_HEADERS.map((label, i) => (
                    <View key={i} style={styles.headerCell}>
                        <Text style={[styles.headerText, { color: tc.textMuted }]}>{label}</Text>
                    </View>
                ))}
            </View>

            {/* Day cells */}
            <View style={styles.grid}>
                {cells.map((cell) => (
                    <DayCell
                        key={cell.key}
                        day={cell.day}
                        isToday={cell.dateStr === today}
                        isSelected={cell.dateStr === selectedDate}
                        hasOOTD={ootdDates.has(cell.dateStr)}
                        isCurrentMonth={cell.isCurrentMonth}
                        onPress={() => onSelectDate(cell.dateStr)}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.lg,
    },
    headerRow: {
        flexDirection: 'row',
        marginBottom: Spacing.xs,
    },
    headerCell: {
        width: `${100 / 7}%`,
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    headerText: {
        fontSize: 12,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
});
