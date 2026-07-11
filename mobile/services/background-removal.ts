/**
 * Pro On-Device Background Removal
 *
 * Multi-pass pipeline using ML Kit Subject Segmentation
 * via @six33/react-native-bg-removal.
 *
 * Pipeline:
 *   Pass 1 (Detection):   Fast segmentation → find subject bounding box
 *   Pass 2 (HD Segment):  Crop original to bounding box + padding →
 *                          re-run segmentation at higher effective resolution
 *   Post-process:         Alpha edge feathering for smooth, anti-aliased edges
 *
 * Falls back to single-pass if detection or crop fails.
 *
 * Requires EAS dev client build (`expo run:android`).
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { removeBackground } from '@six33/react-native-bg-removal';
import { decodePngPixels, encodePngToFile } from './png-codec';
import { featherEdges, findContentBounds, erodeAlpha, contrastAlpha } from './mask-refinement';

// Maximum output resolution for the final processed image
const MAX_OUTPUT_SIZE = 1024;

// Padding around the detected subject (fraction of bounding box size)
const CROP_PADDING_RATIO = 0.08;

async function deleteFileSafe(uri: string): Promise<void> {
    try {
        const FileSystem = require('expo-file-system/legacy');
        await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
        // ignore
    }
}

export interface BackgroundRemovalResult {
    /** URI to the processed PNG with transparent background */
    processedUri: string;
    /** Raw RGBA pixel data (for color extraction downstream) */
    rgbaPixels: Uint8Array;
    width: number;
    height: number;
}

/**
 * Remove background from a clothing image using the Pro multi-pass pipeline.
 *
 * Falls back to single-pass or original image if any step fails.
 */
export async function removeBackgroundOnDevice(
    imageUri: string,
    lowMemoryMode: boolean = false
): Promise<BackgroundRemovalResult> {
    const tempFiles: string[] = [];
    let pass1Pixels: any = null;
    let pass2Pixels: any = null;
    try {
        if (lowMemoryMode) {
            console.log('[BgRemoval] Low memory mode enabled, skipping multi-pass pipeline');
            return await singlePassFallback(imageUri, true);
        }

        console.log('[BgRemoval] Starting Pro multi-pass pipeline…');

        // ── Pass 1: Detection pass ──────────────────────────────────────
        // Run segmentation on a moderately-sized version to find the subject
        const detectionSize = 640;
        const detectionImage = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: detectionSize } }],
            { format: ImageManipulator.SaveFormat.PNG },
        );
        tempFiles.push(detectionImage.uri);

        const pass1Uri = await removeBackground(detectionImage.uri, { trim: false });
        tempFiles.push(pass1Uri);
        pass1Pixels = await decodePngPixels(pass1Uri);
        console.log(`[BgRemoval] Pass 1 complete: ${pass1Pixels.width}x${pass1Pixels.height}`);

        // Find the tight bounding box of the subject in the detection image
        const bounds = findContentBounds(
            pass1Pixels.rgba,
            pass1Pixels.width,
            pass1Pixels.height,
        );

        // Nullify Pass 1 pixels immediately after finding bounds to free memory
        if (pass1Pixels) {
            pass1Pixels.rgba = null;
        }

        if (!bounds || bounds.w < 10 || bounds.h < 10) {
            console.log('[BgRemoval] No clear subject found in Pass 1, falling back to single-pass');
            return await singlePassFallback(imageUri);
        }

        console.log(`[BgRemoval] Subject bounds: ${bounds.x},${bounds.y} ${bounds.w}x${bounds.h}`);

        // ── Pass 2: High-resolution focused crop ────────────────────────
        // Scale the bounds back to the original image coordinates.
        // We need the original image dimensions for this.
        const originalInfo = await ImageManipulator.manipulateAsync(
            imageUri,
            [],
            { format: ImageManipulator.SaveFormat.PNG },
        );
        tempFiles.push(originalInfo.uri);

        // Calculate scales based on original and Pass 1 dimensions
        const pass1Width = originalInfo.width > originalInfo.height ? 640 : Math.round(640 * (originalInfo.width / originalInfo.height));
        const pass1Height = originalInfo.width > originalInfo.height ? Math.round(640 * (originalInfo.height / originalInfo.width)) : 640;

        const scaleX = originalInfo.width / pass1Width;
        const scaleY = originalInfo.height / pass1Height;

        // Scale bounds to original resolution with padding
        const padX = Math.round(bounds.w * CROP_PADDING_RATIO * scaleX);
        const padY = Math.round(bounds.h * CROP_PADDING_RATIO * scaleY);

        const cropX = Math.max(0, Math.round(bounds.x * scaleX) - padX);
        const cropY = Math.max(0, Math.round(bounds.y * scaleY) - padY);
        const cropW = Math.min(
            originalInfo.width - cropX,
            Math.round(bounds.w * scaleX) + padX * 2,
        );
        const cropH = Math.min(
            originalInfo.height - cropY,
            Math.round(bounds.h * scaleY) + padY * 2,
        );

        console.log(`[BgRemoval] Focused crop: ${cropX},${cropY} ${cropW}x${cropH} (original: ${originalInfo.width}x${originalInfo.height})`);

        // Crop the original image to the subject region
        const cropped = await ImageManipulator.manipulateAsync(
            imageUri,
            [
                { crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } },
                { resize: { width: Math.min(MAX_OUTPUT_SIZE, cropW) } },
            ],
            { format: ImageManipulator.SaveFormat.PNG },
        );
        tempFiles.push(cropped.uri);

        // Run ML Kit on the focused crop — the model now spends its entire
        // resolution budget on the clothing item instead of the whole scene
        const pass2Uri = await removeBackground(cropped.uri, { trim: true });
        tempFiles.push(pass2Uri);
        pass2Pixels = await decodePngPixels(pass2Uri);
        console.log(`[BgRemoval] Pass 2 complete: ${pass2Pixels.width}x${pass2Pixels.height}`);

        // ── Post-process: Edge Refinement ───────────────────────────────
        // 1. Boost alpha contrast to sharpen the core mask
        contrastAlpha(pass2Pixels.rgba, pass2Pixels.width, pass2Pixels.height, 1.6);
        
        // 2. Erode the mask by 1px to remove background "halo" bleeding
        erodeAlpha(pass2Pixels.rgba, pass2Pixels.width, pass2Pixels.height, 1);
        
        // 3. Smooth the jagged alpha channel edges with multi-pass blur
        featherEdges(pass2Pixels.rgba, pass2Pixels.width, pass2Pixels.height, 2);
        
        console.log('[BgRemoval] Edge refinement (Contrast + Erosion + Feather) applied');

        // Encode the refined result back to PNG
        const finalUri = await encodePngToFile(
            pass2Pixels.rgba,
            pass2Pixels.width,
            pass2Pixels.height,
        );

        return {
            processedUri: finalUri,
            rgbaPixels: pass2Pixels.rgba,
            width: pass2Pixels.width,
            height: pass2Pixels.height,
        };
    } catch (err) {
        console.warn('[BgRemoval] Pro pipeline failed, trying single-pass fallback:', err);
        try {
            return await singlePassFallback(imageUri, lowMemoryMode);
        } catch (err2) {
            console.warn('[BgRemoval] Single-pass also failed, returning original:', err2);
            return await originalFallback(imageUri);
        }
    } finally {
        if (pass1Pixels) {
            pass1Pixels.rgba = null;
        }
        pass1Pixels = null;
        pass2Pixels = null;
        for (const uri of tempFiles) {
            await deleteFileSafe(uri);
        }
    }
}

