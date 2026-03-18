import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

type Props = {
    visible: boolean;
    onClose: () => void;
    onCreate: (destination: string, startDate: string, endDate: string, occasion: string) => void;
};

const OCCASIONS = ['Casual', 'Business', 'Vacation', 'Formal', 'Wedding'];

/** Validate YYYY-MM-DD format and that it represents a real date */
function isValidDate(dateStr: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export default function TripCreateModal({ visible, onClose, onCreate }: Props) {
    const tc = useThemeColors();

    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [occasion, setOccasion] = useState('Casual');
    const [errors, setErrors] = useState<{ destination?: string; startDate?: string; endDate?: string }>({});

    const resetForm = () => {
        setDestination('');
        setStartDate('');
        setEndDate('');
        setOccasion('Casual');
        setErrors({});
    };

    const handleCreate = () => {
        const newErrors: typeof errors = {};

        if (!destination.trim()) {
            newErrors.destination = 'Destination is required';
        }
        if (!isValidDate(startDate)) {
            newErrors.startDate = 'Enter a valid date (YYYY-MM-DD)';
        }
        if (!isValidDate(endDate)) {
            newErrors.endDate = 'Enter a valid date (YYYY-MM-DD)';
        }
        if (isValidDate(startDate) && isValidDate(endDate) && endDate < startDate) {
            newErrors.endDate = 'End date must be on or after start date';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onCreate(destination.trim(), startDate, endDate, occasion.toLowerCase());
        resetForm();
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <Pressable style={styles.overlay} onPress={handleClose}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                >
                    <Pressable style={[styles.sheet, { backgroundColor: tc.card }]} onPress={() => {}}>
                        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={[styles.title, { color: tc.textPrimary }]}>New Trip</Text>
                                <TouchableOpacity
                                    onPress={handleClose}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close new trip modal"
                                >
                                    <Ionicons name="close" size={24} color={tc.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Destination */}
                            <Text style={[styles.label, { color: tc.textSecondary }]}>DESTINATION</Text>
                            <View style={[styles.inputRow, { borderColor: errors.destination ? Colors.error : tc.border, backgroundColor: tc.surface }]}>
                                <Ionicons name="location-outline" size={20} color={tc.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: tc.textPrimary }]}
                                    placeholder="Where are you going?"
                                    placeholderTextColor={tc.textMuted}
                                    value={destination}
                                    onChangeText={(t) => {
                                        setDestination(t);
                                        if (errors.destination) setErrors(e => ({ ...e, destination: undefined }));
                                    }}
                                    accessibilityLabel="Trip destination"
                                />
                            </View>
                            {errors.destination && <Text style={styles.errorText}>{errors.destination}</Text>}

                            {/* Start Date */}
                            <Text style={[styles.label, { color: tc.textSecondary, marginTop: Spacing.lg }]}>START DATE</Text>
                            <View style={[styles.inputRow, { borderColor: errors.startDate ? Colors.error : tc.border, backgroundColor: tc.surface }]}>
                                <Ionicons name="calendar-outline" size={20} color={tc.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: tc.textPrimary }]}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={tc.textMuted}
                                    value={startDate}
                                    onChangeText={(t) => {
                                        setStartDate(t);
                                        if (errors.startDate) setErrors(e => ({ ...e, startDate: undefined }));
                                    }}
                                    keyboardType="numbers-and-punctuation"
                                    maxLength={10}
                                    accessibilityLabel="Trip start date"
                                />
                            </View>
                            {errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}

                            {/* End Date */}
                            <Text style={[styles.label, { color: tc.textSecondary, marginTop: Spacing.lg }]}>END DATE</Text>
                            <View style={[styles.inputRow, { borderColor: errors.endDate ? Colors.error : tc.border, backgroundColor: tc.surface }]}>
                                <Ionicons name="calendar-outline" size={20} color={tc.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: tc.textPrimary }]}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={tc.textMuted}
                                    value={endDate}
                                    onChangeText={(t) => {
                                        setEndDate(t);
                                        if (errors.endDate) setErrors(e => ({ ...e, endDate: undefined }));
                                    }}
                                    keyboardType="numbers-and-punctuation"
                                    maxLength={10}
                                    accessibilityLabel="Trip end date"
                                />
                            </View>
                            {errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}

                            {/* Occasion */}
                            <Text style={[styles.label, { color: tc.textSecondary, marginTop: Spacing.lg }]}>OCCASION</Text>
                            <View style={styles.occasionRow}>
                                {OCCASIONS.map(occ => {
                                    const isActive = occ === occasion;
                                    return (
                                        <TouchableOpacity
                                            key={occ}
                                            style={[
                                                styles.occasionPill,
                                                {
                                                    backgroundColor: isActive ? tc.accent : tc.surface,
                                                    borderColor: isActive ? tc.accent : tc.border,
                                                },
                                            ]}
                                            onPress={() => setOccasion(occ)}
                                            accessibilityRole="button"
                                            accessibilityState={{ selected: isActive }}
                                            accessibilityLabel={`${occ} occasion`}
                                        >
                                            <Text style={[
                                                styles.occasionText,
                                                { color: isActive ? '#FFFFFF' : tc.textSecondary },
                                            ]}>
                                                {occ}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Create button */}
                            <TouchableOpacity
                                style={[styles.createBtn, { backgroundColor: tc.accent }]}
                                onPress={handleCreate}
                                accessibilityRole="button"
                                accessibilityLabel="Create trip"
                            >
                                <Ionicons name="airplane" size={18} color="#FFFFFF" />
                                <Text style={styles.createBtnText}>Create Trip</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </Pressable>
                </KeyboardAvoidingView>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        maxHeight: '85%',
        ...Shadows.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    title: {
        fontSize: 24,
        fontFamily: FontFamily.heading,
        fontWeight: '700',
    },
    label: {
        fontSize: 12,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        letterSpacing: 1.2,
        marginBottom: Spacing.sm,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        height: 50,
        gap: Spacing.md,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: FontFamily.body,
        height: '100%',
    },
    errorText: {
        fontSize: 12,
        fontFamily: FontFamily.body,
        color: Colors.error,
        marginTop: Spacing.xs,
    },
    occasionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    occasionPill: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
        borderWidth: 1,
    },
    occasionText: {
        fontSize: 13,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.xxl,
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    createBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
});
