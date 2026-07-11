import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { WardrobeItem } from '../../services/api';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/theme';

// ─── Public handle ────────────────────────────────────────────────────────────

export type OutfitCanvasHandle = {
    zoomIn: () => void;
    zoomOut: () => void;
};

// ─── Internal piece handle ────────────────────────────────────────────────────

type PieceHandle = { adjustScale: (delta: number) => void };

// ─── Canvas props ─────────────────────────────────────────────────────────────

type OutfitCanvasProps = {
    topItem?: WardrobeItem | null;
    bottomItem?: WardrobeItem | null;
    shoeItem?: WardrobeItem | null;
    outerItem?: WardrobeItem | null;
    accessoryItems?: WardrobeItem[];
    onOpenDetails: () => void;
    /** Fires whenever selection changes — parent uses this to show/hide +/- buttons */
    onSelectionChange?: (hasSelection: boolean) => void;
};

function getImageUri(item?: WardrobeItem | null): string | null {
    if (!item) return null;
    return item.processedUrl || item.originalUrl || null;
}

// ─── DraggablePiece ───────────────────────────────────────────────────────────

type DraggablePieceProps = {
    pieceId: string;
    imageUri: string | null;
    children: React.ReactNode;
    style: any;
    baseZIndex: number;
    isSelected: boolean;
    /** Called on pan-start — always selects (never deselects mid-drag) */
    onSelect: (id: string) => void;
    /** Called on tap — toggles: selects if not selected, deselects if already selected */
    onToggle: (id: string) => void;
    scaleFactor: number;
};

const DraggablePiece = forwardRef<PieceHandle, DraggablePieceProps>(
    ({ children, style, baseZIndex, isSelected, onSelect, onToggle, pieceId, imageUri, scaleFactor }, ref) => {
        const translateX = useSharedValue(0);
        const translateY = useSharedValue(0);
        const scale = useSharedValue(1);
        const startX = useSharedValue(0);
        const startY = useSharedValue(0);
        const startScale = useSharedValue(1);

        // Container pixel size (from onLayout)
        const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
        // Actual displayed image size within the contain-box
        const [displayedSize, setDisplayedSize] = useState<{ w: number; h: number } | null>(null);

        // Whenever the image URI or container size is known, compute the true
        // displayed pixel dimensions so the selection ring hugs the content.
        useEffect(() => {
            if (!imageUri || !containerSize) return;
            let cancelled = false;
            Image.getSize(
                imageUri,
                (natW, natH) => {
                    if (cancelled) return;
                    const scaleW = containerSize.w / natW;
                    const scaleH = containerSize.h / natH;
                    const s = Math.min(scaleW, scaleH); // contain = smallest scale
                    setDisplayedSize({
                        w: Math.round(natW * s),
                        h: Math.round(natH * s),
                    });
                },
                () => {
                    // Fallback: fill the container
                    if (!cancelled) setDisplayedSize({ w: containerSize.w, h: containerSize.h });
                },
            );
            return () => { cancelled = true; };
        }, [imageUri, containerSize?.w, containerSize?.h]);

        useImperativeHandle(ref, () => ({
            adjustScale(delta: number) {
                scale.value = Math.max(0.5, Math.min(2.5, scale.value + delta));
            },
        }));

        const transformStyle = useAnimatedStyle(() => ({
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scale: scale.value },
            ],
        }));

        const panGesture = Gesture.Pan()
            .onStart(() => {
                startX.value = translateX.value;
                startY.value = translateY.value;
                runOnJS(onSelect)(pieceId); // always select on drag-start
            })
            .onUpdate((e) => {
                // Bounds scaled dynamically based on screen width/scaleFactor
                const limitX = 120 * scaleFactor;
                const limitY = 160 * scaleFactor;
                translateX.value = Math.max(-limitX, Math.min(limitX, startX.value + e.translationX));
                translateY.value = Math.max(-limitY, Math.min(limitY, startY.value + e.translationY));
            });

        const pinchGesture = Gesture.Pinch()
            .onStart(() => { startScale.value = scale.value; })
            .onUpdate((e) => {
                scale.value = Math.max(0.5, Math.min(2.5, startScale.value * e.scale));
            });

        // Tap toggles — tapping the selected piece deselects it
        const tapGesture = Gesture.Tap()
            .maxDuration(250)
            .onEnd(() => { runOnJS(onToggle)(pieceId); });

        const combined = Gesture.Simultaneous(panGesture, pinchGesture, tapGesture);

        // Compute ring position: centred over the actual displayed image area
        const ringStyle = (() => {
            if (!isSelected || !displayedSize || !containerSize) return null;
            const pad = 5;
            const offsetLeft = (containerSize.w - displayedSize.w) / 2 - pad;
            const offsetTop = (containerSize.h - displayedSize.h) / 2 - pad;
            return {
                position: 'absolute' as const,
                left: offsetLeft,
                top: offsetTop,
                width: displayedSize.w + pad * 2,
                height: displayedSize.h + pad * 2,
                borderRadius: 10,
                borderWidth: 2.5,
                borderColor: Colors.gold,
            };
        })();

        return (
            <GestureDetector gesture={combined}>
                <Animated.View
                    style={[style, { zIndex: isSelected ? 99 : baseZIndex }, transformStyle]}
                    onLayout={(e) => {
                        const { width, height } = e.nativeEvent.layout;
                        setContainerSize({ w: width, h: height });
                    }}
                >
                    {/* Tight selection ring — sized to actual image content, not the container */}
                    {isSelected && ringStyle && (
                        <View style={ringStyle} pointerEvents="none" />
                    )}
                    {children}
                </Animated.View>
            </GestureDetector>
        );
    },
);

