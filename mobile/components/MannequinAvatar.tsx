/**
 * MannequinAvatar — Shows RPM avatar HEAD + clean body silhouette
 * with wardrobe clothing items overlaid properly.
 *
 * The RPM avatar is cropped to only show the face/head.
 * Below it, a clean neutral body silhouette is drawn using Views,
 * and the user's wardrobe items are overlaid at body zones.
 * This avoids the RPM avatar's default clothes conflicting with overlays.
 */
import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, WardrobeItem } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_WIDTH = SCREEN_WIDTH - 64;
const AVATAR_HEIGHT = AVATAR_WIDTH * 1.6;

// Head section height (RPM avatar face)
const HEAD_HEIGHT = AVATAR_HEIGHT * 0.16;
// Body section height (silhouette + clothes)
const BODY_HEIGHT = AVATAR_HEIGHT - HEAD_HEIGHT;

interface MannequinAvatarProps {
    gender: 'male' | 'female';
    topItem?: WardrobeItem;
    bottomItem?: WardrobeItem;
    footwearItem?: WardrobeItem;
    outerwearItem?: WardrobeItem;
    occasion: string;
    isDarkMode: boolean;
    avatarUrl?: string | null;
    onCreateAvatar?: () => void;
}

/** Default RPM avatars — public demo models */
const DEFAULT_AVATARS = {
    male: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
    female: 'https://models.readyplayer.me/64bfa0ce0e72c63d7c3934a3.glb',
};

/** Get RPM head-only render (cropped to face) */
function getHeadRenderUrl(glbUrl: string): string {
    const pngUrl = glbUrl.replace('.glb', '.png');
    return `${pngUrl}?scene=headshot-portrait-v1-transparent`;
}

const OCCASION_LABELS: Record<string, { label: string; icon: string }> = {
    casual: { label: 'CASUAL', icon: 'sunny-outline' },
    work: { label: 'WORK', icon: 'briefcase-outline' },
    date: { label: 'DATE', icon: 'heart-outline' },
    party: { label: 'PARTY', icon: 'sparkles-outline' },
};

const SKIN = '#C4A882';
const SKIN_DARK = '#B89970';
const SKIN_LIGHT = '#D4BC9A';

/**
 * Clean body silhouette — neutral mannequin body (no default clothes)
 * Only shows body parts that WON'T be covered by clothing overlays:
 * neck, arms, hands, and legs below shorts.
 * The torso/hip areas are intentionally subtle so clothes cover them.
 */
