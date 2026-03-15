export type NotificationType = 'daily_outfit' | 'upload';
export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    createdAt: string;
    read: boolean;
    metadata?: {
        outfitItemIds?: string[];
        quote?: string;
    };
}
export declare class NotificationsService {
    private readonly logger;
    private readonly collection;
    create(input: Omit<Notification, 'id' | 'createdAt' | 'read'> & {
        read?: boolean;
    }): Promise<Notification>;
    findForUser(userId: string): Promise<Notification[]>;
    delete(id: string): Promise<void>;
    claimGuestItems(userId: string): Promise<number>;
}