// ─── Fallback: Single-pass (original behavior) ──────────────────────────────

async function singlePassFallback(
    imageUri: string,
    lowMemoryMode: boolean = false
): Promise<BackgroundRemovalResult> {
    console.log('[BgRemoval] Running single-pass segmentation…');
    const tempFiles: string[] = [];
    
    try {
        // In low memory mode, downscale the image significantly before running segmentation
        let processUri = imageUri;
        if (lowMemoryMode) {
            const resized = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ resize: { width: 768 } }], // smaller than max output
                { format: ImageManipulator.SaveFormat.PNG },
            );
            processUri = resized.uri;
            tempFiles.push(resized.uri);
        }

        const resultUri = await removeBackground(processUri, { trim: true });
        tempFiles.push(resultUri);
        const pixels = await decodePngPixels(resultUri);

        // Still apply edge refinement even in single-pass mode
        contrastAlpha(pixels.rgba, pixels.width, pixels.height, 1.4);
        erodeAlpha(pixels.rgba, pixels.width, pixels.height, 1);
        featherEdges(pixels.rgba, pixels.width, pixels.height, 2);

        const finalUri = await encodePngToFile(pixels.rgba, pixels.width, pixels.height);

        return {
            processedUri: finalUri,
            rgbaPixels: pixels.rgba,
            width: pixels.width,
            height: pixels.height,
        };
    } finally {
        for (const uri of tempFiles) {
            await deleteFileSafe(uri);
        }
    }
}

// ─── Fallback: Return original image (no segmentation) ───────────────────────

async function originalFallback(
    imageUri: string,
): Promise<BackgroundRemovalResult> {
    const resized = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: MAX_OUTPUT_SIZE, height: MAX_OUTPUT_SIZE } }],
        { format: ImageManipulator.SaveFormat.PNG },
    );

    try {
        const pixels = await decodePngPixels(resized.uri);
        return {
            processedUri: resized.uri,
            rgbaPixels: pixels.rgba,
            width: pixels.width,
            height: pixels.height,
        };
    } catch {
        console.warn('[BgRemoval] PNG decode failed in fallback mode, using stub pixels');
        return {
            processedUri: resized.uri,
            rgbaPixels: new Uint8Array([180, 180, 180, 255]),
            width: 1,
            height: 1,
        };
    }
}
