/**
 * On-device background removal using ML Kit Subject Segmentation
 * via @six33/react-native-bg-removal.
 *
 * Segments ANY foreground object (clothing, bags, shoes, etc.) from
 * the background — not limited to people/selfies.
 *
 * Requires EAS dev client build (`expo run:android`).
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { removeBackground } from '@six33/react-native-bg-removal';
import { decodePngPixels } from './png-codec';

export interface BackgroundRemovalResult {
    /** URI to the processed PNG with transparent background */
    processedUri: string;
    /** Raw RGBA pixel data (for color extraction downstream) */
    rgbaPixels: Uint8Array;
    width: number;
    height: number;
}

/**
 * Remove background from a clothing image on-device using ML Kit
 * Subject Segmentation.
 *
 * Falls back to returning the original image if segmentation fails
 * (e.g. native module not linked, first-time model download, etc.).
 */
export async function removeBackgroundOnDevice(
    imageUri: string,
): Promise<BackgroundRemovalResult> {
    try {
        console.log('[BgRemoval] Running ML Kit Subject Segmentation…');
        const resultUri = await removeBackground(imageUri, { trim: true });
        console.log('[BgRemoval] Background removed successfully');

        // Decode the processed PNG to get raw pixel data for color extraction
        const pixels = await decodePngPixels(resultUri);
        return {
            processedUri: resultUri,
            rgbaPixels: pixels.rgba,
            width: pixels.width,
            height: pixels.height,
        };
    } catch (err) {
        console.warn('[BgRemoval] ML Kit segmentation failed, returning original image:', err);

        // Fallback: resize and return the original image
        const maxOutputSize = 1024;
        const resized = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: maxOutputSize, height: maxOutputSize } }],
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
        } catch (decodeErr) {
            console.warn('[BgRemoval] PNG decode failed in fallback mode, using stub pixels:', decodeErr);
            return {
                processedUri: resized.uri,
                rgbaPixels: new Uint8Array([180, 180, 180, 255]),
                width: 1,
                height: 1,
            };
        }
    }
}
