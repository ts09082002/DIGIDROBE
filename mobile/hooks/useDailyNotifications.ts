import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Instruct how to handle incoming notifications when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

/**
 * Configure 4 daily local notifications
 */
async function scheduleDailyNotifications() {
    try {
        // Clear all previously scheduled notifications to avoid duplicates
        await Notifications.cancelAllScheduledNotificationsAsync();

        // 1. Morning - 9:00 AM
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Good Morning! ☀️',
                body: 'Open VibeCheck to put together your perfect outfit for the day!',
                data: { route: 'home' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 9,
                minute: 0,
            },
        });

        // 2. Afternoon - 1:00 PM
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Good Afternoon! 🌤️',
                body: 'How is your outfit looking? Need a quick style refresh?',
                data: { route: 'home' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 13,
                minute: 0,
            },
        });

        // 3. Evening - 6:00 PM
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Good Evening! 🌆',
                body: 'Ready for dinner or a night out? Let’s plan your evening look!',
                data: { route: 'home' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 18,
                minute: 0,
            },
        });

        // 4. Night - 9:00 PM
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Good Night! 🌙',
                body: 'Drift off to sleep and let AI dream up your wardrobe for tomorrow!',
                data: { route: 'home' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 21,
                minute: 0,
            },
        });
        
    } catch (error) {
        console.warn('Failed to schedule daily notifications:', error);
    }
}

export function useDailyNotifications() {
    useEffect(() => {
        let isMounted = true;

        async function setup() {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('daily-reminders', {
                    name: 'Daily Reminders',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#D4A373',
                });
            }

            const settings = await Notifications.getPermissionsAsync() as any;
            let finalStatus = settings.granted || settings.status === 'granted';
            
            if (!finalStatus) {
                const asked = await Notifications.requestPermissionsAsync() as any;
                finalStatus = asked.granted || asked.status === 'granted';
            }

            if (!finalStatus) {
                // Cannot schedule without permissions
                return;
            }

            if (isMounted) {
                await scheduleDailyNotifications();
            }
        }

        setup();

        return () => {
            isMounted = false;
        };
    }, []);
}
