import { EngineWardrobeItem } from './types';

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface WardrobeInsight {
    id: string;
    type: string;
    message: string;
    severity: InsightSeverity;
    suggestedAction?: string;
}

export interface WardrobeInsightsResult {
    insights: WardrobeInsight[];
}

export function analyzeWardrobe(items: EngineWardrobeItem[]): WardrobeInsightsResult {
    const insights: WardrobeInsight[] = [];
    if (!items.length) {
        return {
            insights: [
                {
                    id: 'empty_wardrobe',
                    type: 'composition',
                    message: 'Your wardrobe is empty. Start by adding a few everyday basics.',
                    severity: 'info',
                },
            ],
        };
    }

    const shirts = items.filter(
        (i) =>
            i.category === 'topwear' &&
            (i.subCategory === 'shirt' || i.subCategory === 't_shirt' || i.name.toLowerCase().includes('shirt')),
    );
    const blackShirts = shirts.filter((i) => i.primaryColor === 'Black' || i.primaryColor.toLowerCase().includes('black'));
    const whiteShirts = shirts.filter((i) => i.primaryColor === 'White' || i.primaryColor.toLowerCase().includes('white'));

    if (blackShirts.length >= 5 && whiteShirts.length <= 1) {
        insights.push({
            id: 'too_many_black_shirts',
            type: 'color_balance',
            message: `You have ${blackShirts.length} black shirts but only ${whiteShirts.length} white shirt(s).`,
            severity: 'info',
            suggestedAction: 'Consider adding a white shirt for more versatile outfits.',
        });
    }

    if (whiteShirts.length === 0) {
        insights.push({
            id: 'missing_white_shirt',
            type: 'missing_basic',
            message: 'You do not have a classic white shirt in your wardrobe.',
            severity: 'warning',
            suggestedAction: 'Add at least one well-fitting white shirt for maximum versatility.',
        });
    }

    let summerCount = 0;
    let winterCount = 0;
    for (const item of items) {
        if (item.seasonality.includes('summer')) summerCount += 1;
        if (item.seasonality.includes('winter')) winterCount += 1;
    }
    const total = items.length;
    if (summerCount / total < 0.2) {
        insights.push({
            id: 'low_summer_clothing',
            type: 'seasonality',
            message: 'You have relatively few summer-appropriate items.',
            severity: 'info',
            suggestedAction: 'Add more lightweight, breathable pieces for hot days.',
        });
    }

    const usageCount: Record<string, number> = {};
    for (const item of items) {
        const count = (item as any).wearCount as number | undefined;
        if (typeof count === 'number') {
            usageCount[item.id] = count;
        }
    }
    const rarelyWornIds = Object.entries(usageCount)
        .filter(([, count]) => count <= 1)
        .map(([id]) => id);
    if (rarelyWornIds.length >= 3) {
        insights.push({
            id: 'rarely_worn_items',
            type: 'usage',
            message: 'Several items have been worn once or not at all recently.',
            severity: 'info',
            suggestedAction: 'Try building outfits around these pieces or consider decluttering them.',
        });
    }

    return { insights };
}

