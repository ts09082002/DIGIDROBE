import {
    EngineWardrobeItem,
    OutfitScoreBreakdown,
    RecommendationContext,
    RecentUsageIndex,
    UserStyleProfile,
} from './types';
import { getColorCompatibilityScore } from './colorCompatibility';
import { getOccasionScore, getWeatherScore } from './context';
import { preferenceScoreForOutfit } from './personalization';
import { computeNoveltyScore } from './diversity';

export function scoreOutfit(
    outfitId: string,
    items: EngineWardrobeItem[],
    context: RecommendationContext,
    profile: UserStyleProfile,
    usage: RecentUsageIndex,
    todayIso: string,
): OutfitScoreBreakdown {
    const colorScore = getColorCompatibilityScore(items) * 20;
    const occasionScore = getOccasionScore(items, context);
    const weatherScore = getWeatherScore(items, context);
    const userPreferenceScore = preferenceScoreForOutfit(items, profile, context);
    const noveltyScore = computeNoveltyScore(items, usage, todayIso);

    const totalScore =
        colorScore +
        occasionScore +
        weatherScore +
        userPreferenceScore +
        (Number.isFinite(noveltyScore) ? noveltyScore : -1e6);

    return {
        outfitId,
        itemIds: items.map((i) => i.id),
        colorScore,
        occasionScore,
        weatherScore,
        userPreferenceScore,
        noveltyScore,
        totalScore,
    };
}

