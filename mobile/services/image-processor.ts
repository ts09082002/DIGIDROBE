/**
 * Unified on-device image processing pipeline.
 * Orchestrates: ML Kit classification → TFLite background removal → JS color extraction.
 * Falls back to shape-based heuristic classification when ML Kit is unavailable.
 */

import { classifyClothing, ClothingClassification } from './ml-classifier';
import { removeBackgroundOnDevice } from './background-removal';
import { extractColorsFromPixels, ColorExtractionResult } from './color-extraction';

export interface OnDeviceProcessingResult {
    classification: ClothingClassification;
    processedImageUri: string;
    colors: ColorExtractionResult;
}

/**
 * Guess clothing category from the shape of the foreground region.
 * Analyzes bounding box aspect ratio and vertical center of mass.
 */
function classifyByShape(
    rgbaPixels: Uint8Array,
    width: number,
    height: number,
): ClothingClassification {
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let fgCount = 0;
    let yCenterSum = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = rgbaPixels[(y * width + x) * 4 + 3];
            if (alpha > 20) {
                fgCount++;
                yCenterSum += y;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (fgCount < 100) {
        return { category: 'unclassified', subCategory: 'other', confidence: 0, mlLabels: [], isLowConfidence: true };
    }

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    const aspectRatio = bboxW / bboxH;
    const yCenter = yCenterSum / fgCount / height; // 0 = top, 1 = bottom
    const fillRatio = fgCount / (bboxW * bboxH);

    let category = 'topwear';
    let subCategory = 't_shirt';

    if (aspectRatio > 1.8 && yCenter > 0.6) {
        // Wide and low → footwear
        category = 'footwear';
        subCategory = 'shoes';
    } else if (aspectRatio < 0.55 && bboxH / height > 0.7) {
        // Very tall and narrow → bottomwear (pants/trousers)
        category = 'bottomwear';
        subCategory = 'trousers';
    } else if (aspectRatio < 0.7 && yCenter < 0.45) {
        // Tall-ish, upper region → dress or long top
        category = 'dresses';
        subCategory = 'dress';
    } else if (aspectRatio > 1.2 && yCenter < 0.4) {
        // Wide and high → could be a scarf, belt, accessory
        category = 'accessories';
        subCategory = 'accessory';
    } else if (aspectRatio >= 0.7 && aspectRatio <= 1.5) {
        if (yCenter < 0.45) {
            category = 'topwear';
            subCategory = 't_shirt';
        } else if (yCenter > 0.55) {
            category = 'bottomwear';
            subCategory = 'shorts';
        } else {
            category = 'topwear';
            subCategory = 'top';
        }
    }

    console.log(`[ShapeClassifier] aspect=${aspectRatio.toFixed(2)}, yCenter=${yCenter.toFixed(2)}, fill=${fillRatio.toFixed(2)} → ${category}/${subCategory}`);

    return {
        category,
        subCategory,
        confidence: 0.4,
        mlLabels: [`shape:${category}`],
        isLowConfidence: true,
    };
}

/**
 * Process a clothing image entirely on-device:
 * 1. Classify via ML Kit (falls back to shape-based heuristic)
 * 2. Remove background via MediaPipe Selfie Segmentation
 * 3. Extract color palette via JS Median Cut algorithm
 */
export async function processClothingImageOnDevice(
    imageUri: string,
    lowMemoryMode: boolean = false,
): Promise<OnDeviceProcessingResult> {
    // Run classification and background removal in parallel
    const [classification, bgResult] = await Promise.all([
        classifyClothing(imageUri),
        removeBackgroundOnDevice(imageUri, lowMemoryMode),
    ]);

    // Extract colors from the background-removed image
    const colors = extractColorsFromPixels(
        bgResult.rgbaPixels,
        bgResult.width,
        bgResult.height,
    );

    // If ML Kit returned unclassified and we have good bg-removal pixels,
    // fall back to shape-based classification (must happen BEFORE we null pixels)
    let finalClassification = classification;
    const hasBgRemoval = bgResult.width > 1 && bgResult.height > 1;
    if (classification.category === 'unclassified' && hasBgRemoval) {
        finalClassification = classifyByShape(bgResult.rgbaPixels, bgResult.width, bgResult.height);
        console.log(`[ImageProcessor] ML Kit unavailable, shape-based fallback: ${finalClassification.category}/${finalClassification.subCategory}`);
    }

    // Release the large pixel buffer so GC can reclaim memory before the next job
    (bgResult as any).rgbaPixels = null;

    const isFallback = !hasBgRemoval;
    if (isFallback) {
        console.log(`[ImageProcessor] Done (fallback mode): category=${finalClassification.category}, color=${colors.dominantName}`);
    } else {
        console.log(`[ImageProcessor] Done: category=${finalClassification.category}, color=${colors.dominantName}, palette=${colors.palette.length} colors`);
    }

    return {
        classification: finalClassification,
        processedImageUri: bgResult.processedUri,
        colors,
    };
}
