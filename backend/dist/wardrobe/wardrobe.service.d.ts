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
    status: string;
    isLowConfidence?: boolean;
    colorPalette?: string;
}
export declare class WardrobeService {
    private readonly logger;
    private readonly collection;
    private docToItem;
    getAll(query?: {
        category?: string;
        search?: string;
        favorite?: string;
    }): Promise<WardrobeItem[]>;
    getById(id: string): Promise<WardrobeItem>;
    create(data: Partial<WardrobeItem>): Promise<WardrobeItem>;
    update(id: string, data: Partial<WardrobeItem>): Promise<WardrobeItem>;
    toggleFavorite(id: string): Promise<WardrobeItem>;
    delete(id: string): Promise<void>;
    getStats(): Promise<{
        totalItems: number;
        totalFavorites: number;
        categories: Record<string, number>;
    }>;
}
