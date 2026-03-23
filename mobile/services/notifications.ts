import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationType = 'upload' | 'delete' | 'system';

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    imageUri?: string;
}

const NOTIFICATIONS_KEY = '@vibecheck_notifications';

export async function getNotifications(): Promise<AppNotification[]> {
    try {
        const json = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
        if (json) {
            return JSON.parse(json);
        }
        return [];
    } catch {
        return [];
    }
}

export async function addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    try {
        const existing = await getNotifications();
        const newNotif: AppNotification = {
            ...notification,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            timestamp: Date.now(),
            read: false,
        };
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([newNotif, ...existing]));
    } catch {
        // ignore
    }
}

export async function markAllRead() {
    try {
        const existing = await getNotifications();
        const updated = existing.map(n => ({ ...n, read: true }));
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch {
        // ignore
    }
}
