/**
 * Local image storage service.
 *
 * All clothing images are stored on the device filesystem under
 * documentDirectory/wardrobe/. Images never leave the device
 * unless the user explicitly enables cloud sync (thumbnails only).
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { API_BASE_URL } from '../constants/theme';

const WARDROBE_DIR = `${FileSystem.documentDirectory}wardrobe/`;
const ORIGINALS_DIR = `${WARDROBE_DIR}originals/`;
const PROCESSED_DIR = `${WARDROBE_DIR}processed/`;
const THUMBNAILS_DIR = `${WARDROBE_DIR}thumbnails/`;

const THUMBNAIL_SIZE = 150;

let _dirReady = false;

/**
 * Create the directory structure on first use.
 */
export async function ensureDirectories(): Promise<void> {
    if (_dirReady) return;

    await FileSystem.makeDirectoryAsync(ORIGINALS_DIR, { intermediates: true });
    await FileSystem.makeDirectoryAsync(PROCESSED_DIR, { intermediates: true });
    await FileSystem.makeDirectoryAsync(THUMBNAILS_DIR, { intermediates: true });

    _dirReady = true;
}

/**
 * Copy the original image to permanent local storage.
 * @returns The permanent file:// URI
 */
export async function saveOriginalImage(
    tempUri: string,
    itemId: string,
): Promise<string> {
    await ensureDirectories();
    const dest = `${ORIGINALS_DIR}${itemId}.jpg`;
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    return dest;
}

/**
 * Copy the processed (background-removed) PNG to permanent local storage.
 * @returns The permanent file:// URI
 */
export async function saveProcessedImage(
    tempUri: string,
    itemId: string,
): Promise<string> {
    await ensureDirectories();
    const dest = `${PROCESSED_DIR}${itemId}.png`;
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    return dest;
}

/**
 * Generate a low-res thumbnail from the processed image.
 * Used for optional cloud sync (small payload, ~5-10 KB).
 * @returns The thumbnail file:// URI
 */
export async function generateThumbnail(
    sourcePath: string,
    itemId: string,
): Promise<string> {
    await ensureDirectories();

    const result = await ImageManipulator.manipulateAsync(
        sourcePath,
        [{ resize: { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
    );

    const dest = `${THUMBNAILS_DIR}${itemId}.jpg`;
    await FileSystem.moveAsync({ from: result.uri, to: dest });
    return dest;
}

/**
 * Delete all image files for a given item (original, processed, thumbnail).
 */
export async function deleteImages(itemId: string): Promise<void> {
    const paths = [
        `${ORIGINALS_DIR}${itemId}.jpg`,
        `${PROCESSED_DIR}${itemId}.png`,
        `${THUMBNAILS_DIR}${itemId}.jpg`,
    ];

    await Promise.all(
        paths.map(async (path) => {
            try {
                const info = await FileSystem.getInfoAsync(path);
                if (info.exists) {
                    await FileSystem.deleteAsync(path, { idempotent: true });
                }
            } catch {
                // Ignore — file may not exist
            }
        }),
    );
}

/**
 * Resolve an image path to a displayable URI.
 *
 * - Local file:// paths are returned as-is
 * - Legacy backend /uploads/ paths get the API base URL prepended
 *   (used during migration or for AI features that still reference backend URLs)
 */
export function getImageUri(path: string): string {
    if (!path) return '';
    if (path.startsWith('file://')) return path;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // Legacy backend path (e.g. /uploads/processed/xxx.png)
    return `${API_BASE_URL}${path}`;
}

/**
 * Get the file size of a local image.
 */
export async function getLocalFileSize(uri: string): Promise<number> {
    try {
        const info = await FileSystem.getInfoAsync(uri);
        return (info as any).size ?? 0;
    } catch {
        return 0;
    }
}
