/**
 * On-device clothing classifier using react-native-fast-tflite.
 * Runs 100% on-device using custom trained TFLite models.
 */

import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import { Buffer } from 'buffer';

// ─── TFLite Configuration ──────────────────────────────────────────────────
const LABELS = ['topwear', 'bottomwear', 'footwear', 'dresses', 'accessories', 'bags', 'unclassified'];
const CONFIDENCE_THRESHOLD = 0.60;

let tfliteModel: TensorflowModel | null = null;

async function getOrLoadModel() {
    if (!tfliteModel) {
        let lastErr: any = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                tfliteModel = await loadTensorflowModel(require('../assets/model.tflite'), []);
                if (tfliteModel) {
                    console.log('[MLClassifier] Successfully loaded TFLite model on attempt', attempt);
                    break;
                }
            } catch (err) {
                lastErr = err;
                console.warn(`[MLClassifier] Failed to load custom TFLite model (attempt ${attempt}/3):`, err);
                if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        if (!tfliteModel && lastErr) {
            console.error('[MLClassifier] Critical: TFLite model failed to load after 3 attempts:', lastErr);
        }
    }
    return tfliteModel;
}

// ─── Color Palette Extraction Utilities ─────────────────────────────────────
const NAMED_COLORS: { name: string; r: number; g: number; b: number }[] = [
    { name: 'Black', r: 0, g: 0, b: 0 },
    { name: 'White', r: 255, g: 255, b: 255 },
    { name: 'Red', r: 220, g: 50, b: 50 },
    { name: 'Blue', r: 50, g: 100, b: 200 },
    { name: 'Navy Blue', r: 20, g: 40, b: 100 },
    { name: 'Green', r: 50, g: 160, b: 80 },
    { name: 'Yellow', r: 240, g: 210, b: 50 },
    { name: 'Orange', r: 230, g: 120, b: 40 },
    { name: 'Purple', r: 130, g: 60, b: 160 },
    { name: 'Pink', r: 230, g: 120, b: 160 },
    { name: 'Brown', r: 130, g: 80, b: 50 },
    { name: 'Grey', r: 150, g: 150, b: 150 },
    { name: 'Beige', r: 220, g: 200, b: 165 },
    { name: 'Cream', r: 240, g: 235, b: 210 },
    { name: 'Maroon', r: 120, g: 30, b: 40 },
    { name: 'Olive', r: 110, g: 120, b: 60 },
    { name: 'Khaki', r: 190, g: 175, b: 120 },
    { name: 'Mint', r: 150, g: 220, b: 190 },
    { name: 'Lavender', r: 200, g: 175, b: 230 },
    { name: 'Teal', r: 50, g: 160, b: 160 },
    { name: 'Coral', r: 240, g: 120, b: 110 },
    { name: 'Cyan', r: 100, g: 210, b: 230 },
    { name: 'Gold', r: 210, g: 175, b: 50 },
    { name: 'Silver', r: 190, g: 190, b: 200 },
    { name: 'Mustard', r: 200, g: 160, b: 40 },
    { name: 'Burgundy', r: 130, g: 30, b: 60 },
    { name: 'Charcoal', r: 55, g: 55, b: 65 },
    { name: 'Denim Blue', r: 80, g: 110, b: 160 },
    { name: 'Forest Green', r: 40, g: 100, b: 60 },
    { name: 'Light Blue', r: 140, g: 185, b: 225 },
];

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export function hexToName(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    let bestMatch = NAMED_COLORS[0];
    let bestDist = Infinity;
    for (const color of NAMED_COLORS) {
        const dist = colorDistance(r, g, b, color.r, color.g, color.b);
        if (dist < bestDist) {
            bestDist = dist;
            bestMatch = color;
        }
    }
    return bestMatch.name;
}

export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ─── Classification Interface & Inference logic ──────────────────────────────
export interface ClothingClassification {
    category: string;       // 'topwear' | 'bottomwear' | 'outerwear' | 'footwear' | 'accessories' | 'dresses' | 'unclassified'
    subCategory: string;    // specific item type e.g. 'jeans', 't_shirt'
    confidence: number;     // 0–1
    mlLabels: string[];     // raw labels (for debugging)
    isLowConfidence: boolean;
}

function labelToSubCategory(category: string): string {
    const defaults: Record<string, string> = {
        topwear: 't_shirt',
        bottomwear: 'trousers',
        outerwear: 'jacket',
        footwear: 'shoes',
        accessories: 'accessory',
        bags: 'bag',
        dresses: 'dress',
    };
    return defaults[category] ?? 'other';
}

/**
 * High-performance on-device TFLite classification implementation.
 */
