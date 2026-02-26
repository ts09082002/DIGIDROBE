import { WardrobeService, WardrobeItem } from './wardrobe.service';
export declare class WardrobeController {
    private readonly wardrobeService;
    constructor(wardrobeService: WardrobeService);
    getAll(category?: string, search?: string, favorite?: string): Promise<{
        success: boolean;
        data: WardrobeItem[];
    }>;
    getStats(): Promise<{
        success: boolean;
        data: {
            totalItems: number;
            totalFavorites: number;
            categories: Record<string, number>;
        };
    }>;
    getById(id: string): Promise<{
        success: boolean;
        data: WardrobeItem;
    }>;
    create(body: Partial<WardrobeItem>): Promise<{
        success: boolean;
        data: WardrobeItem;
    }>;
    update(id: string, body: Partial<WardrobeItem>): Promise<{
        success: boolean;
        data: WardrobeItem;
    }>;
    toggleFavorite(id: string): Promise<{
        success: boolean;
        data: WardrobeItem;
    }>;
    delete(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
