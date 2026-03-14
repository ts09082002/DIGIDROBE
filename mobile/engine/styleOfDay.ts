import {
    EngineWardrobeItem,
    RecommendationContext,
    StyleOfTheDayResult,
    UserStyleProfile,
    RecentUsageIndex,
} from './types';
import { scoreOutfit } from './scoring';

export interface OutfitTemplate {
    id: string;
    requiredCategories: Array<EngineWardrobeItem['category']>;
}

const DEFAULT_TEMPLATES: OutfitTemplate[] = [
    { id: 'top_bottom_shoes', requiredCategories: ['topwear', 'bottomwear', 'footwear'] },
    { id: 'top_bottom_shoes_outerwear', requiredCategories: ['topwear', 'bottomwear', 'footwear', 'outerwear'] },
    { id: 'dress_shoes', requiredCategories: ['dresses', 'footwear'] },
    // Fallback templates for smaller wardrobes
    { id: 'top_bottom', requiredCategories: ['topwear', 'bottomwear'] },
    { id: 'dress_only', requiredCategories: ['dresses'] },
];

function buildCategoryIndex(items: EngineWardrobeItem[]): Record<string, EngineWardrobeItem[]> {
    const index: Record<string, EngineWardrobeItem[]> = {};
    for (const item of items) {
        if (!index[item.category]) index[item.category] = [];
        index[item.category].push(item);
    }
    return index;
}

function sample<T>(arr: T[], max: number): T[] {
    if (arr.length <= max) return arr.slice();
    const result: T[] = [];
    const used = new Set<number>();
    const limit = Math.min(max, arr.length);
    while (result.length < limit) {
        const idx = Math.floor(Math.random() * arr.length);
        if (used.has(idx)) continue;
        used.add(idx);
        result.push(arr[idx]);
    }
    return result;
}

export interface GenerateStyleOfDayOptions {
    maxCandidates?: number;
    templates?: OutfitTemplate[];
    lockedItemIds?: string[];
}

export function generateStyleOfTheDay(
    wardrobeItems: EngineWardrobeItem[],
    context: RecommendationContext,
    profile: UserStyleProfile,
    usage: RecentUsageIndex,
    todayIso: string,
    options: GenerateStyleOfDayOptions = {},
): StyleOfTheDayResult | null {
    if (!wardrobeItems.length) return null;

    const maxCandidates = options.maxCandidates ?? 120;
    const templates = options.templates ?? DEFAULT_TEMPLATES;
    const lockedItems = new Set(options.lockedItemIds ?? []);

    // Quick map by ID for fast building of locked pools
    const itemMap = new Map(wardrobeItems.map(item => [item.id, item]));

    const byCategory = buildCategoryIndex(wardrobeItems);

    const candidates: { id: string; items: EngineWardrobeItem[] }[] = [];
    let candidateCounter = 0;

    for (const template of templates) {
        const pools: EngineWardrobeItem[][] = [];
        let validTemplate = true;

        for (const cat of template.requiredCategories) {
            let pool = byCategory[cat];

            // Check if there's any locked item in this category
            if (pool) {
                const lockedInCat = pool.filter(item => lockedItems.has(item.id));
                if (lockedInCat.length > 0) {
                    // Force the pool to solely be the locked item(s) for this category
                    pool = lockedInCat;
                }
            }

            if (!pool || pool.length === 0) {
                validTemplate = false;
                break;
            }
            pools.push(pool);
        }

        if (!validTemplate) continue;

        const perTemplateLimit = Math.max(1, Math.floor(maxCandidates / templates.length));

        const [poolA, poolB, ...rest] = pools;
        const basePairs: Array<[EngineWardrobeItem, EngineWardrobeItem]> = [];
        for (const a of sample(poolA, perTemplateLimit)) {
            for (const b of sample(poolB, perTemplateLimit)) {
                basePairs.push([a, b]);
                if (basePairs.length >= perTemplateLimit) break;
            }
            if (basePairs.length >= perTemplateLimit) break;
        }

        for (const pair of basePairs) {
            let outfitsForPair: EngineWardrobeItem[][] = [[...pair]];
            for (const pool of rest) {
                const nextOutfits: EngineWardrobeItem[][] = [];
                const sampledPool = sample(pool, 4);
                for (const outfit of outfitsForPair) {
                    for (const item of sampledPool) {
                        nextOutfits.push([...outfit, item]);
                    }
                }
                outfitsForPair = nextOutfits;
            }

            for (const items of outfitsForPair) {
                if (candidateCounter >= maxCandidates) break;
                const id = items.map((i) => i.id).sort().join('|');
                candidates.push({ id, items });
                candidateCounter += 1;
            }
            if (candidateCounter >= maxCandidates) break;
        }
        if (candidateCounter >= maxCandidates) break;
    }

    if (!candidates.length) return null;

    const scored = candidates.map((c) =>
        scoreOutfit(c.id, c.items, context, profile, usage, todayIso),
    );

    let finiteScored = scored.filter((s) => Number.isFinite(s.totalScore));

    // Fallback: If all outfits are blocked by novelty (-Infinity), use them rather than returning nothing
    if (!finiteScored.length) {
        finiteScored = scored;
    }

    if (!finiteScored.length) return null;

    finiteScored.sort((a, b) => b.totalScore - a.totalScore);
    const top5 = finiteScored.slice(0, 5);

    const randomIndex = Math.floor(Math.random() * top5.length);
    const chosen = top5[randomIndex];
    const chosenItems = wardrobeItems.filter((i) => chosen.itemIds.includes(i.id));

    return {
        outfit: {
            id: chosen.outfitId,
            items: chosenItems,
        },
        scores: chosen,
    };
}