function BodySilhouette({ gender, width: W, height: H }: { gender: 'male' | 'female'; width: number; height: number }) {
    const isMale = gender === 'male';

    return (
        <View style={{ width: W, height: H }} pointerEvents="none">
            {/* Neck connector */}
            <View style={{
                position: 'absolute',
                top: 0,
                left: W * 0.43,
                width: W * 0.14,
                height: H * 0.04,
                backgroundColor: SKIN_DARK,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
            }} />

            {/* Shoulders */}
            <View style={{
                position: 'absolute',
                top: H * 0.02,
                left: W * (isMale ? 0.18 : 0.22),
                width: W * (isMale ? 0.64 : 0.56),
                height: H * 0.04,
                backgroundColor: SKIN,
                borderTopLeftRadius: W * 0.08,
                borderTopRightRadius: W * 0.08,
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
            }} />

            {/* Torso — light/subtle, clothes will cover */}
            <View style={{
                position: 'absolute',
                top: H * 0.04,
                left: W * (isMale ? 0.26 : 0.28),
                width: W * (isMale ? 0.48 : 0.44),
                height: H * 0.32,
                backgroundColor: SKIN,
                borderBottomLeftRadius: isMale ? 4 : W * 0.04,
                borderBottomRightRadius: isMale ? 4 : W * 0.04,
            }} />

            {/* Waist */}
            <View style={{
                position: 'absolute',
                top: H * 0.34,
                left: W * (isMale ? 0.28 : 0.30),
                width: W * (isMale ? 0.44 : 0.40),
                height: H * 0.04,
                backgroundColor: SKIN_DARK,
                borderRadius: 4,
            }} />

            {/* Hips */}
            <View style={{
                position: 'absolute',
                top: H * 0.37,
                left: W * (isMale ? 0.29 : 0.25),
                width: W * (isMale ? 0.42 : 0.50),
                height: H * 0.07,
                backgroundColor: SKIN,
                borderBottomLeftRadius: isMale ? 6 : W * 0.06,
                borderBottomRightRadius: isMale ? 6 : W * 0.06,
            }} />

            {/* Left Arm */}
            <View style={{
                position: 'absolute',
                top: H * 0.04,
                left: W * (isMale ? 0.14 : 0.18),
                width: W * 0.065,
                height: H * 0.20,
                backgroundColor: SKIN_DARK,
                borderRadius: W * 0.03,
                transform: [{ rotate: '5deg' }],
            }} />
            {/* Left Forearm */}
            <View style={{
                position: 'absolute',
                top: H * 0.22,
                left: W * (isMale ? 0.11 : 0.15),
                width: W * 0.055,
                height: H * 0.18,
                backgroundColor: SKIN,
                borderRadius: W * 0.025,
                transform: [{ rotate: '3deg' }],
            }} />
            {/* Left Hand */}
            <View style={{
                position: 'absolute',
                top: H * 0.39,
                left: W * (isMale ? 0.10 : 0.14),
                width: W * 0.05,
                height: W * 0.06,
                backgroundColor: SKIN_LIGHT,
                borderRadius: W * 0.025,
            }} />

            {/* Right Arm */}
            <View style={{
                position: 'absolute',
                top: H * 0.04,
                left: W * (isMale ? 0.79 : 0.76),
                width: W * 0.065,
                height: H * 0.20,
                backgroundColor: SKIN_DARK,
                borderRadius: W * 0.03,
                transform: [{ rotate: '-5deg' }],
            }} />
            {/* Right Forearm */}
            <View style={{
                position: 'absolute',
                top: H * 0.22,
                left: W * (isMale ? 0.82 : 0.79),
                width: W * 0.055,
                height: H * 0.18,
                backgroundColor: SKIN,
                borderRadius: W * 0.025,
                transform: [{ rotate: '-3deg' }],
            }} />
            {/* Right Hand */}
            <View style={{
                position: 'absolute',
                top: H * 0.39,
                left: W * (isMale ? 0.84 : 0.81),
                width: W * 0.05,
                height: W * 0.06,
                backgroundColor: SKIN_LIGHT,
                borderRadius: W * 0.025,
            }} />

            {/* Left Leg */}
            <View style={{
                position: 'absolute',
                top: H * 0.43,
                left: W * 0.30,
                width: W * 0.14,
                height: H * 0.35,
                backgroundColor: SKIN,
                borderBottomLeftRadius: W * 0.02,
                borderBottomRightRadius: W * 0.02,
            }} />

            {/* Right Leg */}
            <View style={{
                position: 'absolute',
                top: H * 0.43,
                left: W * 0.56,
                width: W * 0.14,
                height: H * 0.35,
                backgroundColor: SKIN,
                borderBottomLeftRadius: W * 0.02,
                borderBottomRightRadius: W * 0.02,
            }} />

            {/* Left Foot */}
            <View style={{
                position: 'absolute',
                top: H * 0.77,
                left: W * 0.26,
                width: W * 0.19,
                height: H * 0.04,
                backgroundColor: SKIN_DARK,
                borderRadius: W * 0.02,
                borderTopLeftRadius: W * 0.01,
                borderBottomLeftRadius: W * 0.04,
            }} />

            {/* Right Foot */}
            <View style={{
                position: 'absolute',
                top: H * 0.77,
                left: W * 0.55,
                width: W * 0.19,
                height: H * 0.04,
                backgroundColor: SKIN_DARK,
                borderRadius: W * 0.02,
                borderTopRightRadius: W * 0.01,
                borderBottomRightRadius: W * 0.04,
            }} />
        </View>
    );
}

/**
 * Clothing overlay zones — positioned relative to the BODY section
 * (not the full avatar area, since head is separate)
 */
const CLOTHING_ZONES = {
    top: { top: '2%', left: '18%', width: '64%', height: '30%' },
    bottom: { top: '30%', left: '22%', width: '56%', height: '36%' },
    footwear: { top: '72%', left: '24%', width: '52%', height: '16%' },
    outerwear: { top: '0%', left: '12%', width: '76%', height: '34%' },
} as const;

function ClothingOverlay({
    item,
    zone,
}: {
    item: WardrobeItem;
    zone: { top: string; left: string; width: string; height: string };
}) {
    const imageUrl = item.processedUrl || item.originalUrl;
    if (!imageUrl) return null;

    return (
        <View
            style={[
                overlayStyles.zone,
                {
                    top: zone.top as any,
                    left: zone.left as any,
                    width: zone.width as any,
                    height: zone.height as any,
                },
            ]}
        >
            <Image
                source={{ uri: api.getImageUrl(imageUrl) }}
                style={overlayStyles.image}
                resizeMode="contain"
            />
        </View>
    );
}

