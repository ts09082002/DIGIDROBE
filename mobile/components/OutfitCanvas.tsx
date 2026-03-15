/**
 * OutfitCanvas — Faceless mannequin silhouette with wardrobe clothing
 * items overlaid at correct body zones. Pure React Native Views.
 *
 * Like a fashion styling app: neutral mannequin body with user's
 * actual wardrobe item images layered on (top, bottom, shoes, jacket).
 * Empty slots show dashed placeholders with "+" icon.
 */
import React from 'react';
import { View, Image, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, WardrobeItem } from '../services/api';
import { MANNEQUIN_OVERLAY_FRAMES, OverlayKey } from '../constants/overlayFrames';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_WIDTH = SCREEN_WIDTH - 48;
const CANVAS_HEIGHT = CANVAS_WIDTH * 1.55;

interface OutfitCanvasProps {
    gender: 'male' | 'female';
    layeredItems: {
        top?: WardrobeItem;
        bottom?: WardrobeItem;
        outerwear?: WardrobeItem;
        footwear?: WardrobeItem;
        accessories?: WardrobeItem[];
    };
    occasion: string;
    isDarkMode: boolean;
    onSlotPress?: (category: string) => void;
}

const OCCASION_LABELS: Record<string, { label: string; icon: string }> = {
    casual: { label: 'CASUAL', icon: 'sunny-outline' },
    work: { label: 'WORK', icon: 'briefcase-outline' },
    date: { label: 'DATE', icon: 'heart-outline' },
    party: { label: 'PARTY', icon: 'sparkles-outline' },
};

const SKIN = '#D4BC9A';
const SKIN_MID = '#C4A882';
const SKIN_DARK = '#B89970';

const SLOT_LABELS: Partial<Record<OverlayKey, string>> = {
    top: 'Top',
    bottom: 'Bottom',
    outerwear: 'Jacket',
    footwear: 'Shoes',
};

