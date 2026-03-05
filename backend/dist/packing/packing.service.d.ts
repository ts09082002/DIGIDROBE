import { WardrobeService, WardrobeItem } from '../wardrobe/wardrobe.service';
export interface PackingListRequest {
    destination: string;
    days: number;
    userId?: string;
}
export interface StylistSuggestion {
    suggestedOutfit: WardrobeItem[];
    favorites: WardrobeItem[];
    stats: {
        totalItems: number;
        totalFavorites: number;
        categories: Record<string, number>;
    };
}
export declare class PackingService {
    private readonly wardrobeService;
    private readonly logger;
    constructor(wardrobeService: WardrobeService);
    generatePackingList(request: PackingListRequest): Promise<WardrobeItem[]>;
    getStylistSuggestion(): Promise<StylistSuggestion>;
}
