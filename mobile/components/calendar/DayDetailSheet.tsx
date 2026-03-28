import React, { useState, useEffect, useCallback } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { FontFamily, Spacing, BorderRadius, Shadows, Colors } from '../../constants/theme';
import type { OOTD, WardrobeItem } from '../../services/api';
import { useRouter } from 'expo-router';
import { normalizeCategory } from '../../constants/categories';

type DayDetailSheetProps = {
    visible: boolean;
    date: string; // YYYY-MM-DD
    ootd: OOTD | null;
    allItems: WardrobeItem[];
    onSave: (itemIds: string[], notes: string) => void;
    onClose: () => void;
    onAISuggest: () => Promise<string[]>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PICKER_ITEM_SIZE = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.sm * 2) / 3;

const MONTH_NAMES_LONG = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatSheetDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES_LONG[d.getMonth()]} ${d.getDate()}`;
}

export default function DayDetailSheet({
    visible,
    date,
    ootd,
    allItems,
    onSave,
    onClose,
    onAISuggest,
}: DayDetailSheetProps) {
    const tc = useThemeColors();
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [suggesting, setSuggesting] = useState(false);

    // Sync state when ootd or visibility changes
    useEffect(() => {
        if (visible) {
            setSelectedIds(ootd?.itemIds ?? []);
            setNotes(ootd?.notes ?? '');
            setShowPicker(!ootd);
        }
    }, [visible, ootd]);

    const toggleItem = useCallback((id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    }, []);

    const handleAISuggest = useCallback(async () => {
        try {
            setSuggesting(true);
            const ids = await onAISuggest();
            if (ids.length > 0) {
                setSelectedIds(ids);
                setShowPicker(false);
            }
        } catch {
            // parent handles error toast
        } finally {
            setSuggesting(false);
        }
    }, [onAISuggest]);

    const handleSave = useCallback(() => {
        onSave(selectedIds, notes);
    }, [selectedIds, notes, onSave]);

    const selectedItemObjects = selectedIds
        .map((id) => allItems.find((i) => i.id === id))
        .filter((i): i is WardrobeItem => i != null);

    const renderPickerItem = useCallback(
        ({ item }: { item: WardrobeItem }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
                <TouchableOpacity
                    style={[
                        styles.pickerItem,
                        { borderColor: isSelected ? tc.accent : tc.border },
                        isSelected && { borderWidth: 2 },
                    ]}
                    onPress={() => toggleItem(item.id)}
                    activeOpacity={0.8}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${item.name || item.category}${isSelected ? ', selected' : ''}`}
                    accessibilityState={{ checked: isSelected }}
                >
                    <Image
                        source={{ uri: item.processedUrl }}
                        style={styles.pickerImage}
                        resizeMode="cover"
                    />
                    {isSelected && (
                        <View style={[styles.checkBadge, { backgroundColor: tc.accent }]}>
                            <Ionicons name="checkmark" size={14} color="#FFF" />
                        </View>
                    )}
                    <Text
                        style={[styles.pickerCategory, { color: tc.textSecondary }]}
                        numberOfLines={1}
                    >
                        {item.category}
                    </Text>
                </TouchableOpacity>
            );
        },
        [selectedIds, tc, toggleItem]
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: tc.background }]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: tc.border }]}>
                    <View style={styles.headerLeft}>
                        <Text style={[styles.headerDate, { color: tc.textPrimary }]}>
                            {formatSheetDate(date)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={onClose}
                        style={[styles.closeBtn, { backgroundColor: tc.surface }]}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                    >
                        <Ionicons name="close" size={20} color={tc.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {!showPicker ? (
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentInner}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Selected items preview */}
                        {selectedItemObjects.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionLabel, { color: tc.textSecondary }]}>
                                    OUTFIT ({selectedItemObjects.length} items)
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {selectedItemObjects.map((item) => (
                                        <View key={item.id} style={styles.previewThumb}>
                                            <Image
                                                source={{ uri: item.processedUrl }}
                                                style={[styles.previewImage, { backgroundColor: tc.surface }]}
                                                resizeMode="cover"
                                            />
                                            <Text
                                                style={[styles.previewCategory, { color: tc.textSecondary }]}
                                                numberOfLines={1}
                                            >
                                                {item.name || item.category}
                                            </Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Notes display */}
                        {notes.length > 0 && (
                            <View style={[styles.notesDisplay, { backgroundColor: tc.surface }]}>
                                <Ionicons name="document-text-outline" size={16} color={tc.textMuted} />
                                <Text style={[styles.notesText, { color: tc.textSecondary }]}>
                                    {notes}
                                </Text>
                            </View>
                        )}

                        {/* Action buttons */}
                        <View style={styles.actionGroup}>
                            {/* Edit */}
                            <View style={styles.iconBtnWrap}>
                                <TouchableOpacity
                                    style={[styles.iconBtn, { backgroundColor: tc.surface, borderColor: tc.border }]}
                                    onPress={() => setShowPicker(true)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Edit outfit"
                                >
                                    <Ionicons name="pencil-outline" size={22} color={tc.textPrimary} />
                                </TouchableOpacity>
                                <Text style={[styles.iconBtnLabel, { color: tc.textSecondary }]}>Edit</Text>
                            </View>

                            {/* AI Suggest */}
                            <View style={styles.iconBtnWrap}>
                                <TouchableOpacity
                                    style={[styles.iconBtn, { backgroundColor: tc.accentLight, borderColor: tc.accent }]}
                                    onPress={handleAISuggest}
                                    disabled={suggesting}
                                    accessibilityRole="button"
                                    accessibilityLabel="Get AI suggestion"
                                >
                                    {suggesting
                                        ? <ActivityIndicator size="small" color={tc.accent} />
                                        : <Ionicons name="sparkles" size={22} color={tc.accent} />
                                    }
                                </TouchableOpacity>
                                <Text style={[styles.iconBtnLabel, { color: tc.accent }]}>AI</Text>
                            </View>

                            {/* Canvas */}
                            <View style={styles.iconBtnWrap}>
                                <TouchableOpacity
                                    style={[styles.iconBtn, { backgroundColor: Colors.gold, borderColor: Colors.gold }]}
                                    onPress={() => {
                                        onClose();
                                        const topItems = selectedItemObjects.filter(i => {
                                            const c = normalizeCategory(i.category);
                                            return c === 'topwear' || c === 'dresses';
                                        });
                                        const bottomItems = selectedItemObjects.filter(i => normalizeCategory(i.category) === 'bottomwear');
                                        const shoeItems = selectedItemObjects.filter(i => normalizeCategory(i.category) === 'footwear');
                                        setTimeout(() => {
                                            router.replace({
                                                pathname: '/(tabs)/',
                                                params: {
                                                    viewOutfit: 'true',
                                                    topId: topItems[0]?.id || '',
                                                    bottomId: bottomItems[0]?.id || '',
                                                    shoeId: shoeItems[0]?.id || ''
                                                }
                                            });
                                        }, 100);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel="See outfit on home canvas"
                                >
                                    <Ionicons name="eye-outline" size={22} color={Colors.white} />
                                </TouchableOpacity>
                                <Text style={[styles.iconBtnLabel, { color: tc.textSecondary }]}>Canvas</Text>
                            </View>
                        </View>
                    </ScrollView>
                ) : (
                    /* Item picker mode */
                    <View style={styles.pickerContainer}>
                        {/* Picker action bar */}
                        <View style={styles.pickerActions}>
                            <TouchableOpacity
                                style={[styles.aiSuggestChip, { backgroundColor: tc.accentLight }]}
                                onPress={handleAISuggest}
                                disabled={suggesting}
                                accessibilityRole="button"
                                accessibilityLabel="AI suggest outfit"
                            >
                                {suggesting ? (
                                    <ActivityIndicator size="small" color={tc.accent} />
                                ) : (
                                    <Ionicons name="sparkles" size={16} color={tc.accent} />
                                )}
                                <Text style={[styles.aiSuggestText, { color: tc.accent }]}>
                                    AI Suggest
                                </Text>
                            </TouchableOpacity>

                            <Text style={[styles.selectedCount, { color: tc.textMuted }]}>
                                {selectedIds.length} selected
                            </Text>
                        </View>

                        {/* Pick manually label */}
                        <Text style={[styles.pickerLabel, { color: tc.textSecondary }]}>
                            TAP ITEMS TO SELECT
                        </Text>

                        {/* Item grid */}
                        <FlatList
                            data={allItems}
                            numColumns={3}
                            keyExtractor={(item) => item.id}
                            renderItem={renderPickerItem}
                            contentContainerStyle={styles.pickerGrid}
                            showsVerticalScrollIndicator={false}
                            columnWrapperStyle={styles.pickerRow}
                        />
                    </View>
                )}

                {/* Bottom bar: notes input + save */}
                <View style={[styles.bottomBar, { backgroundColor: tc.background, borderTopColor: tc.border }]}>
                    <View style={[styles.notesInput, { backgroundColor: tc.surface }]}>
                        <Ionicons name="pencil-outline" size={16} color={tc.textMuted} />
                        <TextInput
                            style={[styles.notesTextInput, { color: tc.textPrimary }]}
                            placeholder="Add a note..."
                            placeholderTextColor={tc.textMuted}
                            value={notes}
                            onChangeText={setNotes}
                            returnKeyType="done"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: tc.accent }]}
                        onPress={handleSave}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Save outfit"
                    >
                        <Text style={styles.saveBtnText}>Save Outfit</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerLeft: {
        flex: 1,
    },
    headerDate: {
        fontSize: 20,
        fontFamily: FontFamily.heading,
        fontWeight: '700',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    contentInner: {
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        letterSpacing: 1.2,
        marginBottom: Spacing.md,
    },
    previewThumb: {
        alignItems: 'center',
        marginRight: Spacing.md,
        gap: Spacing.xs,
    },
    previewImage: {
        width: 72,
        height: 88,
        borderRadius: BorderRadius.sm,
    },
    previewCategory: {
        fontSize: 11,
        fontFamily: FontFamily.bodyMedium,
        textTransform: 'capitalize',
    },
    notesDisplay: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xl,
    },
    notesText: {
        flex: 1,
        fontSize: 14,
        fontFamily: FontFamily.body,
        lineHeight: 20,
    },
    actionGroup: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.xl,
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.md,
    },
    iconBtnWrap: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    iconBtn: {
        width: 52,
        height: 52,
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBtnLabel: {
        fontSize: 11,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    // Picker
    pickerContainer: {
        flex: 1,
    },
    pickerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
    },
    aiSuggestChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
    },
    aiSuggestText: {
        fontSize: 13,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
    },
    selectedCount: {
        fontSize: 13,
        fontFamily: FontFamily.bodyMedium,
    },
    pickerLabel: {
        fontSize: 11,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        letterSpacing: 1.2,
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.sm,
    },
    pickerGrid: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxxl,
    },
    pickerRow: {
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    pickerItem: {
        width: PICKER_ITEM_SIZE,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    pickerImage: {
        width: '100%',
        height: PICKER_ITEM_SIZE * 1.15,
    },
    checkBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerCategory: {
        fontSize: 10,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        textAlign: 'center',
        paddingVertical: Spacing.xs,
        textTransform: 'capitalize',
    },
    // Bottom bar
    bottomBar: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xxl,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: Spacing.md,
    },
    notesInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    notesTextInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: FontFamily.body,
        paddingVertical: 0,
    },
    saveBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md + 2,
        borderRadius: BorderRadius.md,
    },
    saveBtnText: {
        fontSize: 16,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        color: '#FFF',
    },
});