// ─── OutfitCanvas ─────────────────────────────────────────────────────────────

const OutfitCanvas = forwardRef<OutfitCanvasHandle, OutfitCanvasProps>(
    ({ topItem, bottomItem, shoeItem, outerItem, accessoryItems, onOpenDetails, onSelectionChange }, ref) => {
        const { isDarkMode } = useTheme();
        const { width: windowWidth } = useWindowDimensions();
        const [selectedId, setSelectedId] = useState<string | null>(null);

        // Responsive Calculations
        const stackWidth = Math.min(windowWidth - 40, 280);
        const stackHeight = stackWidth * 1.714; // Maintains 280x480 ratio
        const scaleFactor = stackWidth / 280;

        const topRef = useRef<PieceHandle>(null);
        const bottomRef = useRef<PieceHandle>(null);
        const shoeRef = useRef<PieceHandle>(null);
        const outerRef = useRef<PieceHandle>(null);
        const accessoryRefs = useRef<Map<string, PieceHandle>>(new Map());

        // Notify parent when selection changes
        useEffect(() => {
            onSelectionChange?.(selectedId !== null);
        }, [selectedId]);

        const getSelectedHandle = (): PieceHandle | null => {
            if (selectedId === 'top') return topRef.current;
            if (selectedId === 'bottom') return bottomRef.current;
            if (selectedId === 'shoe') return shoeRef.current;
            if (selectedId === 'outer') return outerRef.current;
            if (selectedId) return accessoryRefs.current.get(selectedId) ?? null;
            return null;
        };

        useImperativeHandle(ref, () => ({
            zoomIn() { getSelectedHandle()?.adjustScale(0.15); },
            zoomOut() { getSelectedHandle()?.adjustScale(-0.15); },
        }), [selectedId]);

        // Always selects (used by pan-start so dragging never deselects mid-drag)
        const handleSelect = (id: string) => setSelectedId(id);

        // Toggles: tap again on selected piece deselects it
        const handleToggle = (id: string) => setSelectedId(prev => (prev === id ? null : id));

        const topImg = getImageUri(topItem);
        const bottomImg = getImageUri(bottomItem);
        const shoeImg = getImageUri(shoeItem);
        const outerImg = getImageUri(outerItem);
        const canvasBg = isDarkMode ? '#2A2A2A' : '#EDE7DE';

        return (
            <View style={[styles.canvasOuter, { backgroundColor: canvasBg }]}>
                {/*
                  Background tap:
                  • If something is selected → deselect it
                  • If nothing selected → open outfit details
                */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={() => {
                        if (selectedId) {
                            setSelectedId(null);
                        } else {
                            onOpenDetails();
                        }
                    }}
                    accessible={false}
                />

                <View style={[styles.stack, { width: stackWidth, height: stackHeight }]}>
                    {outerImg && (
                        <DraggablePiece
                            ref={outerRef}
                            pieceId="outer"
                            imageUri={outerImg}
                            scaleFactor={scaleFactor}
                            style={[
                                styles.piece, 
                                styles.outerPiece, 
                                { 
                                    top: 0, 
                                    height: 140 * scaleFactor, 
                                    width: stackWidth 
                                }
                            ]}
                            baseZIndex={4}
                            isSelected={selectedId === 'outer'}
                            onSelect={handleSelect}
                            onToggle={handleToggle}
                        >
                            <Image source={{ uri: outerImg }} style={styles.pieceImage} resizeMode="contain" />
                        </DraggablePiece>
                    )}

                    {(accessoryItems || []).map((acc, index) => {
                        const accImg = getImageUri(acc);
                        if (!accImg) return null;
                        const dynamicOffset = { 
                            top: (60 + index * 10) * scaleFactor, 
                            right: (10 + index * 10) * scaleFactor 
                        };
                        const accId = `acc-${acc.id}`;
                        return (
                            <DraggablePiece
                                key={accId}
                                ref={(r) => {
                                    if (r) accessoryRefs.current.set(accId, r);
                                    else accessoryRefs.current.delete(accId);
                                }}
                                pieceId={accId}
                                imageUri={accImg}
                                scaleFactor={scaleFactor}
                                style={[
                                    styles.piece, 
                                    styles.accessoryPiece, 
                                    dynamicOffset,
                                    {
                                        height: 100 * scaleFactor,
                                        width: 100 * scaleFactor
                                    }
                                ]}
                                baseZIndex={5 + index}
                                isSelected={selectedId === accId}
                                onSelect={handleSelect}
                                onToggle={handleToggle}
                            >
                                <Image source={{ uri: accImg }} style={styles.pieceImage} resizeMode="contain" />
                            </DraggablePiece>
                        );
                    })}

                    {topImg && (
                        <DraggablePiece
                            ref={topRef}
                            pieceId="top"
                            imageUri={topImg}
                            scaleFactor={scaleFactor}
                            style={[
                                styles.piece, 
                                styles.topPiece, 
                                { 
                                    top: 20 * scaleFactor, 
                                    height: 140 * scaleFactor, 
                                    width: stackWidth 
                                }
                            ]}
                            baseZIndex={3}
                            isSelected={selectedId === 'top'}
                            onSelect={handleSelect}
                            onToggle={handleToggle}
                        >
                            <Image source={{ uri: topImg }} style={styles.pieceImage} resizeMode="contain" />
                        </DraggablePiece>
                    )}

                    {bottomImg && (
                        <DraggablePiece
                            ref={bottomRef}
                            pieceId="bottom"
                            imageUri={bottomImg}
                            scaleFactor={scaleFactor}
                            style={[
                                styles.piece, 
                                styles.bottomPiece, 
                                { 
                                    top: 130 * scaleFactor, 
                                    height: 180 * scaleFactor, 
                                    width: stackWidth 
                                }
                            ]}
                            baseZIndex={2}
                            isSelected={selectedId === 'bottom'}
                            onSelect={handleSelect}
                            onToggle={handleToggle}
                        >
                            <Image source={{ uri: bottomImg }} style={styles.pieceImage} resizeMode="contain" />
                        </DraggablePiece>
                    )}

                    {shoeImg && (
                        <DraggablePiece
                            ref={shoeRef}
                            pieceId="shoe"
                            imageUri={shoeImg}
                            scaleFactor={scaleFactor}
                            style={[
                                styles.piece, 
                                styles.shoePiece, 
                                { 
                                    top: 260 * scaleFactor, 
                                    height: 90 * scaleFactor, 
                                    width: stackWidth 
                                }
                            ]}
                            baseZIndex={1}
                            isSelected={selectedId === 'shoe'}
                            onSelect={handleSelect}
                            onToggle={handleToggle}
                        >
                            <Image source={{ uri: shoeImg }} style={styles.pieceImage} resizeMode="contain" />
                        </DraggablePiece>
                    )}
                </View>
            </View>
        );
    },
);

export default OutfitCanvas;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    canvasOuter: {
        width: '100%',
        height: 500,
        borderRadius: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    stack: {
        position: 'relative',
    },
    piece: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'visible',
    },
    pieceImage: {
        width: '100%',
        height: '100%',
    },
    outerPiece: {},
    topPiece: {},
    bottomPiece: {},
    shoePiece: {},
    accessoryPiece: {
        position: 'absolute',
    },
});
