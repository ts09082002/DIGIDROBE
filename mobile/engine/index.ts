import { WardrobeItem } from '../services/api';
import {
    EngineWardrobeItem,
    RecommendationContext,
    RecentUsageIndex,
    StyleOfTheDayResult,
    UserStyleProfile,
} from './types';
import { loadOrBuildUserProfile, loadUsageIndex } from './storage';
import { GenerateStyleOfDayOptions, generateStyleOfTheDay } from './styleOfDay';
import { analyzeWardrobe } from './wardrobeInsights';

function mapWardrobeItemToEngine(item: WardrobeItem): EngineWardrobeItem {
    const palette = item.colorPalette ? JSON.parse(item.colorPalette) as Array<{ hex: string; name: string }> : [];
    const primaryColor = palette[0]?.name || item.color || 'Black';
    const isNeutral = ['black', 'white', 'grey', 'gray', 'beige', 'cream', 'charcoal', 'silver'].some((n) =>
        primaryColor.toLowerCase().includes(n),
    );

    const seasonality: EngineWardrobeItem['seasonality'] = [];
    for (const s of item.season || []) {
        const lower = s.toLowerCase();
        if (lower.includes('summer')) seasonality.push('summer');
        else if (lower.includes('winter')) seasonality.push('winter');
        else if (lower.includes('spring')) seasonality.push('spring');
        else if (lower.includes('fall') || lower.includes('autumn')) seasonality.push('autumn');
    }
    if (!seasonality.length) {
        seasonality.push('spring', 'summer', 'autumn', 'winter');
    }

    let formality = 0.4;
    const lowerName = `${item.name} ${item.subCategory ?? ''}`.toLowerCase();
    if (lowerName.includes('blazer') || lowerName.includes('trouser') || lowerName.includes('shirt')) formality = 0.7;
    if (lowerName.includes('gown') || lowerName.includes('suit') || lowerName.includes('tux')) formality = 0.9;
    if (lowerName.includes('hoodie') || lowerName.includes('sneaker') || lowerName.includes('tee')) formality = 0.2;

    const thickness = item.category === 'outerwear' ? 0.8 : 0.4;
    const waterResistance =
        lowerName.includes('raincoat') || lowerName.includes('parka') || lowerName.includes('jacket') ? 0.7 : 0.2;
    const breathability =
        lowerName.includes('tee') || lowerName.includes('t-shirt') || lowerName.includes('linen') ? 0.8 : 0.5;

    const styleTags: string[] = [];
    if (item.occasion?.includes('formal')) styleTags.push('formal');
    if (item.occasion?.includes('party')) styleTags.push('party');
    if (item.occasion?.includes('casual')) styleTags.push('casual');
    if (item.occasion?.includes('athleisure')) styleTags.push('sport');

    const toEngineCategory = (): EngineWardrobeItem['category'] => {
        const c = item.category.toLowerCase();
        if (c.includes('top')) return 'topwear';
        if (c.includes('bottom')) return 'bottomwear';
        if (c.includes('outer')) return 'outerwear';
        if (c.includes('shoe') || c.includes('sneaker') || c.includes('boot') || c.includes('footwear')) return 'footwear';
        if (c.includes('bag')) return 'bags';
        if (c.includes('dress') || c.includes('gown') || c.includes('jumpsuit')) return 'dresses';
        if (c.includes('accessor')) return 'accessories';
        return 'unclassified';
    };

    return {
        id: item.id,
        category: toEngineCategory(),
        subCategory: item.subCategory,
        name: item.name,
        brand: item.brand,
        primaryColor,
        secondaryColor: palette[1]?.name,
        isNeutral,
        formality,
        seasonality,
        thickness,
        waterResistance,
        breathability,
        styleTags,
        isFavorite: item.isFavorite,
    };
}

export async function generateStyleOfDayForWardrobe(
    wardrobe: WardrobeItem[],
    context: RecommendationContext,
    todayIso: string,
    options?: GenerateStyleOfDayOptions
): Promise<StyleOfTheDayResult | null> {
    const engineItems = wardrobe.map(mapWardrobeItemToEngine);
    const profile: UserStyleProfile = await loadOrBuildUserProfile();
    const usage: RecentUsageIndex = await loadUsageIndex();
    return generateStyleOfTheDay(engineItems, context, profile, usage, todayIso, options);
}

export function getWardrobeInsightsForWardrobe(wardrobe: WardrobeItem[]) {
    const engineItems = wardrobe.map(mapWardrobeItemToEngine);
    return analyzeWardrobe(engineItems);
}
