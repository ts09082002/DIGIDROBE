/**
 * Mask Refinement — Alpha Channel Edge Feathering
 *
 * Smooths the jagged alpha boundaries produced by ML Kit's
 * low-resolution segmentation mask. Works entirely on the
 * RGBA pixel buffer in JavaScript — no native modules needed.
 *
 * Algorithm:
 * 1. Identify edge pixels (where alpha transitions sharply).
 * 2. Erode the mask (shrink it by 1-2px) to remove background color bleeding.
 * 3. Apply a weighted blur to the alpha channel on those edges.
 * 4. Result: soft, anti-aliased edges that look professional.
 */

/**
 * Shrink the alpha mask by specified number of pixels.
 * Useful for removing "halo" effects where background color leaks into the edges.
 */
export function erodeAlpha(
    rgba: Uint8Array,
    w: number,
    h: number,
    pixels: number = 1,
): void {
    if (pixels <= 0) return;
    const total = w * h;
    const originalAlpha = new Uint8Array(total);
    for (let i = 0; i < total; i++) originalAlpha[i] = rgba[i * 4 + 3];

    for (let p = 0; p < pixels; p++) {
        const currentAlpha = new Uint8Array(originalAlpha);
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = y * w + x;
                if (originalAlpha[idx] === 0) continue;

                // If any neighbor is transparent, this pixel becomes transparent (or reduced)
                const top = originalAlpha[(y - 1) * w + x];
                const bot = originalAlpha[(y + 1) * w + x];
                const lft = originalAlpha[y * w + (x - 1)];
                const rgt = originalAlpha[y * w + (x + 1)];

                if (top === 0 || bot === 0 || lft === 0 || rgt === 0) {
                    currentAlpha[idx] = 0;
                }
            }
        }
        originalAlpha.set(currentAlpha);
    }

    for (let i = 0; i < total; i++) rgba[i * 4 + 3] = originalAlpha[i];
}

/**
 * Boost contrast of the alpha channel to make the edges sharper
 * before feathering.
 */
export function contrastAlpha(
    rgba: Uint8Array,
    w: number,
    h: number,
    contrast: number = 1.5,
): void {
    const total = w * h;
    for (let i = 0; i < total; i++) {
        let a = rgba[i * 4 + 3];
        if (a === 0 || a === 255) continue;
        
        // Push away from midpoint (128)
        let normalized = (a / 255 - 0.5) * contrast + 0.5;
        rgba[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(normalized * 255)));
    }
}

/**
 * Feather the alpha channel edges of an RGBA pixel buffer in-place.
 *
 * @param rgba  - Mutable RGBA pixel array (modified in place)
 * @param w     - Image width
 * @param h     - Image height
 * @param radius - Blur radius (1 = 3x3 kernel, 2 = 5x5 kernel). Default 2.
 */
export function featherEdges(
    rgba: Uint8Array,
    w: number,
    h: number,
    radius: number = 2,
): void {
    if (w < 3 || h < 3) return; // Too small to feather

    const totalPixels = w * h;

    // ── Step 1: Build edge mask ──────────────────────────────────────────
    // A pixel is an "edge pixel" if it has at least one neighbor with a
    // significantly different alpha value (threshold: 30).
    const EDGE_THRESHOLD = 30;
    const isEdge = new Uint8Array(totalPixels); // 0 or 1

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            const alpha = rgba[idx * 4 + 3];

            // Check 4 cardinal neighbors
            const top = rgba[((y - 1) * w + x) * 4 + 3];
            const bot = rgba[((y + 1) * w + x) * 4 + 3];
            const lft = rgba[(y * w + (x - 1)) * 4 + 3];
            const rgt = rgba[(y * w + (x + 1)) * 4 + 3];

            if (
                Math.abs(alpha - top) > EDGE_THRESHOLD ||
                Math.abs(alpha - bot) > EDGE_THRESHOLD ||
                Math.abs(alpha - lft) > EDGE_THRESHOLD ||
                Math.abs(alpha - rgt) > EDGE_THRESHOLD
            ) {
                // Mark this pixel and its neighborhood as edge zone
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                            isEdge[ny * w + nx] = 1;
                        }
                    }
                }
            }
        }
    }

    // ── Step 2: Multi-pass smoothing ─────────────────────────────────────
    const blurredAlpha = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) blurredAlpha[i] = rgba[i * 4 + 3];

    // Pass 1: Simple box blur
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (!isEdge[idx]) continue;

            let sum = 0, count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                        sum += rgba[(ny * w + nx) * 4 + 3];
                        count++;
                    }
                }
            }
            blurredAlpha[idx] = Math.round(sum / count);
        }
    }

    // Pass 2: Larger radius smoothing for the "outer" edge
    const finalAlpha = new Uint8Array(blurredAlpha);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (!isEdge[idx] || blurredAlpha[idx] > 200) continue; 

            let sum = 0, count = 0;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                        sum += blurredAlpha[ny * w + nx];
                        count++;
                    }
                }
            }
            finalAlpha[idx] = Math.round(sum / count);
        }
    }

    // ── Step 3: Write back ───────────────────────────────────────────────
    for (let i = 0; i < totalPixels; i++) {
        if (isEdge[i]) rgba[i * 4 + 3] = finalAlpha[i];
    }
}

/**
 * Find the tight bounding box of non-transparent pixels.
 *
 * Returns { x, y, w, h } of the content region, or null if
 * the image is fully transparent.
 *
 * @param alphaThreshold - Pixels with alpha > this are "content". Default 10.
 */
export function findContentBounds(
    rgba: Uint8Array,
    imgW: number,
    imgH: number,
    alphaThreshold: number = 10,
): { x: number; y: number; w: number; h: number } | null {
    let minX = imgW, minY = imgH, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < imgW; x++) {
            const alpha = rgba[(y * imgW + x) * 4 + 3];
            if (alpha > alphaThreshold) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }

    if (!found) return null;

    return {
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
    };
}
