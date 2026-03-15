import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notifications;
    constructor(notifications: NotificationsService);
    list(userId: string): Promise<{
        success: boolean;
        data: import("./notifications.service").Notification[];
    }>;
    delete(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
