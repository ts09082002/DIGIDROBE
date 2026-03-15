import { NotificationsService } from '../notifications/notifications.service';
export declare class WardrobeItem {
    id: string;
    userId: string;
    originalFilename: string;
    originalUrl: string;
    processedUrl?: string;
    category: string;
    subCategory?: string;
    name?: string;
    brand?: string;
    color?: string;
    season?: string[];
    occasion?: string[];
    isFavorite: boolean;
    mimeType: string;
    size: number;
    createdAt: string;
    updatedAt: string;
    status: 'processing' | 'done' | 'failed' | 'pending';
    isLowConfidence?: boolean;
    colorPalette?: string;
    mlLabels?: string[];
}
export declare class CreateItemDto {
    userId: string;
    originalFilename: string;
    originalUrl: string;
    processedUrl?: string;
    category: string;
    subCategory?: string;
    name?: string;
    brand?: string;
    color?: string;
    season?: string[];
    occasion?: string[];
    mimeType: string;
    size: number;
    status?: 'processing' | 'done' | 'failed' | 'pending';
    isFavorite?: boolean;
    isLowConfidence?: boolean;
    colorPalette?: string;
    mlLabels?: string[];
}
export declare class WardrobeService {
    private readonly notifications;
    private readonly logger;
    private readonly collection;
    constructor(notifications: NotificationsService);
    private sanitizeForFirestore;
    private docToItem;
    getAll(filters: {
        userId: string;
        category?: string;
        favorite?: boolean;
        search?: string;
    }): Promise<WardrobeItem[]>;
    getById(id: string): Promise<WardrobeItem>;
    create(data: Partial<WardrobeItem>): Promise<WardrobeItem>;
    update(id: string, data: Partial<WardrobeItem>): Promise<WardrobeItem>;
    toggleFavorite(id: string): Promise<WardrobeItem>;
    delete(id: string): Promise<void>;
    getStats(userId: string): Promise<{
        totalItems: number;
        totalFavorites: number;
        categories: Record<string, number>;
    }>;
    claimGuestItems(userId: string): Promise<number>;
}