/** Faceless mannequin body — neck, shoulders, torso, arms, legs, feet */
function MannequinBody({ gender, W, H }: { gender: 'male' | 'female'; W: number; H: number }) {
    const isMale = gender === 'male';

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Head — faceless oval */}
            <View style={{
                position: 'absolute',
                top: H * 0.02,
                left: W * 0.38,
                width: W * 0.24,
                height: W * 0.30,
                borderRadius: W * 0.12,
                backgroundColor: SKIN_MID,
            }} />

            {/* Hair hint */}
            <View style={{
                position: 'absolute',
                top: H * 0.01,
                left: W * (isMale ? 0.37 : 0.34),
                width: W * (isMale ? 0.26 : 0.32),
                height: W * (isMale ? 0.16 : 0.20),
                borderTopLeftRadius: W * 0.13,
                borderTopRightRadius: W * 0.13,
                borderBottomLeftRadius: isMale ? W * 0.03 : W * 0.01,
                borderBottomRightRadius: isMale ? W * 0.03 : W * 0.01,
                backgroundColor: isMale ? '#5C4033' : '#3D2B1F',
            }} />

            {/* Hair strands for female */}
            {!isMale && (
                <>
                    <View style={{
                        position: 'absolute',
                        top: H * 0.07,
                        left: W * 0.33,
                        width: W * 0.05,
                        height: H * 0.09,
                        borderRadius: W * 0.025,
                        backgroundColor: '#3D2B1F',
                    }} />
                    <View style={{
                        position: 'absolute',
                        top: H * 0.07,
                        left: W * 0.62,
                        width: W * 0.05,
                        height: H * 0.09,
                        borderRadius: W * 0.025,
                        backgroundColor: '#3D2B1F',
                    }} />
                </>
            )}

            {/* Neck */}
            <View style={{
                position: 'absolute',
                top: H * 0.14,
                left: W * 0.44,
                width: W * 0.12,
                height: H * 0.04,
                borderRadius: W * 0.03,
                backgroundColor: SKIN_DARK,
            }} />

            {/* Shoulders */}
            <View style={{
                position: 'absolute',
                top: H * 0.175,
                left: W * (isMale ? 0.18 : 0.22),
                width: W * (isMale ? 0.64 : 0.56),
                height: H * 0.025,
                backgroundColor: SKIN_MID,
                borderTopLeftRadius: W * 0.06,
                borderTopRightRadius: W * 0.06,
            }} />

            {/* Torso */}
            <View style={{
                position: 'absolute',
                top: H * 0.19,
                left: W * (isMale ? 0.27 : 0.29),
                width: W * (isMale ? 0.46 : 0.42),
                height: H * 0.24,
                backgroundColor: SKIN,
                borderBottomLeftRadius: isMale ? 4 : W * 0.04,
                borderBottomRightRadius: isMale ? 4 : W * 0.04,
            }} />

            {/* Waist */}
            <View style={{
                position: 'absolute',
                top: H * 0.41,
                left: W * (isMale ? 0.29 : 0.32),
                width: W * (isMale ? 0.42 : 0.36),
                height: H * 0.03,
                backgroundColor: SKIN_DARK,
                borderRadius: 3,
            }} />

            {/* Hips */}
            <View style={{
                position: 'absolute',
                top: H * 0.43,
                left: W * (isMale ? 0.30 : 0.26),
                width: W * (isMale ? 0.40 : 0.48),
                height: H * 0.06,
                backgroundColor: SKIN_MID,
                borderBottomLeftRadius: isMale ? 4 : W * 0.05,
                borderBottomRightRadius: isMale ? 4 : W * 0.05,
            }} />

            {/* Left Arm */}
            <View style={{
                position: 'absolute',
                top: H * 0.19,
                left: W * (isMale ? 0.15 : 0.19),
                width: W * 0.06,
                height: H * 0.16,
                borderRadius: W * 0.03,
                backgroundColor: SKIN_DARK,
                transform: [{ rotate: '5deg' }],
            }} />
            <View style={{
                position: 'absolute',
                top: H * 0.33,
                left: W * (isMale ? 0.12 : 0.16),
                width: W * 0.055,
                height: H * 0.14,
                borderRadius: W * 0.025,
                backgroundColor: SKIN_MID,
                transform: [{ rotate: '3deg' }],
            }} />
            {/* Left Hand */}
            <View style={{
                position: 'absolute',
                top: H * 0.46,
                left: W * (isMale ? 0.11 : 0.15),
                width: W * 0.05,
                height: W * 0.055,
                borderRadius: W * 0.025,
                backgroundColor: SKIN,
            }} />

            {/* Right Arm */}
            <View style={{
                position: 'absolute',
                top: H * 0.19,
                left: W * (isMale ? 0.79 : 0.75),
                width: W * 0.06,
                height: H * 0.16,
                borderRadius: W * 0.03,
                backgroundColor: SKIN_DARK,
                transform: [{ rotate: '-5deg' }],
            }} />
            <View style={{
                position: 'absolute',
                top: H * 0.33,
                left: W * (isMale ? 0.82 : 0.78),
                width: W * 0.055,
                height: H * 0.14,
                borderRadius: W * 0.025,
                backgroundColor: SKIN_MID,
                transform: [{ rotate: '-3deg' }],
            }} />
            {/* Right Hand */}
            <View style={{
                position: 'absolute',
                top: H * 0.46,
                left: W * (isMale ? 0.84 : 0.80),
                width: W * 0.05,
                height: W * 0.055,
                borderRadius: W * 0.025,
                backgroundColor: SKIN,
            }} />

            {/* Left Leg */}
            <View style={{
                position: 'absolute',
                top: H * 0.48,
                left: W * 0.31,
                width: W * 0.13,
                height: H * 0.28,
                backgroundColor: SKIN_MID,
                borderBottomLeftRadius: W * 0.02,
                borderBottomRightRadius: W * 0.02,
            }} />

            {/* Right Leg */}
            <View style={{
                position: 'absolute',
                top: H * 0.48,
                left: W * 0.56,
                width: W * 0.13,
                height: H * 0.28,
                backgroundColor: SKIN_MID,
                borderBottomLeftRadius: W * 0.02,
                borderBottomRightRadius: W * 0.02,
            }} />

            {/* Left Foot */}
            <View style={{
                position: 'absolute',
                top: H * 0.76,
                left: W * 0.27,
                width: W * 0.18,
                height: H * 0.035,
                backgroundColor: SKIN_DARK,
                borderBottomLeftRadius: W * 0.04,
                borderBottomRightRadius: W * 0.02,
                borderTopLeftRadius: W * 0.01,
                borderTopRightRadius: W * 0.01,
            }} />

            {/* Right Foot */}
            <View style={{
                position: 'absolute',
                top: H * 0.76,
                left: W * 0.55,
                width: W * 0.18,
                height: H * 0.035,
                backgroundColor: SKIN_DARK,
                borderBottomLeftRadius: W * 0.02,
                borderBottomRightRadius: W * 0.04,
                borderTopLeftRadius: W * 0.01,
                borderTopRightRadius: W * 0.01,
            }} />
        </View>
    );
}