export default function MannequinAvatar({
    gender,
    topItem,
    bottomItem,
    footwearItem,
    outerwearItem,
    occasion,
    isDarkMode,
    avatarUrl,
    onCreateAvatar,
}: MannequinAvatarProps) {
    const occasionInfo = OCCASION_LABELS[occasion] || OCCASION_LABELS.casual;
    const hasClothing = topItem || bottomItem || footwearItem || outerwearItem;
    const [headLoading, setHeadLoading] = useState(true);

    const activeAvatarGlb = avatarUrl || DEFAULT_AVATARS[gender];
    const headImageUrl = getHeadRenderUrl(activeAvatarGlb);

    return (
        <View style={[styles.container, { backgroundColor: isDarkMode ? '#1A1410' : '#2A2018' }]}>
            {/* Occasion badge */}
            <View style={styles.occasionBadge}>
                <Ionicons name={occasionInfo.icon as any} size={12} color="#D4A843" />
                <Text style={styles.occasionText}>{occasionInfo.label}</Text>
            </View>

            {/* === HEAD SECTION — RPM avatar face === */}
            <View style={[styles.headSection, { width: AVATAR_WIDTH, height: HEAD_HEIGHT }]}>
                <Image
                    source={{ uri: headImageUrl }}
                    style={styles.headImage}
                    resizeMode="contain"
                    onLoadEnd={() => setHeadLoading(false)}
                    onError={() => setHeadLoading(false)}
                />
                {headLoading && (
                    <View style={styles.headLoading}>
                        <ActivityIndicator size="small" color="#D4A843" />
                    </View>
                )}
            </View>

            {/* === BODY SECTION — silhouette + clothing overlays === */}
            <View style={[styles.bodySection, { width: AVATAR_WIDTH, height: BODY_HEIGHT }]}>
                {/* Base body silhouette (behind clothes) */}
                <BodySilhouette gender={gender} width={AVATAR_WIDTH} height={BODY_HEIGHT} />

                {/* Clothing overlays — your wardrobe items */}
                {bottomItem && (
                    <ClothingOverlay item={bottomItem} zone={CLOTHING_ZONES.bottom} />
                )}
                {footwearItem && (
                    <ClothingOverlay item={footwearItem} zone={CLOTHING_ZONES.footwear} />
                )}
                {topItem && (
                    <ClothingOverlay item={topItem} zone={CLOTHING_ZONES.top} />
                )}
                {outerwearItem && (
                    <ClothingOverlay item={outerwearItem} zone={CLOTHING_ZONES.outerwear} />
                )}

                {/* Empty state */}
                {!hasClothing && (
                    <View style={styles.emptyOverlay}>
                        <Ionicons name="shirt-outline" size={28} color="rgba(212,168,67,0.4)" />
                        <Text style={styles.emptyText}>Tap shuffle to generate an outfit</Text>
                    </View>
                )}
            </View>

            {/* Customize avatar button */}
            {onCreateAvatar && (
                <TouchableOpacity style={styles.customizeBtn} onPress={onCreateAvatar}>
                    <Ionicons name="color-palette-outline" size={14} color="#D4A843" />
                    <Text style={styles.customizeBtnText}>
                        {avatarUrl ? 'Edit Avatar' : 'Customize'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Gender indicator */}
            <View style={styles.genderPill}>
                <Ionicons
                    name={gender === 'male' ? 'man' : 'woman'}
                    size={14}
                    color="#D4A843"
                />
                <Text style={styles.genderText}>
                    {gender === 'male' ? 'Male' : 'Female'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        alignItems: 'center',
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: 'rgba(212,168,67,0.2)',
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
        zIndex: 10,
    },
    occasionText: {
        color: '#D4A843',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    headSection: {
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    headImage: {
        width: '50%',
        height: '100%',
    },
    headLoading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bodySection: {
        position: 'relative',
        overflow: 'hidden',
    },
    emptyOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    emptyText: {
        color: 'rgba(212,168,67,0.5)',
        fontSize: 12,
        fontWeight: '600',
    },
    customizeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(42,32,24,0.85)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(212,168,67,0.3)',
    },
    customizeBtnText: {
        color: '#D4A843',
        fontSize: 11,
        fontWeight: '700',
    },
    genderPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        backgroundColor: 'rgba(212,168,67,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    genderText: {
        color: '#D4A843',
        fontSize: 11,
        fontWeight: '700',
    },
});

const overlayStyles = StyleSheet.create({
    zone: {
        position: 'absolute',
        zIndex: 5,
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
