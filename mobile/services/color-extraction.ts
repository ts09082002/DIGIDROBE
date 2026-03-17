/**
 * On-device color extraction using Median Cut algorithm.
 * Pure JS — no ML model needed. Replaces server-side ColorThief.
 */

import { hexToName, rgbToHex } from './ml-classifier';

export interface ColorPaletteEntry {
    hex: string;
    name: string;
}

export interface ColorExtractionResult {
    dominantHex: string;
    dominantName: string;
    palette: ColorPaletteEntry[];
}

type RGB = [number, number, number];

/**
 * Extract dominant colors from RGBA pixel data using Median Cut.
 * Only samples non-transparent pixels.
 */
export function extractColorsFromPixels(
    rgbaPixels: Uint8Array,
    width: number,
    height: number,
    maxColors: number = 5,
): ColorExtractionResult {
    // 1. Sample non-transparent pixels
    const totalPixels = width * height;
    const step = Math.max(1, Math.floor(totalPixels / 10000)); // ~10K samples max
    const samples: RGB[] = [];

    for (let i = 0; i < totalPixels; i += step) {
        const offset = i * 4;
        const alpha = rgbaPixels[offset + 3];
        if (alpha < 20) continue;
        samples.push([rgbaPixels[offset], rgbaPixels[offset + 1], rgbaPixels[offset + 2]]);
    }

    if (samples.length === 0) {
        return {
            dominantHex: '#B0B0B0',
            dominantName: 'Grey',
            palette: [{ hex: '#B0B0B0', name: 'Grey' }],
        };
    }

    // 2. Median Cut clustering
    const clusters = medianCut(samples, maxColors);

    // 3. Map to named colors and deduplicate
    const palette: ColorPaletteEntry[] = [];
    const seenNames = new Set<string>();

    for (const [r, g, b] of clusters) {
        const hex = rgbToHex(r, g, b);
        const name = hexToName(hex);
        if (!seenNames.has(name)) {
            palette.push({ hex, name });
            seenNames.add(name);
        }
        if (palette.length >= maxColors) break;
    }

    // Ensure at least one entry
    if (palette.length === 0) {
        const avg = averageColor(samples);
        const hex = rgbToHex(avg[0], avg[1], avg[2]);
        palette.push({ hex, name: hexToName(hex) });
    }

    return {
        dominantHex: palette[0].hex,
        dominantName: palette[0].name,
        palette,
    };
}

// ─── Median Cut Algorithm ────────────────────────────────────────────────────

interface ColorBucket {
    pixels: RGB[];
}

function channelRange(pixels: RGB[], channel: 0 | 1 | 2): number {
    let min = 255, max = 0;
    for (const px of pixels) {
        if (px[channel] < min) min = px[channel];
        if (px[channel] > max) max = px[channel];
    }
    return max - min;
}

function splitBucket(bucket: ColorBucket): [ColorBucket, ColorBucket] {
    const { pixels } = bucket;

    // Find channel with widest range
    const rRange = channelRange(pixels, 0);
    const gRange = channelRange(pixels, 1);
    const bRange = channelRange(pixels, 2);

    let sortChannel: 0 | 1 | 2 = 0;
    if (gRange >= rRange && gRange >= bRange) sortChannel = 1;
    else if (bRange >= rRange && bRange >= gRange) sortChannel = 2;

    // Sort by that channel
    pixels.sort((a, b) => a[sortChannel] - b[sortChannel]);

    const mid = Math.floor(pixels.length / 2);
    return [
        { pixels: pixels.slice(0, mid) },
        { pixels: pixels.slice(mid) },
    ];
}

function averageColor(pixels: RGB[]): RGB {
    let rSum = 0, gSum = 0, bSum = 0;
    for (const [r, g, b] of pixels) {
        rSum += r;
        gSum += g;
        bSum += b;
    }
    const n = pixels.length;
    return [Math.round(rSum / n), Math.round(gSum / n), Math.round(bSum / n)];
}

function medianCut(pixels: RGB[], maxBuckets: number): RGB[] {
    let buckets: ColorBucket[] = [{ pixels: [...pixels] }];

    while (buckets.length < maxBuckets) {
        // Find the bucket with the most pixels to split
        let bestIdx = 0;
        let bestSize = 0;
        for (let i = 0; i < buckets.length; i++) {
            if (buckets[i].pixels.length > bestSize) {
                bestSize = buckets[i].pixels.length;
                bestIdx = i;
            }
        }

        // Don't split buckets with too few pixels
        if (bestSize < 2) break;

        const [a, b] = splitBucket(buckets[bestIdx]);
        buckets.splice(bestIdx, 1, a, b);
    }

    // Return average color of each bucket, sorted by bucket size (dominant first)
    return buckets
        .sort((a, b) => b.pixels.length - a.pixels.length)
        .map(bucket => averageColor(bucket.pixels));
}
