/**
 * On-device clothing classifier using ML Kit Image Labeling.
 * No API key or internet connection required – runs 100% on-device.
 */

import ImageLabeling from '@react-native-ml-kit/image-labeling';

// ─── Category Mapping ───────────────────────────────────────────────────────
// Maps ML Kit labels → our internal category taxonomy
const CATEGORY_LABEL_MAP: Record<string, string[]> = {
    topwear: [
        'T-shirt', 'Tshirt', 'T shirt', 'Shirt', 'Blouse', 'Top', 'Polo',
        'Tank top', 'Vest', 'Jerseys', 'Jersey', 'Sweater', 'Sweatshirt',
        'Hoodie', 'Pullover', 'Knitwear', 'Cardigan', 'Turtleneck', 'Dress shirt',
        'Formal shirt', 'Tube top', 'Crop top', 'Halter', 'Long sleeve',
    ],
    bottomwear: [
        'Jeans', 'Denim', 'Trousers', 'Pants', 'Chinos', 'Shorts',
        'Skirt', 'Leggings', 'Joggers', 'Sweatpants', 'Cargo pants',
        'Track pants', 'Culottes', 'Palazzo', 'Mini skirt', 'Midi skirt',
        'Maxi skirt', 'Capri', 'Khakis', 'Lower', 'Lowers',
    ],
    outerwear: [
        'Jacket', 'Coat', 'Blazer', 'Outerwear', 'Overcoat', 'Parka',
        'Windbreaker', 'Trench coat', 'Leather jacket', 'Denim jacket',
        'Bomber jacket', 'Raincoat', 'Down jacket', 'Puffer jacket',
        'Anorak', 'Fleece', 'Vest jacket',
    ],
    footwear: [
        'Shoe', 'Shoes', 'Sneakers', 'Sneaker', 'Boot', 'Boots',
        'Sandal', 'Sandals', 'Footwear', 'Heels', 'Loafer', 'Loafers',
        'Flip-flops', 'Slipper', 'Slippers', 'Trainers', 'Running shoe',
        'Athletic shoe', 'Formal shoes', 'Oxford', 'Mule', 'Wedge', 'Stiletto',
        'Ankle boot', 'Knee-high boot', 'Flat shoes',
    ],
    accessories: [
        'Belt', 'Hat', 'Cap', 'Beanie', 'Baseball cap', 'Scarf', 'Bag',
        'Sunglasses', 'Glasses', 'Necklace', 'Bracelet', 'Earring',
        'Ring', 'Tie', 'Bow tie', 'Gloves', 'Umbrella',
    ],
    bags: [
        'Bag', 'Handbag', 'Backpack', 'Purse', 'Tote', 'Wallet', 'Clutch', 'Sling bag',
    ],
    dresses: [
        'Dress', 'Gown', 'Frock', 'Jumpsuit', 'Romper', 'Playsuit',
        'Maxi dress', 'Mini dress', 'Midi dress', 'Evening gown',
    ],
};

// Build a reverse lookup: lowercase label → category
const LABEL_TO_CATEGORY: Record<string, string> = {};
for (const [category, labels] of Object.entries(CATEGORY_LABEL_MAP)) {
    for (const label of labels) {
        LABEL_TO_CATEGORY[label.toLowerCase()] = category;
    }
}

