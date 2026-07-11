/**
 * Analytics service — thin wrapper around Firebase Analytics.
 * All events are fire-and-forget; errors never crash the app.
 *
 * To see events in real-time during development:
 *   adb shell setprop debug.firebase.analytics.app com.vibecheck.app
 * Then open Firebase Console → Analytics → DebugView
 */

import { getApp } from '@react-native-firebase/app';
import { getAnalytics, logEvent as firebaseLogEvent } from '@react-native-firebase/analytics';

/** Log any custom event with optional parameters. */
export function logEvent(name: string, params?: Record<string, any>): void {
    try {
        const app = getApp();
        const analyticsInstance = getAnalytics(app);
        firebaseLogEvent(analyticsInstance, name, params).catch(() => {});
    } catch (e) {
        // App might not be initialized yet
    }
}

/** Log a screen view — call this inside useFocusEffect on each screen. */
export function logScreenView(screenName: string, screenClass?: string): void {
    try {
        const app = getApp();
        const analyticsInstance = getAnalytics(app);
        firebaseLogEvent(analyticsInstance, 'screen_view', {
            screen_name: screenName,
            screen_class: screenClass ?? screenName,
        }).catch(() => {});
    } catch (e) {
        // App might not be initialized yet
    }
}
