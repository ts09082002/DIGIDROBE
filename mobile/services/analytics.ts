/**
 * Analytics service — thin wrapper around Firebase Analytics.
 * All events are fire-and-forget; errors never crash the app.
 *
 * To see events in real-time during development:
 *   adb shell setprop debug.firebase.analytics.app com.vibecheck.app
 * Then open Firebase Console → Analytics → DebugView
 */

import analytics from '@react-native-firebase/analytics';

/** Log any custom event with optional parameters. */
export function logEvent(name: string, params?: Record<string, any>): void {
    analytics().logEvent(name, params).catch(() => {});
}

/** Log a screen view — call this inside useFocusEffect on each screen. */
export function logScreenView(screenName: string, screenClass?: string): void {
    analytics().logEvent('screen_view', {
        screen_name: screenName,
        screen_class: screenClass ?? screenName,
    }).catch(() => {});
}
