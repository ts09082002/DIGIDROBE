import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Instruct how to handle incoming notifications when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
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
                data: { route: 'styling' },
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
                data: { route: 'styling' },
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
                data: { route: 'styling' },
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

                // TEST: Trigger contextual greeting notification for testing
                setTimeout(async () => {
                    const hour = new Date().getHours();
                    let title = '';
                    let body = '';

                    if (hour >= 5 && hour < 12) {
                        title = 'Good Morning! ☀️';
                        body = 'Open VibeCheck to put together your perfect outfit for the day!';
                    } else if (hour >= 12 && hour < 17) {
                        title = 'Good Afternoon! 🌤️';
                        body = 'How is your outfit looking? Need a quick style refresh?';
                    } else if (hour >= 17 && hour < 21) {
                        title = 'Good Evening! 🌆';
                        body = 'Ready for dinner or a night out? Let’s plan your evening look!';
                    } else {
                        title = 'Good Night! 🌙';
                        body = 'Drift off to sleep and let AI dream up your wardrobe for tomorrow!';
                    }

                    await Notifications.scheduleNotificationAsync({
                        content: { title, body },
                        trigger: null,
                    });
                }, 2000);
            }
        }

        setup();

        return () => {
            isMounted = false;
        };
    }, []);
}
