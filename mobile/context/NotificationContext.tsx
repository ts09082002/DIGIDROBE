import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getNotifications, markAllRead, markNotificationRead, AppNotification } from '../services/notifications';

type NotificationContextType = {
    notifications: AppNotification[];
    unreadCount: number;
    fetchNotifications: () => Promise<void>;
    markAllNotificationsAsRead: () => Promise<void>;
    markSingleAsRead: (id: string) => Promise<void>;
};

export const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    unreadCount: 0,
    fetchNotifications: async () => {},
    markAllNotificationsAsRead: async () => {},
    markSingleAsRead: async () => {},
});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        const notifs = await getNotifications();
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAllNotificationsAsRead = useCallback(async () => {
        await markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }, []);

    const markSingleAsRead = useCallback(async (id: string) => {
        await markNotificationRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            fetchNotifications,
            markAllNotificationsAsRead,
            markSingleAsRead,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