export async function classifyClothingImageOnDevice(imageUri: string): Promise<ClothingClassification> {
    let manipResult: any = null;
    let imgBuffer: any = null;
    let decoded: any = null;
    let tensorArray: any = null;
    let result: any = null;

    try {
        const model = await getOrLoadModel();
        
        let probabilities = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0]; // Default fallback to unclassified
        
        if (model) {
            // 1. Resize and convert to base64
            manipResult = await manipulateAsync(
                imageUri,
                [{ resize: { width: 224, height: 224 } }],
                { format: SaveFormat.JPEG, base64: true }
            );

            if (manipResult.base64) {
                // 2. Decode Base64 to Buffer
                imgBuffer = Buffer.from(manipResult.base64, 'base64');

                // 3. Decode JPEG to raw RGBA pixels
                decoded = jpeg.decode(imgBuffer, { useTArray: true });
                
                // 4. Create Float32Array (224x224x3)
                tensorArray = new Float32Array(224 * 224 * 3);
                
                // 5. Normalize RGB values
                let tensorIndex = 0;
                for (let i = 0; i < decoded.data.length; i += 4) {
                    // decoded.data is RGBA
                    tensorArray[tensorIndex++] = (decoded.data[i] / 127.5) - 1.0;     // R
                    tensorArray[tensorIndex++] = (decoded.data[i + 1] / 127.5) - 1.0; // G
                    tensorArray[tensorIndex++] = (decoded.data[i + 2] / 127.5) - 1.0; // B
                    // Ignore alpha channel (i + 3)
                }

                // 6. Run Model
                result = await model.run([tensorArray.buffer]);
                if (result && result.length > 0) {
                    // Parse outputs
                    const floatArray = new Float32Array(result[0]);
                    probabilities = Array.from(floatArray);
                }
            }
        }

        // Find label with highest confidence
        let maxIndex = 6; // Default to unclassified index
        let maxConfidence = 0.0;

        for (let i = 0; i < probabilities.length; i++) {
            const conf = probabilities[i] || 0.0;
            if (conf > maxConfidence) {
                maxConfidence = conf;
                maxIndex = i;
            }
        }

        const predictedLabel = LABELS[maxIndex] || 'unclassified';

        if (maxConfidence < CONFIDENCE_THRESHOLD || predictedLabel === 'unclassified') {
            return {
                category: 'unclassified',
                subCategory: 'other',
                confidence: maxConfidence,
                mlLabels: [predictedLabel],
                isLowConfidence: true,
            };
        }

        return {
            category: predictedLabel,
            subCategory: labelToSubCategory(predictedLabel),
            confidence: Math.round(maxConfidence * 1000) / 1000,
            mlLabels: [predictedLabel],
            isLowConfidence: maxConfidence < 0.75,
        };
    } catch (err) {
        console.warn('[MLClassifier] TFLite inference execution failed:', err);
        return {
            category: 'unclassified',
            subCategory: 'other',
            confidence: 0,
            mlLabels: [],
            isLowConfidence: true,
        };
    } finally {
        // Nullify all large intermediate buffers to assist garbage collection
        imgBuffer = null;
        decoded = null;
        tensorArray = null;
        result = null;

        if (manipResult && manipResult.uri) {
            try {
                const FileSystem = require('expo-file-system/legacy');
                await FileSystem.deleteAsync(manipResult.uri, { idempotent: true });
            } catch (e) {
                // ignore
            }
        }
        manipResult = null;
    }
}

// Alias for upload.tsx / image-processor.ts backward compatibility
export async function classifyClothing(imageUri: string): Promise<ClothingClassification> {
    return classifyClothingImageOnDevice(imageUri);
}

// Canonical → backend category name
const CATEGORY_TO_BACKEND: Record<string, string> = {
    topwear: 'tops',
    bottomwear: 'bottoms',
    outerwear: 'outerwear',
    footwear: 'footwear',
    accessories: 'accessories',
    bags: 'bags',
    dresses: 'dresses',
    unclassified: '',
};

export function canonicalToBackend(category: string): string | undefined {
    const b = CATEGORY_TO_BACKEND[category];
    return b || undefined;
}

/**
 * Explicitly release model resources and free up GPU/CPU memory.
 */
export async function releaseModel(): Promise<void> {
    if (tfliteModel) {
        try {
            if (typeof (tfliteModel as any).close === 'function') {
                await (tfliteModel as any).close();
            }
            tfliteModel = null;
            console.log('[MLClassifier] TFLite model closed and memory released');
        } catch (err) {
            console.warn('[MLClassifier] Failed to release TFLite model:', err);
        }
    }
}
