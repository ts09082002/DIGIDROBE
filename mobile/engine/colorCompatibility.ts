import { EngineWardrobeItem } from './types';

const NEUTRAL_COLORS = new Set([
    'Black',
    'White',
    'Grey',
    'Beige',
    'Cream',
    'Silver',
    'Charcoal',
]);

const COLOR_BUCKETS: Record<string, string> = {
    Black: 'black',
    White: 'white',
    Grey: 'grey',
    Charcoal: 'grey',
    Silver: 'grey',
    Beige: 'beige',
    Cream: 'beige',
    Brown: 'brown',
    Gold: 'yellow',
    Mustard: 'yellow',
    Yellow: 'yellow',
    Orange: 'orange',
    Coral: 'orange',
    Red: 'red',
    Maroon: 'red',
    Burgundy: 'red',
    Pink: 'pink',
    Purple: 'purple',
    Lavender: 'purple',
    Blue: 'blue',
    'Navy Blue': 'blue',
    'Denim Blue': 'blue',
    'Light Blue': 'blue',
    Cyan: 'blue',
    Teal: 'green',
    Green: 'green',
    'Forest Green': 'green',
    Mint: 'green',
    Olive: 'green',
    Khaki: 'green',
};

const BUCKETS = [
    'black',
    'white',
    'grey',
    'beige',
    'brown',
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'pink',
] as const;

type Bucket = (typeof BUCKETS)[number];

const COMPATIBILITY_MATRIX: Record<Bucket, Partial<Record<Bucket, number>>> = {
    black: { black: 0.6, white: 0.9, grey: 0.8, beige: 0.8, red: 0.7, blue: 0.7, green: 0.7 },
    white: { white: 0.6, black: 0.9, grey: 0.8, beige: 0.8, red: 0.7, blue: 0.7, green: 0.7 },
    grey: { grey: 0.6, black: 0.8, white: 0.8, beige: 0.7, red: 0.6, blue: 0.6, green: 0.6 },
    beige: { beige: 0.6, white: 0.8, brown: 0.7, blue: 0.7, green: 0.7, red: 0.6 },
    brown: { brown: 0.5, beige: 0.7, green: 0.6, yellow: 0.5, orange: 0.5 },
    red: { red: 0.4, black: 0.7, white: 0.7, grey: 0.6, blue: 0.5, green: -0.2 },
    orange: { orange: 0.4, blue: 0.4, green: 0.3, purple: -0.2 },
    yellow: { yellow: 0.4, blue: 0.6, purple: 0.4, green: 0.3 },
    green: { green: 0.5, brown: 0.6, beige: 0.7, blue: 0.4, red: -0.2 },
    blue: { blue: 0.5, white: 0.7, black: 0.7, beige: 0.7, yellow: 0.6, orange: 0.4 },
    purple: { purple: 0.4, yellow: 0.4, pink: 0.5, blue: 0.5 },
    pink: { pink: 0.5, white: 0.7, beige: 0.7, blue: 0.5, red: 0.4 },
};

function toBucket(colorName: string | undefined): Bucket | null {
    if (!colorName) return null;
    const mapped = COLOR_BUCKETS[colorName] ?? COLOR_BUCKETS[colorName.trim()];
    if (mapped && (BUCKETS as readonly string[]).includes(mapped)) {
        return mapped as Bucket;
    }
    const lower = colorName.toLowerCase();
    for (const [name, bucket] of Object.entries(COLOR_BUCKETS)) {
        if (lower.includes(name.toLowerCase())) {
            return bucket as Bucket;
        }
    }
    return null;
}

export function getColorCompatibilityScore(items: EngineWardrobeItem[]): number {
    if (items.length <= 1) return 0.5;

    const buckets: Bucket[] = [];
    let neutralCount = 0;

    for (const item of items) {
        const bucket = toBucket(item.primaryColor);
        if (bucket) {
            buckets.push(bucket);
        }
        const isNeutral =
            item.isNeutral ||
            (item.primaryColor && NEUTRAL_COLORS.has(item.primaryColor)) ||
            (item.secondaryColor && NEUTRAL_COLORS.has(item.secondaryColor));
        if (isNeutral) neutralCount += 1;
    }

    if (buckets.length <= 1) {
        return 0.6 + Math.min(neutralCount, 2) * 0.1;
    }

    let sum = 0;
    let count = 0;
    for (let i = 0; i < buckets.length; i++) {
        for (let j = i + 1; j < buckets.length; j++) {
            const a = buckets[i];
            const b = buckets[j];
            const direct = COMPATIBILITY_MATRIX[a]?.[b];
            const reverse = COMPATIBILITY_MATRIX[b]?.[a];
            const score = direct ?? reverse ?? 0.3;
            sum += score;
            count += 1;
        }
    }

    const baseAverage = sum / count;
    const neutralBoost = Math.min(neutralCount, 3) * 0.07;
    const result = baseAverage + neutralBoost;
    return Math.max(0, Math.min(1, result));
}