// ─── Color Palette Extraction ────────────────────────────────────────────────
// Named color dictionary for closest-match naming
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
    return Math.sqrt(
        (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
    );
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

// ─── ML Kit Classification ───────────────────────────────────────────────────
export interface ClothingClassification {
    category: string;       // 'topwear' | 'bottomwear' | 'outerwear' | 'footwear' | 'accessories' | 'dresses' | 'unclassified'
    subCategory: string;    // specific item type e.g. 'jeans', 't_shirt'
    confidence: number;     // 0–1
    mlLabels: string[];     // raw ML Kit labels (for debugging / recommendation engine)
    isLowConfidence: boolean;
}

function mapLabelToCategory(label: string): string | null {
    const lower = label.toLowerCase();
    // Exact match
    if (LABEL_TO_CATEGORY[lower]) return LABEL_TO_CATEGORY[lower];
    // Partial match (e.g., "Blue Jeans" → "jeans")
    for (const [key, cat] of Object.entries(LABEL_TO_CATEGORY)) {
        if (lower.includes(key) || key.includes(lower)) return cat;
    }
    return null;
}

function labelToSubCategory(label: string, category: string): string {
    const lower = label.toLowerCase();
    const SUB_MAP: Record<string, string> = {
        'jeans': 'jeans', 'denim': 'jeans', 'trousers': 'trousers', 'pants': 'trousers',
        'chinos': 'trousers', 'shorts': 'shorts', 'skirt': 'skirt', 'leggings': 'leggings',
        't-shirt': 't_shirt', 'tshirt': 't_shirt', 't shirt': 't_shirt',
        'shirt': 'shirt', 'polo': 'polo', 'hoodie': 'hoodie', 'sweater': 'sweater',
        'sweatshirt': 'sweatshirt', 'blouse': 'blouse', 'top': 'top',
        'tank top': 'tank_top', 'vest': 'vest', 'cardigan': 'cardigan',
        'jacket': 'jacket', 'coat': 'coat', 'blazer': 'blazer',
        'raincoat': 'coat', 'parka': 'coat', 'bomber': 'jacket',
        'sneakers': 'sneakers', 'sneaker': 'sneakers', 'boot': 'boots', 'boots': 'boots',
        'sandal': 'sandals', 'sandals': 'sandals', 'loafer': 'formal_shoes', 'heels': 'heels',
        'dress': 'dress', 'gown': 'gown', 'jumpsuit': 'jumpsuit',
        'bag': 'bag', 'handbag': 'bag', 'backpack': 'backpack', 'belt': 'belt',
        'hat': 'hat', 'cap': 'hat', 'watch': 'watch', 'sunglasses': 'sunglasses',
    };
    for (const [key, sub] of Object.entries(SUB_MAP)) {
        if (lower.includes(key)) return sub;
    }
    // Default sub by main category
    const defaults: Record<string, string> = {
        topwear: 't_shirt', bottomwear: 'trousers', outerwear: 'jacket',
        footwear: 'shoes', accessories: 'accessory', bags: 'bag', dresses: 'dress',
    };
    return defaults[category] ?? 'other';
}

/**
 * Classify a clothing image using on-device ML Kit.
 * Accepts a local URI (file:// or content://).
 */
export async function classifyClothing(imageUri: string): Promise<ClothingClassification> {
    try {
        const labels = await ImageLabeling.label(imageUri);
        const mlLabels = labels.map((l: any) => l.text);

        if (labels.length === 0) {
            console.log('[ML Kit] No labels returned (native module may need EAS build). Using manual category.');
        } else {
            console.log(`[ML Kit] Classified: ${labels.length} labels, top: ${labels[0]?.text} (${(labels[0]?.confidence * 100).toFixed(0)}%)`);
        }

        let bestCategory: string | null = null;
        let bestLabel = '';
        let bestScore = 0;

        for (const label of labels) {
            if (label.confidence < 0.3) continue; // skip low-confidence labels
            const category = mapLabelToCategory(label.text);
            if (category && label.confidence > bestScore) {
                bestScore = label.confidence;
                bestCategory = category;
                bestLabel = label.text;
            }
        }

        if (!bestCategory) {
            return {
                category: 'unclassified',
                subCategory: 'other',
                confidence: 0,
                mlLabels,
                isLowConfidence: true,
            };
        }

        const subCategory = labelToSubCategory(bestLabel, bestCategory);

        return {
            category: bestCategory,
            subCategory,
            confidence: Math.round(bestScore * 1000) / 1000,
            mlLabels,
            isLowConfidence: bestScore < 0.5,
        };
    } catch (err) {
        console.warn('[MLClassifier] Failed to classify image:', err);
        return {
            category: 'unclassified',
            subCategory: 'other',
            confidence: 0,
            mlLabels: [],
            isLowConfidence: true,
        };
    }
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
