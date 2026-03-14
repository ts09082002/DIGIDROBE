import { EngineWardrobeItem, RecommendationContext } from './types';

function clamp01(x: number): number {
    return Math.max(0, Math.min(1, x));
}

function temperatureSuitability(item: EngineWardrobeItem, temperatureC: number): number {
    const isSummer = item.seasonality.includes('summer');
    const isWinter = item.seasonality.includes('winter');

    if (temperatureC >= 28) {
        const hotScore =
            0.6 * (1 - item.thickness) +
            0.4 * item.breathability +
            (isSummer ? 0.1 : 0);
        return clamp01(hotScore);
    }

    if (temperatureC <= 10) {
        const coldScore =
            0.6 * item.thickness +
            0.3 * (isWinter ? 1 : 0) +
            0.1 * (item.category === 'outerwear' ? 1 : 0);
        return clamp01(coldScore);
    }

    const mildScore =
        0.4 * (1 - Math.abs(item.thickness - 0.5) * 2) +
        0.3 * (isSummer || isWinter ? 0.5 : 0.7) +
        0.3;
    return clamp01(mildScore);
}

function weatherSuitability(item: EngineWardrobeItem, weather: RecommendationContext['weather']): number {
    switch (weather) {
        case 'rainy':
            return clamp01(0.6 * item.waterResistance + 0.2 * (item.category === 'outerwear' ? 1 : 0) + 0.2);
        case 'snowy':
            return clamp01(0.6 * item.thickness + 0.2 * (item.category === 'outerwear' ? 1 : 0) + 0.2);
        case 'stormy':
            return clamp01(0.5 * item.thickness + 0.3 * item.waterResistance + 0.2);
        case 'humid':
            return clamp01(0.6 * item.breathability + 0.2 * (item.category === 'topwear' ? 1 : 0) + 0.2);
        default:
            return 0.7;
    }
}

function targetFormalityForOccasion(occasion: RecommendationContext['occasion']): number {
    switch (occasion) {
        case 'work':
            return 0.6;
        case 'date':
            return 0.7;
        case 'party':
            return 0.5;
        case 'wedding':
            return 0.9;
        case 'gym':
            return 0.1;
        case 'travel':
            return 0.3;
        case 'casual':
            return 0.2;
        case 'formal':
            return 0.9;
        case 'other':
        default:
            return 0.5;
    }
}

function outfitFormality(items: EngineWardrobeItem[]): number {
    if (!items.length) return 0.5;
    const sum = items.reduce((acc, item) => acc + item.formality, 0);
    return clamp01(sum / items.length);
}

export function getOccasionScore(items: EngineWardrobeItem[], context: RecommendationContext): number {
    const target = targetFormalityForOccasion(context.occasion);
    const actual = outfitFormality(items);
    const formalityAlignment = 1 - Math.abs(target - actual);

    let tagBonus = 0;
    for (const item of items) {
        for (const tag of item.styleTags) {
            const lower = tag.toLowerCase();
            if (context.occasion === 'gym' && (lower.includes('sport') || lower.includes('athleisure'))) {
                tagBonus += 0.05;
            } else if ((context.occasion === 'party' || context.occasion === 'date') && (lower.includes('party') || lower.includes('evening'))) {
                tagBonus += 0.05;
            } else if ((context.occasion === 'work' || context.occasion === 'formal') && (lower.includes('formal') || lower.includes('business'))) {
                tagBonus += 0.05;
            }
        }
    }

    const normalized = clamp01(formalityAlignment + Math.min(tagBonus, 0.2));
    return normalized * 20;
}

export function getWeatherScore(items: EngineWardrobeItem[], context: RecommendationContext): number {
    if (!items.length) return 10;
    let sum = 0;
    for (const item of items) {
        const tempScore = temperatureSuitability(item, context.temperatureC);
        const weatherScore = weatherSuitability(item, context.weather);
        sum += 0.6 * tempScore + 0.4 * weatherScore;
    }
    const avg = sum / items.length;
    return clamp01(avg) * 20;
}

