export interface WardrobeItem {
    id: string;
    originalFilename: string;
    originalUrl: string;
    processedUrl: string;
    category: string;
    name: string;
    brand: string;
    color: string;
    season: string[];
    occasion: string[];
    isFavorite: boolean;
    mimeType: string;
    size: number;
    createdAt: string;
    updatedAt: string;
}
export declare class WardrobeService {
    private readonly logger;
    private readonly itemsPath;
    private loadItems;
    private saveItems;
    getAll(query?: {
        category?: string;
        search?: string;
        favorite?: string;
    }): WardrobeItem[];
    getById(id: string): WardrobeItem;
    create(data: Partial<WardrobeItem>): WardrobeItem;
    update(id: string, data: Partial<WardrobeItem>): WardrobeItem;
    toggleFavorite(id: string): WardrobeItem;
    delete(id: string): void;
    getStats(): {
        totalItems: number;
        totalFavorites: number;
        categories: Record<string, number>;
    };
}
