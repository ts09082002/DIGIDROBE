import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Share,
    Image,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { api, WardrobeItem } from '../../services/api';
import { Toast } from '../../components/Toast';
import ScreenContainer from '../../components/ui/ScreenContainer';
import EmptyState from '../../components/ui/EmptyState';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function TravelScreen() {
    const tc = useThemeColors();
    const [destination, setDestination] = useState('');
    const [days, setDays] = useState('3');
    const [loading, setLoading] = useState(false);
    const [packingList, setPackingList] = useState<WardrobeItem[] | null>(null);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

    const handleGenerate = async () => {
        if (!destination.trim()) {
            setToastType('error');
            setToastMessage('Please enter a destination');
            setToastVisible(true);
            return;
        }
        const d = parseInt(days, 10);
        if (isNaN(d) || d < 1) {
            setToastType('error');
            setToastMessage('Please enter a valid number of days');
            setToastVisible(true);
            return;
        }

        try {
            setLoading(true);
            const list = await api.generatePackingList(destination, d);
            setPackingList(list);
        } catch (e) {
            setToastType('error');
            setToastMessage('Failed to generate packing list. Make sure you have items in your wardrobe.');
            setToastVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!packingList?.length) return;

        const intro = `My packing list for ${destination} (${days} days) made with Drobeo:\n`;
        const items = packingList.map(i => `- ${i.name || i.category}`).join('\n');

        try {
            await Share.share({
                message: intro + '\n' + items,
            });
        } catch (error: any) {
            setToastType('error');
            setToastMessage(error.message || 'Could not share packing list');
            setToastVisible(true);
        }
    };

    return (
        <ScreenContainer>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: tc.textPrimary }]}>Travel Pack</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Form Section */}
                <View style={[styles.formCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
                    <Text style={[styles.label, { color: tc.textSecondary }]}>DESTINATION</Text>
                    <View style={[styles.inputContainer, { borderColor: tc.border, backgroundColor: tc.surface }]}>
                        <Ionicons name="location" size={20} color={tc.textSecondary} />
                        <TextInput
                            style={[styles.input, { color: tc.textPrimary }]}
                            placeholder="Where to?"
                            placeholderTextColor={tc.textMuted}
                            value={destination}
                            onChangeText={setDestination}
                        />
                    </View>

                    <Text style={[styles.label, { color: tc.textSecondary, marginTop: 15 }]}>DURATION (DAYS)</Text>
                    <View style={[styles.inputContainer, { borderColor: tc.border, backgroundColor: tc.surface }]}>
                        <Ionicons name="calendar-clear" size={20} color={tc.textSecondary} />
                        <TextInput
                            style={[styles.input, { color: tc.textPrimary }]}
                            placeholder="e.g. 3"
                            placeholderTextColor={tc.textMuted}
                            keyboardType="numeric"
                            value={days}
                            onChangeText={setDays}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.generateBtn, { backgroundColor: tc.accent }]}
                        onPress={handleGenerate}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel="Generate packing list"
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="flash" size={18} color="#FFF" />
                                <Text style={styles.generateBtnText}>Generate Packing List</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Results Section */}
                {packingList !== null && (
                    <View style={styles.resultsContainer}>
                        <View style={styles.resultsHeader}>
                            <Text style={[styles.resultsTitle, { color: tc.textPrimary }]}>Your List</Text>
                            <TouchableOpacity
                                onPress={handleShare}
                                style={styles.shareBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Share packing list"
                            >
                                <Ionicons name="share-outline" size={20} color={tc.accent} />
                                <Text style={[styles.shareText, { color: tc.accent }]}>Share</Text>
                            </TouchableOpacity>
                        </View>

                        {packingList.length === 0 ? (
                            <EmptyState
                                icon="shirt-outline"
                                title="No items to pack"
                                subtitle="Add items to your wardrobe first to get suggestions!"
                            />
                        ) : (
                            <View style={styles.grid}>
                                {packingList.map((item, index) => (
                                    <View key={index} style={[styles.itemCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
                                        <Image
                                            source={{ uri: item.processedUrl }}
                                            style={[styles.itemImage, { backgroundColor: tc.surface }]}
                                            resizeMode="contain"
                                        />
                                        <View style={styles.itemInfo}>
                                            <Text style={[styles.itemCategory, { color: tc.textSecondary }]} numberOfLines={1}>
                                                {item.name || item.category}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
            <Toast
                visible={toastVisible}
                type={toastType}
                message={toastMessage}
                onHide={() => setToastVisible(false)}
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.sm,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 100,
    },
    formCard: {
        marginHorizontal: Spacing.xl,
        padding: Spacing.xl,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        ...Shadows.sm,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: FontFamily.bodySemiBold,
        letterSpacing: 1.2,
        marginBottom: Spacing.sm,
    },
    inputContainer: {
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
    generateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.xxl,
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    generateBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },
    resultsContainer: {
        marginTop: Spacing.xxxl,
        paddingHorizontal: Spacing.xl,
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    resultsTitle: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    shareText: {
        fontSize: 15,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: Spacing.lg,
    },
    itemCard: {
        width: CARD_WIDTH,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: CARD_WIDTH * 1.2,
        resizeMode: 'cover',
    },
    itemInfo: {
        padding: Spacing.md,
        alignItems: 'center',
    },
    itemCategory: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        textTransform: 'capitalize',
    },
});
