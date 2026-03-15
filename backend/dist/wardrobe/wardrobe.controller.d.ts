import { WardrobeService, WardrobeItem, CreateItemDto } from './wardrobe.service';
import { CalendarService } from '../calendar/calendar.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class WardrobeController {
    private readonly wardrobeService;
    private readonly calendarService;
    private readonly notificationsService;
    constructor(wardrobeService: WardrobeService, calendarService: CalendarService, notificationsService: NotificationsService);
    getAll(userId: string, category?: string, favorite?: string, search?: string): Promise<{
        success: boolean;
        data: WardrobeItem[];
    }>;
    getStats(userId: string): Promise<{
        success: boolean;
        data: {
            totalItems: number;
            totalFavorites: number;
            categories: Record<string, number>;
        };
    }>;
    claim(userId: string): Promise<{
        success: boolean;
        data: {
            count: number;
            details: {
                wardrobe: number;
                calendar: number;
                notifications: number;
            };
        };
    }>;
    getById(id: string): Promise<{
        success: boolean;
        data: WardrobeItem;
    }>;
    create(userId: string, createItemDto: CreateItemDto): Promise<{
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
