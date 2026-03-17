export type EngineItemCategory =
    | 'topwear'
    | 'bottomwear'
    | 'outerwear'
    | 'footwear'
    | 'accessories'
    | 'bags'
    | 'dresses'
    | 'unclassified';

export type Occasion =
    | 'work'
    | 'date'
    | 'party'
    | 'wedding'
    | 'gym'
    | 'casual'
    | 'formal'
    | 'travel'
    | 'other';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'humid' | 'dry';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface EngineWardrobeItem {
    id: string;
    category: EngineItemCategory;
    subCategory?: string;
    name: string;
    brand?: string;
    /** Primary named color (e.g. 'Black', 'White', 'Navy Blue'). */
    primaryColor: string;
    /** Optional secondary color name. */
    secondaryColor?: string;
    /** Additional flags for neutrals like black/white/grey/beige. */
    isNeutral?: boolean;
    /** 0 (very casual) to 1 (very formal). */
    formality: number;
    /** Seasons this item is suitable for. */
    seasonality: Array<'spring' | 'summer' | 'autumn' | 'winter'>;
    /** Thicker items score higher for cold weather. 0–1. */
    thickness: number;
    /** 0–1 water resistance for rainy weather. */
    waterResistance: number;
    /** 0–1 breathability for hot weather. */
    breathability: number;
    /** Style tags like 'streetwear', 'classic', 'sporty'. */
    styleTags: string[];
    /** Whether this item is a user favorite in the app. */
    isFavorite?: boolean;
}

export interface Outfit {
    id: string;
    itemIds: string[];
}

export interface OutfitWithItems {
    id: string;
    items: EngineWardrobeItem[];
}

export interface RecommendationContext {
    temperatureC: number;
    weather: WeatherType;
    occasion: Occasion;
    dayOfWeek: number; // 0 (Sunday) – 6 (Saturday)
    timeOfDay: TimeOfDay;
}

export interface OnlineLearningWeights {
    colorNudges: Record<string, number>;
    categoryNudges: Record<EngineItemCategory, number>;
    tagNudges: Record<string, number>;
    formalityNudge: number;
    interactionCount: number;
}

export interface UserStyleProfile {
    preferredColors: Record<string, number>;
    preferredTypes: Record<EngineItemCategory, number>;
    preferredTags: Record<string, number>;
    /** 0 casual – 1 formal. */
    preferredFormality: number;
    /** Online learning nudges from accept/skip interactions. */
    onlineWeights?: OnlineLearningWeights;
}

export type UserInteractionType = 'wear' | 'like' | 'favorite' | 'click' | 'skip';

export interface UserInteractionEvent {
    id: string;
    type: UserInteractionType;
    date: string; // ISO string
    outfitId?: string;
    itemIds: string[];
    context?: RecommendationContext;
    /** Denormalized item metadata for profile building (avoids re-resolving IDs). */
    itemColors?: string[];
    itemCategories?: EngineItemCategory[];
    itemTags?: string[];
    outfitFormality?: number;
}

export interface WearEvent {
    date: string; // ISO date
    outfitId: string;
    itemIds: string[];
}

export interface RecentUsageIndex {
    recentItemUsage: Record<string, string>; // itemId → lastWearDate ISO
    recentOutfits: Record<string, string>; // outfitSignatureHash → lastWearDate ISO
}

export interface OutfitScoreBreakdown {
    outfitId: string;
    itemIds: string[];
    colorScore: number;
    occasionScore: number;
    weatherScore: number;
    userPreferenceScore: number;
    noveltyScore: number;
    coherenceScore: number;
    totalScore: number;
}

export interface StyleOfTheDayResult {
    outfit: OutfitWithItems;
    scores: OutfitScoreBreakdown;
}

