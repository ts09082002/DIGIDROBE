import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { WardrobeItem } from '../../services/api';
import { useThemeColors } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import type { WeatherInfo } from '../../services/weather';
import { Spacing } from '../../constants/theme';

type OutfitDetailsModalProps = {
    visible: boolean;
    onClose: () => void;
    weatherInfo?: WeatherInfo | null;
    greetingText: string;
    recommendationText: string;
    topItem?: WardrobeItem | null;
    bottomItem?: WardrobeItem | null;
    outerItem?: WardrobeItem | null;
    shoeItem?: WardrobeItem | null;
};

function getItemImageSource(item?: WardrobeItem | null) {
    if (!item) return null;
    return item.processedUrl || item.originalUrl || null;
}

function PieceRow({
    title,
    item,
}: {
    title: string;
    item?: WardrobeItem | null;
}) {
    const img = getItemImageSource(item);
    return (
        <View style={styles.pieceRow}>
            <View style={[styles.pieceThumb, { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
                {img ? (
                    <Image source={{ uri: img }} style={styles.pieceImage} resizeMode="contain" />
                ) : (
                    <Text style={styles.pieceThumbFallback}>{title}</Text>
                )}
            </View>
            <View style={styles.pieceMeta}>
                <Text style={styles.pieceTitle}>{title}</Text>
                <Text style={styles.pieceName} numberOfLines={1}>
                    {item?.name || 'Not available in your wardrobe'}
                </Text>
            </View>
        </View>
    );
}

export default function OutfitDetailsModal({
    visible,
    onClose,
    weatherInfo,
    greetingText,
    recommendationText,
    topItem,
    bottomItem,
    outerItem,
    shoeItem,
}: OutfitDetailsModalProps) {
    const tc = useThemeColors();

    const tempText = weatherInfo ? `${Math.round(weatherInfo.temperatureC)}°C` : '—';
    const locationText = weatherInfo?.locationName ? ` • ${weatherInfo.locationName}` : '';
    const weatherTypeText = weatherInfo?.weatherDescription || weatherInfo?.weatherType || '';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.sheet, { backgroundColor: tc.card }]}>
                    <View style={styles.handleRow}>
                        <View style={[styles.handle, { backgroundColor: tc.border }]} />
                    </View>

                    <View style={styles.headerRow}>
                        <Text style={[styles.sheetTitle, { color: tc.textPrimary }]}>{greetingText}</Text>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                        >
                            <Ionicons name="close" size={22} color={tc.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subTitle, { color: tc.textSecondary }]}>
                        {tempText}
                        {locationText}
                        {weatherTypeText ? ` • ${weatherTypeText}` : ''}
                    </Text>

                    <Text style={[styles.recommendation, { color: tc.textPrimary }]}>
                        {recommendationText}
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                        {!!outerItem && (
                            <PieceRow title="Outerwear" item={outerItem} />
                        )}
                        <PieceRow title="Topwear" item={topItem} />
                        <PieceRow title="Bottomwear" item={bottomItem} />
                        <PieceRow title="Footwear" item={shoeItem} />

                        <View style={styles.footerSpacer} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: 24,
        minHeight: 360,
        maxHeight: '86%',
    },
    handleRow: {
        alignItems: 'center',
    },
    handle: {
        width: 44,
        height: 4,
        borderRadius: 999,
        marginBottom: Spacing.sm,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: Spacing.lg,
    },
    recommendation: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: Spacing.lg,
    },
    content: {
        paddingBottom: 16,
        gap: Spacing.md,
    },
    pieceRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        alignItems: 'center',
        paddingVertical: 10,
    },
    pieceThumb: {
        width: 64,
        height: 64,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    pieceImage: {
        width: 56,
        height: 56,
    },
    pieceThumbFallback: {
        fontWeight: '700',
        color: '#666',
        fontSize: 12,
    },
    pieceMeta: {
        flex: 1,
    },
    pieceTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 2,
    },
    pieceName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B6B6B',
    },
    footerSpacer: {
        height: 40,
    },
});

