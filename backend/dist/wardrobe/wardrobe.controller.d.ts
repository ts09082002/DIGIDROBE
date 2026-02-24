import { WardrobeService, WardrobeItem } from './wardrobe.service';
export declare class WardrobeController {
    private readonly wardrobeService;
    constructor(wardrobeService: WardrobeService);
    getAll(category?: string, search?: string, favorite?: string): {
        success: boolean;
        data: WardrobeItem[];
    };
    getStats(): {
        success: boolean;
        data: {
            totalItems: number;
            totalFavorites: number;
            categories: Record<string, number>;
        };
    };
    getById(id: string): {
        success: boolean;
        data: WardrobeItem;
    };
    create(body: Partial<WardrobeItem>): {
        success: boolean;
        data: WardrobeItem;
    };
    update(id: string, body: Partial<WardrobeItem>): {
        success: boolean;
        data: WardrobeItem;
    };
    toggleFavorite(id: string): {
        success: boolean;
        data: WardrobeItem;
    };
    delete(id: string): {
        success: boolean;
        message: string;
    };
}
