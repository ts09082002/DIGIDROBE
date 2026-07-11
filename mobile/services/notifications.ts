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

const MOCK_NOTIFICATIONS: AppNotification[] = [
    {
        id: 'mock1',
        type: 'system',
        title: 'Style Recommendation',
        message: "A new 'Parisian Chic' edit is ready for you!",
        timestamp: Date.now() - 120000, // 2 mins ago
        read: false,
    },
    {
        id: 'mock2',
        type: 'system',
        title: 'Catalog Update',
        message: 'New Spring arrivals added to the catalog. Explore 200+ new pieces from your favorite brands.',
        timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
        read: true,
    },
    {
        id: 'mock3',
        type: 'system',
        title: 'Daily Inspo',
        message: "It's 18°C and sunny in Paris. We recommend your Beige Trench Coat today.",
        timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
        read: true,
    }
];

export async function getNotifications(): Promise<AppNotification[]> {
    try {
        const json = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
        if (json) {
            return JSON.parse(json);
        }
        // Initialize storage with mock notifications so they persist and can be read/modified
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(MOCK_NOTIFICATIONS));
        return MOCK_NOTIFICATIONS;
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
        // Cap notifications to maximum 100 entries to prevent storage leaks
        const updated = [newNotif, ...existing].slice(0, 100);
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
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

export async function markNotificationRead(id: string) {
    try {
        const existing = await getNotifications();
        const updated = existing.map(n => n.id === id ? { ...n, read: true } : n);
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch {
        // ignore
    }
}
