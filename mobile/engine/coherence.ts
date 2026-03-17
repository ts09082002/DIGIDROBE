import { EngineWardrobeItem, Occasion } from './types';
import { COLOR_BUCKETS, toBucket } from './colorCompatibility';

const NEUTRAL_BUCKETS = new Set(['black', 'white', 'grey', 'beige']);

// ─── Sub-score 1: Formality Consistency (0–5) ────────────────────────────────
// Penalizes high variance in formality across items.
// Athletic top + dress pants = bad. All items within similar formality = bonus.
function formalityConsistencyScore(items: EngineWardrobeItem[]): number {
    if (items.length <= 1) return 5;

    const formalities = items.map(i => i.formality);
    const mean = formalities.reduce((s, f) => s + f, 0) / formalities.length;
    const variance = formalities.reduce((s, f) => s + (f - mean) ** 2, 0) / formalities.length;

    // variance 0 → 5pts, variance >= 0.15 → 0pts
    return Math.max(0, Math.min(5, 5 * (1 - variance / 0.15)));
}

// ─── Sub-score 2: Holistic Color Harmony (0–5) ──────────────────────────────
// Different from pairwise colorCompatibility. Evaluates the whole outfit's
// color palette: monochromatic+accent = ideal, >3 families = busy.
function colorHarmonyScore(items: EngineWardrobeItem[]): number {
    const buckets = new Set<string>();
    let neutralCount = 0;

    for (const item of items) {
        const bucket = toBucket(item.primaryColor);
        if (bucket) buckets.add(bucket);
        if (item.isNeutral || (bucket && NEUTRAL_BUCKETS.has(bucket))) {
            neutralCount++;
        }
    }

    const nonNeutralBuckets = [...buckets].filter(b => !NEUTRAL_BUCKETS.has(b));
    const colorFamilyCount = nonNeutralBuckets.length;

    // Monochromatic + accent: 1 color family + neutrals
    if (colorFamilyCount <= 1 && neutralCount >= 1) return 5;
    // 2 color families with neutrals
    if (colorFamilyCount === 2 && neutralCount >= 1) return 4;
    // 2 color families, no neutrals
    if (colorFamilyCount === 2) return 3;
    // 3 color families
    if (colorFamilyCount === 3) return 2;
    // >3 color families — too busy
    return Math.max(0, 1 - (colorFamilyCount - 3) * 0.5);
}

// ─── Sub-score 3: Style Tag Coherence (0–5) ─────────────────────────────────
// Penalizes mixing clashing style tags, bonuses for consistent styling.
const STYLE_CLASH_PAIRS: [string, string][] = [
    ['sport', 'formal'],
    ['sporty', 'formal'],
    ['casual', 'formal'],
    ['streetwear', 'classic'],
    ['athleisure', 'formal'],
    ['punk', 'preppy'],
];

function styleCoherenceScore(items: EngineWardrobeItem[]): number {
    const allTags = new Set<string>();
    for (const item of items) {
        for (const tag of item.styleTags) allTags.add(tag.toLowerCase());
    }

    let clashCount = 0;
    for (const [a, b] of STYLE_CLASH_PAIRS) {
        if (allTags.has(a) && allTags.has(b)) clashCount++;
    }

    // Bonus if all items share at least one common tag
    let consistencyBonus = 0;
    if (items.length >= 2) {
        const tagSets = items.map(i => new Set(i.styleTags.map(t => t.toLowerCase())));
        const shared = tagSets.reduce((acc, tags) => {
            return new Set([...acc].filter(t => tags.has(t)));
        });
        if (shared.size > 0) consistencyBonus = 1;
    }

    return Math.max(0, Math.min(5, 5 - clashCount * 2 + consistencyBonus));
}

// ─── Sub-score 4: Completeness (0–5) ────────────────────────────────────────
// Bonus for expected category coverage per occasion.
function completenessScore(items: EngineWardrobeItem[], occasion?: string): number {
    const categories = new Set(items.map(i => i.category));
    const hasTop = categories.has('topwear');
    const hasBottom = categories.has('bottomwear');
    const hasShoes = categories.has('footwear');
    const hasDress = categories.has('dresses');
    const hasOuterwear = categories.has('outerwear');

    let score = 0;

    // Basic completeness: top+bottom or dress
    if ((hasTop && hasBottom) || hasDress) score += 3;
    else if (hasTop || hasBottom) score += 1;

    // Shoes bonus
    if (hasShoes) score += 1;

    // Outerwear bonus for formal/work/cold-weather occasions
    if (hasOuterwear && (occasion === 'formal' || occasion === 'work' || occasion === 'wedding')) {
        score += 1;
    }

    return Math.min(5, score);
}

// ─── Combined Coherence Score (0–20) ─────────────────────────────────────────
export function computeCoherenceScore(
    items: EngineWardrobeItem[],
    occasion?: Occasion,
): number {
    if (items.length <= 1) return 10; // neutral baseline for single items

    return (
        formalityConsistencyScore(items) +
        colorHarmonyScore(items) +
        styleCoherenceScore(items) +
        completenessScore(items, occasion)
    );
}