/** Empty slot placeholder — dashed border with "+" */
function EmptySlot({
    zone,
    label,
    onPress,
}: {
    zone: { left: string; top: string; width: string; height: string };
    label: string;
    onPress?: () => void;
}) {
    return (
        <TouchableOpacity
            style={[
                slotStyles.container,
                {
                    left: zone.left as any,
                    top: zone.top as any,
                    width: zone.width as any,
                    height: zone.height as any,
                },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={slotStyles.inner}>
                <Ionicons name="add-circle-outline" size={20} color="rgba(212,168,67,0.5)" />
                <Text style={slotStyles.label}>{label}</Text>
            </View>
        </TouchableOpacity>
    );
}

/** Clothing image overlay at a body zone */
function ClothingOverlay({
    item,
    zone,
    zIndex,
    onPress,
}: {
    item: WardrobeItem;
    zone: { left: string; top: string; width: string; height: string };
    zIndex: number;
    onPress?: () => void;
}) {
    const imageUrl = item.processedUrl || item.originalUrl;
    if (!imageUrl) return null;

    return (
        <TouchableOpacity
            style={[
                overlayStyles.container,
                {
                    left: zone.left as any,
                    top: zone.top as any,
                    width: zone.width as any,
                    height: zone.height as any,
                    zIndex,
                },
            ]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <Image
                source={{ uri: api.getImageUrl(imageUrl) }}
                style={overlayStyles.image}
                resizeMode="contain"
            />
        </TouchableOpacity>
    );
}

export default function OutfitCanvas({
    gender,
    layeredItems,
    occasion,
    isDarkMode,
    onSlotPress,
}: OutfitCanvasProps) {
    const occasionInfo = OCCASION_LABELS[occasion] || OCCASION_LABELS.casual;
    const frames = MANNEQUIN_OVERLAY_FRAMES;

    return (
        <View style={[styles.container, { backgroundColor: isDarkMode ? '#1E1814' : '#F5F0EB' }]}>
            {/* Occasion badge */}
            <View style={styles.occasionBadge}>
                <Ionicons name={occasionInfo.icon as any} size={12} color="#D4A843" />
                <Text style={styles.occasionText}>{occasionInfo.label}</Text>
            </View>

            {/* Canvas area */}
            <View style={[styles.canvas, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }]}>
                {/* Mannequin body silhouette */}
                <MannequinBody gender={gender} W={CANVAS_WIDTH} H={CANVAS_HEIGHT} />

                {/* Clothing overlays — render in z-order for correct layering */}
                {/* z1: bottomwear */}
                {layeredItems.bottom ? (
                    <ClothingOverlay
                        item={layeredItems.bottom}
                        zone={frames.bottom}
                        zIndex={1}
                        onPress={() => onSlotPress?.('bottomwear')}
                    />
                ) : (
                    <EmptySlot zone={frames.bottom} label="Bottom" onPress={() => onSlotPress?.('bottomwear')} />
                )}

                {/* z2: footwear */}
                {layeredItems.footwear ? (
                    <ClothingOverlay
                        item={layeredItems.footwear}
                        zone={frames.footwear}
                        zIndex={2}
                        onPress={() => onSlotPress?.('footwear')}
                    />
                ) : (
                    <EmptySlot zone={frames.footwear} label="Shoes" onPress={() => onSlotPress?.('footwear')} />
                )}

                {/* z3: topwear (over pants) */}
                {layeredItems.top ? (
                    <ClothingOverlay
                        item={layeredItems.top}
                        zone={frames.top}
                        zIndex={3}
                        onPress={() => onSlotPress?.('topwear')}
                    />
                ) : (
                    <EmptySlot zone={frames.top} label="Top" onPress={() => onSlotPress?.('topwear')} />
                )}

                {/* z4: outerwear (jacket over everything) */}
                {layeredItems.outerwear && (
                    <ClothingOverlay
                        item={layeredItems.outerwear}
                        zone={frames.outerwear}
                        zIndex={4}
                        onPress={() => onSlotPress?.('outerwear')}
                    />
                )}

                {/* z5: accessories */}
                {layeredItems.accessories && layeredItems.accessories.length > 0 && (
                    <>
                        <ClothingOverlay
                            item={layeredItems.accessories[0]}
                            zone={frames.accessoryLeft}
                            zIndex={5}
                            onPress={() => onSlotPress?.('accessories')}
                        />
                        {layeredItems.accessories.length > 1 && (
                            <ClothingOverlay
                                item={layeredItems.accessories[1]}
                                zone={frames.accessoryRight}
                                zIndex={5}
                                onPress={() => onSlotPress?.('accessories')}
                            />
                        )}
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        overflow: 'hidden',
        alignItems: 'center',
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: 'rgba(212,168,67,0.15)',
    },
    occasionBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(212,168,67,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 20,
    },
    occasionText: {
        color: '#D4A843',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    canvas: {
        position: 'relative',
        overflow: 'hidden',
    },
});

const slotStyles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 1,
    },
    inner: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: 'rgba(212,168,67,0.25)',
        borderStyle: 'dashed',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
    },
    label: {
        color: 'rgba(212,168,67,0.4)',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

const overlayStyles = StyleSheet.create({
    container: {
        position: 'absolute',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
