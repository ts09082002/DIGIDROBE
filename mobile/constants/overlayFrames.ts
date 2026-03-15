/**
 * Overlay frame types and constants for positioning clothing items
 * on the mannequin canvas. Extracted from outfits.tsx for sharing
 * between OutfitCanvas and outfits.tsx.
 */

export type OverlayKey =
    | 'top'
    | 'bottom'
    | 'outerwear'
    | 'footwear'
    | 'accessoryLeft'
    | 'accessoryRight';

export type OverlayFrame = {
    left: `${number}%`;
    top: `${number}%`;
    width: `${number}%`;
    height: `${number}%`;
};

export type OverlayState = Record<OverlayKey, { x: number; y: number; scale: number }>;

/** Default overlay frames for the mannequin canvas */
export const MANNEQUIN_OVERLAY_FRAMES: Record<OverlayKey, OverlayFrame> = {
    top: { left: '23%', top: '25%', width: '54%', height: '25%' },
    bottom: { left: '24%', top: '47%', width: '52%', height: '34%' },
    outerwear: { left: '19%', top: '24%', width: '62%', height: '29%' },
    footwear: { left: '29%', top: '80%', width: '42%', height: '10%' },
    accessoryLeft: { left: '16%', top: '32%', width: '12%', height: '12%' },
    accessoryRight: { left: '72%', top: '32%', width: '12%', height: '12%' },
};

export const getDefaultOverlayState = (): OverlayState => ({
    top: { x: 0, y: 12, scale: 1.22 },
    bottom: { x: 0, y: 8, scale: 1.14 },
    outerwear: { x: 0, y: 8, scale: 1.18 },
    footwear: { x: 0, y: 10, scale: 1.26 },
    accessoryLeft: { x: 0, y: 0, scale: 1 },
    accessoryRight: { x: 0, y: 0, scale: 1 },
});
