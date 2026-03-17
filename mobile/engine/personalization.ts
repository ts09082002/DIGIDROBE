import {
    EngineItemCategory,
    EngineWardrobeItem,
    OnlineLearningWeights,
    RecommendationContext,
    UserInteractionEvent,
    UserStyleProfile,
} from './types';

const DECAY_HALF_LIFE_DAYS = 30;
const LN2 = Math.log(2);

const BASE_LEARNING_RATE = 0.1;
const SKIP_DISCOUNT = 0.3;

function daysBetween(a: Date, b: Date): number {
    const diffMs = Math.abs(b.getTime() - a.getTime());
    return diffMs / (1000 * 60 * 60 * 24);
}

function decayWeight(daysAgo: number): number {
    if (daysAgo <= 0) return 1;
    return Math.exp((-LN2 * daysAgo) / DECAY_HALF_LIFE_DAYS);
}

function clamp(x: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, x));
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
        else if (event.type === 'skip') interactionMultiplier = -SKIP_DISCOUNT;

        const totalWeight = baseWeight * interactionMultiplier;

        // Accumulate color preferences from denormalized event data
        if (event.itemColors) {
            for (const color of event.itemColors) {
                preferredColors[color] = (preferredColors[color] ?? 0) + totalWeight;
            }
        }

        // Accumulate category preferences
        if (event.itemCategories) {
            for (const cat of event.itemCategories) {
                if (cat in preferredTypes) {
                    preferredTypes[cat] += totalWeight;
                }
            }
        }

        // Accumulate style tag preferences
        if (event.itemTags) {
            for (const tag of event.itemTags) {
                preferredTags[tag] = (preferredTags[tag] ?? 0) + totalWeight;
            }
        }

        // Accumulate formality (using typed field)
        if (event.outfitFormality != null) {
            const absWeight = Math.abs(totalWeight);
            formalitySum += event.outfitFormality * absWeight * Math.sign(totalWeight);
            formalityWeightSum += absWeight;
        }
    }

    // Normalize weight dictionaries to 0-1 range
    const colorValues = Object.values(preferredColors);
    const maxColor = colorValues.length > 0 ? Math.max(...colorValues.map(Math.abs), 1) : 1;
    for (const key of Object.keys(preferredColors)) {
        preferredColors[key] /= maxColor;
    }

    const typeValues = Object.values(preferredTypes);
    const maxType = typeValues.length > 0 ? Math.max(...typeValues.map(Math.abs), 1) : 1;
    for (const key of Object.keys(preferredTypes)) {
        preferredTypes[key as EngineItemCategory] /= maxType;
    }

    const tagValues = Object.values(preferredTags);
    const maxTag = tagValues.length > 0 ? Math.max(...tagValues.map(Math.abs), 1) : 1;
    for (const key of Object.keys(preferredTags)) {
        preferredTags[key] /= maxTag;
    }

    const preferredFormality = formalityWeightSum > 0 ? formalitySum / formalityWeightSum : 0.5;

    return {
        preferredColors,
        preferredTypes,
        preferredTags,
        preferredFormality,
    };
}

// ─── Online Learning (Multi-Armed Bandit) ────────────────────────────────────

function learningRate(interactionCount: number): number {
    return BASE_LEARNING_RATE / (1 + interactionCount * 0.01);
}

export function createOnlineWeights(): OnlineLearningWeights {
    return {
        colorNudges: {},
        categoryNudges: {
            topwear: 0, bottomwear: 0, outerwear: 0, footwear: 0,
            accessories: 0, bags: 0, dresses: 0, unclassified: 0,
        },
        tagNudges: {},
        formalityNudge: 0,
        interactionCount: 0,
    };
}

export function applyOnlineUpdate(
    weights: OnlineLearningWeights,
    outfitItems: EngineWardrobeItem[],
    accepted: boolean,
): OnlineLearningWeights {
    const lr = learningRate(weights.interactionCount);
    const sign = accepted ? 1 : -SKIP_DISCOUNT;

    const updated: OnlineLearningWeights = {
        colorNudges: { ...weights.colorNudges },
        categoryNudges: { ...weights.categoryNudges },
        tagNudges: { ...weights.tagNudges },
        formalityNudge: weights.formalityNudge,
        interactionCount: weights.interactionCount + 1,
    };

    for (const item of outfitItems) {
        if (item.primaryColor) {
            updated.colorNudges[item.primaryColor] =
                (updated.colorNudges[item.primaryColor] ?? 0) + lr * sign;
        }
        updated.categoryNudges[item.category] =
            (updated.categoryNudges[item.category] ?? 0) + lr * sign;
        for (const tag of item.styleTags) {
            updated.tagNudges[tag] = (updated.tagNudges[tag] ?? 0) + lr * sign;
        }
    }

    if (outfitItems.length > 0) {
        const avgFormality = outfitItems.reduce((s, i) => s + i.formality, 0) / outfitItems.length;
        updated.formalityNudge += lr * sign * (avgFormality - 0.5);
    }

    return updated;
}

// ─── Preference Score ────────────────────────────────────────────────────────

export function preferenceScoreForOutfit(
    items: EngineWardrobeItem[],
    profile: UserStyleProfile,
    context?: RecommendationContext,
): number {
    if (!items.length) return 0;

    const online = profile.onlineWeights;
    let colorScore = 0;
    let typeScore = 0;
    let tagScore = 0;

    for (const item of items) {
        const colorKey = item.primaryColor;
        if (colorKey) {
            colorScore += (profile.preferredColors[colorKey] ?? 0)
                + (online?.colorNudges[colorKey] ?? 0);
        }
        typeScore += (profile.preferredTypes[item.category] ?? 0)
            + (online?.categoryNudges[item.category] ?? 0);
        for (const tag of item.styleTags) {
            tagScore += (profile.preferredTags[tag] ?? 0)
                + (online?.tagNudges[tag] ?? 0);
        }
    }

    const n = items.length;
    const avgFormality = items.reduce((s, i) => s + i.formality, 0) / n;
    const adjustedFormality = clamp(
        profile.preferredFormality + (online?.formalityNudge ?? 0),
        0,
        1,
    );
    const formalityAlignment = 1 - Math.abs(avgFormality - adjustedFormality);

    const normalizedColor = colorScore / n;
    const normalizedType = typeScore / n;
    const normalizedTag = tagScore / n;

    const combined =
        0.4 * normalizedColor +
        0.3 * normalizedType +
        0.2 * normalizedTag +
        0.1 * formalityAlignment;

    // Scale to 0-20 range to match other scoring dimensions
    return clamp(combined * 20, 0, 20);
}
