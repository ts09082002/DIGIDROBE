import { WardrobeService, WardrobeItem } from '../wardrobe/wardrobe.service';
export interface PackingListRequest {
    destination: string;
    days: number;
    userId?: string;
}
export interface StylistSuggestion {
    suggestedOutfit: WardrobeItem[];
    alternativeOutfits: Array<{
        id: string;
        name: string;
        note: string;
        items: WardrobeItem[];
        score: number;
    }>;
    favorites: WardrobeItem[];
    stats: {
        totalItems: number;
        totalFavorites: number;
        categories: Record<string, number>;
    };
}
export interface StyleProfileRequest {
    bodyType?: 'Slim' | 'Athletic' | 'Average' | 'Heavy';
    skinTone?: 'Light' | 'Medium' | 'Tan' | 'Dark';
    height?: number;
    waistSize?: string;
    stylePreference?: 'Casual' | 'Streetwear' | 'Formal' | 'Minimal';
}
export declare function categorize(category: string): string;
export declare function buildLookNote(profile?: StyleProfileRequest): string;
export declare class PackingService {
    private readonly wardrobeService;
    private readonly logger;
    constructor(wardrobeService: WardrobeService);
    generatePackingList(request: PackingListRequest): Promise<WardrobeItem[]>;
    getStylistSuggestion(profile?: StyleProfileRequest): Promise<StylistSuggestion>;
}
