import { EngineWardrobeItem, RecommendationContext, UserInteractionEvent, UserStyleProfile } from './types';

const DECAY_HALF_LIFE_DAYS = 30;
const LN2 = Math.log(2);

function daysBetween(a: Date, b: Date): number {
    const diffMs = Math.abs(b.getTime() - a.getTime());
    return diffMs / (1000 * 60 * 60 * 24);
}

function decayWeight(daysAgo: number): number {
    if (daysAgo <= 0) return 1;
    return Math.exp((-LN2 * daysAgo) / DECAY_HALF_LIFE_DAYS);
}

export function buildUserStyleProfile(events: UserInteractionEvent[], now: Date = new Date()): UserStyleProfile {
    const preferredColors: Record<string, number> = {};
    const preferredTypes: UserStyleProfile['preferredTypes'] = {
        topwear: 0,
        bottomwear: 0,
        outerwear: 0,
        footwear: 0,
        accessories: 0,
        bags: 0,
        dresses: 0,
        unclassified: 0,
    };
    const preferredTags: Record<string, number> = {};

    let formalitySum = 0;
    let formalityWeightSum = 0;

    for (const event of events) {
        const eventDate = new Date(event.date);
        const daysAgo = daysBetween(eventDate, now);
        const baseWeight = decayWeight(daysAgo);

        let interactionMultiplier = 1;
        if (event.type === 'wear') interactionMultiplier = 1;
        else if (event.type === 'like') interactionMultiplier = 1.2;
        else if (event.type === 'favorite') interactionMultiplier = 1.5;
        else if (event.type === 'click') interactionMultiplier = 0.6;

        const totalWeight = baseWeight * interactionMultiplier;

        if (event.context && (event as any).outfitFormality != null) {
            const of = Number((event as any).outfitFormality);
            formalitySum += of * totalWeight;
            formalityWeightSum += totalWeight;
        }
    }

    const preferredFormality = formalityWeightSum > 0 ? formalitySum / formalityWeightSum : 0.5;

    return {
        preferredColors,
        preferredTypes,
        preferredTags,
        preferredFormality,
    };
}

export function preferenceScoreForOutfit(
    items: EngineWardrobeItem[],
    profile: UserStyleProfile,
    context?: RecommendationContext,
): number {
    if (!items.length) return 0;

    let colorScore = 0;
    let typeScore = 0;
    let tagScore = 0;
    let formalityScore = 0;

    for (const item of items) {
        const colorKey = item.primaryColor;
        if (colorKey && profile.preferredColors[colorKey]) {
            colorScore += profile.preferredColors[colorKey];
        }
        if (profile.preferredTypes[item.category] != null) {
            typeScore += profile.preferredTypes[item.category];
        }
        for (const tag of item.styleTags) {
            if (profile.preferredTags[tag]) {
                tagScore += profile.preferredTags[tag];
            }
        }
        formalityScore += item.formality;
    }

    const n = items.length;
    const avgFormality = formalityScore / n;
    const formalityAlignment = 1 - Math.abs(avgFormality - profile.preferredFormality);

    const normalizedColor = colorScore / (n || 1);
    const normalizedType = typeScore / (n || 1);
    const normalizedTag = tagScore / (n || 1);

    const combined =
        0.4 * normalizedColor +
        0.3 * normalizedType +
        0.2 * normalizedTag +
        0.1 * formalityAlignment * 10;

    return combined;
}

