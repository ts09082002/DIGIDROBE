import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { WardrobeItem } from '../../services/api';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../context/ThemeContext';

type OutfitCanvasProps = {
    topItem?: WardrobeItem | null;
    bottomItem?: WardrobeItem | null;
    shoeItem?: WardrobeItem | null;
    outerItem?: WardrobeItem | null;
    accessoryItems?: WardrobeItem[];
    onOpenDetails: () => void;
};

function getItemImageSource(item?: WardrobeItem | null) {
    if (!item) return null;
    return item.processedUrl || item.originalUrl || null;
}

const DraggablePiece = ({ children, style, zIndex }: { children: React.ReactNode, style: any, zIndex: number }) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);
    
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const startScale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scale: scale.value },
            ],
            zIndex,
        };
    });

    const panGesture = Gesture.Pan()
        .onStart(() => {
            startX.value = translateX.value;
            startY.value = translateY.value;
        })
        .onUpdate((e) => {
            // Apply bounding constraints to avoid losing clothes off-screen completely
            const clampX = Math.max(-120, Math.min(120, startX.value + e.translationX));
            const clampY = Math.max(-160, Math.min(160, startY.value + e.translationY));
            translateX.value = clampX;
            translateY.value = clampY;
        });

    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            startScale.value = scale.value;
        })
        .onUpdate((e) => {
            const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
            scale.value = clamp(startScale.value * e.scale, 0.5, 2.5);
        });

    const combined = Gesture.Simultaneous(panGesture, pinchGesture);

    return (
        <GestureDetector gesture={combined}>
            <Animated.View style={[style, animatedStyle]}>
                {children}
            </Animated.View>
        </GestureDetector>
    );
};

export default function OutfitCanvas({
    topItem,
    bottomItem,
    shoeItem,
    outerItem,
    accessoryItems,
    onOpenDetails,
}: OutfitCanvasProps) {
    const { isDarkMode } = useTheme();
    
    const topImg = getItemImageSource(topItem);
    const bottomImg = getItemImageSource(bottomItem);
    const shoeImg = getItemImageSource(shoeItem);
    const outerImg = getItemImageSource(outerItem);

    // Give a way to trigger details. Tap on the canvas itself opens details. 
    // Wait, pan overrides tap sometimes. We use Tap on the entire canvas wrapper.
    const tapGesture = useMemo(() => {
        return Gesture.Tap().maxDuration(250).onEnd(() => {
            runOnJS(onOpenDetails)();
        });
    }, [onOpenDetails]);

    const canvasBg = isDarkMode ? '#2A2A2A' : '#EDE7DE';

    return (
        <View style={[styles.canvasOuter, { backgroundColor: canvasBg }]}>
            <GestureDetector gesture={tapGesture}>
                <View style={styles.stack}>
                    {!!outerImg && (
                        <DraggablePiece style={[styles.piece, styles.outerPiece]} zIndex={4}>
                            <Image source={{ uri: outerImg }} style={styles.pieceImage} resizeMode="contain" />
                        </DraggablePiece>
                    )}

                    {(accessoryItems || []).map((acc, index) => {
                        const accImg = getItemImageSource(acc);
                        if (!accImg) return null;
                        // Slightly offset each additional accessory so they don't exactly stack
                        const dynamicOffset = { top: 60 + index * 10, right: 10 + index * 10 };
                        return (
                            <DraggablePiece key={`acc-${acc.id}`} style={[styles.piece, styles.accessoryPiece, dynamicOffset]} zIndex={5 + index}>
                                <Image source={{ uri: accImg }} style={styles.pieceImage} resizeMode="contain" />
                            </DraggablePiece>
                        );
                    })}

                    <DraggablePiece style={[styles.piece, styles.topPiece, { opacity: topImg ? 1 : 0.9 }]} zIndex={3}>
                        {topImg ? (
                            <Image source={{ uri: topImg }} style={styles.pieceImage} resizeMode="contain" />
                        ) : null}
                    </DraggablePiece>

                    <DraggablePiece style={[styles.piece, styles.bottomPiece]} zIndex={2}>
                        {bottomImg ? (
                            <Image source={{ uri: bottomImg }} style={styles.pieceImage} resizeMode="contain" />
                        ) : null}
                    </DraggablePiece>

                    <DraggablePiece style={[styles.piece, styles.shoePiece]} zIndex={1}>
                        {shoeImg ? (
                            <Image source={{ uri: shoeImg }} style={styles.pieceImage} resizeMode="contain" />
                        ) : null}
                    </DraggablePiece>
                </View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    canvasOuter: {
        width: '100%',
        height: 380,
        borderRadius: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    stack: {
        width: 280,
        height: 360,
        position: 'relative',
    },
    piece: {
        position: 'absolute',
        width: 280,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'visible',
    },
    pieceImage: {
        width: '100%',
        height: '100%',
    },
    outerPiece: {
        top: 0,
        height: 140,
        width: 280,
    },
    topPiece: {
        top: 20,
        height: 140,
    },
    bottomPiece: {
        top: 130,
        height: 180,
    },
    shoePiece: {
        top: 260,
        height: 90,
    },
    accessoryPiece: {
        position: 'absolute',
        height: 100,
        width: 100,
    },
});
