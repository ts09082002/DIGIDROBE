import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'expo-keep-awake';
import { Colors } from '../constants/theme';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DatabaseProvider } from '../db/DatabaseProvider';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Global font default ───────────────────────────────────────────────────────
// Any Text that doesn't explicitly set fontFamily will use Montserrat Regular.
// Components that do set fontFamily (e.g. headings using Cormorant) still override this.
// @ts-ignore — defaultProps is valid but not in the TS typings
Text.defaultProps = Text.defaultProps ?? {};
// @ts-ignore
Text.defaultProps.style = [{ fontFamily: 'Montserrat_400Regular' }];
import { useFonts, Cormorant_600SemiBold, Cormorant_700Bold } from '@expo-google-fonts/cormorant';
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AnimatedSplashScreen from '../components/ui/AnimatedSplashScreen';
import { useDailyNotifications } from '../hooks/useDailyNotifications';
import { OnboardingProvider } from '../context/OnboardingContext';
import OnboardingOverlay from '../components/ui/OnboardingOverlay';
SplashScreen.preventAutoHideAsync();

/** Auth gate — redirects based on auth state using Expo Router segments. */
function AuthGate({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const navigationState = useRootNavigationState();

    useEffect(() => {
        if (!navigationState?.key || isLoading) return;

        const checkOnboardingAndRedirect = async () => {
            const inAuthGroup = segments[0] === '(auth)';

            if (!isAuthenticated && !inAuthGroup) {
                setTimeout(() => router.replace('/(auth)/login'), 10);
            } else if (isAuthenticated && (inAuthGroup || !segments[0])) {
                try {
                    const hasSeenOnboarding = await AsyncStorage.getItem('@vibecheck_has_seen_onboarding');
                    if (hasSeenOnboarding !== 'true') {
                        // First time -> go straight to wardrobe to see the tutorial overlay
                        setTimeout(() => router.replace('/(tabs)/wardrobe'), 10);
                    } else {
                        // Returning user -> go to home screen
                        setTimeout(() => router.replace('/(tabs)'), 10);
                    }
                } catch (e) {
                    setTimeout(() => router.replace('/(tabs)'), 10);
                }
            }
        };

        checkOnboardingAndRedirect();
    }, [isAuthenticated, isLoading, segments, router, navigationState]);

    return <>{children}</>;
}

export default function RootLayout() {
    const [showStartupSplash, setShowStartupSplash] = useState(true);

    // Initialize daily occasion notifications
    useDailyNotifications();

    const [fontsLoaded] = useFonts({
        Cormorant_600SemiBold,
        Cormorant_700Bold,
        Montserrat_400Regular,
        Montserrat_500Medium,
        Montserrat_600SemiBold,
        Montserrat_700Bold,
    });

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return <View style={{ flex: 1, backgroundColor: Colors.cream }} />;
    }

    return (
        <ErrorBoundary>
        <DatabaseProvider>
        <ThemeProvider>
        <AuthProvider>
            <OnboardingProvider>
                <StatusBar style="auto" />
                <GestureHandlerRootView style={styles.root}>
                    <AuthGate>
                        <Stack
                            screenOptions={{
                                headerShown: false,
                                contentStyle: { backgroundColor: Colors.warmGray },
                                animation: 'slide_from_right',
                            }}
                        >
                            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        </Stack>
                    </AuthGate>
                    
                    <OnboardingOverlay />

                    {showStartupSplash && (
                        <AnimatedSplashScreen onFinish={() => setShowStartupSplash(false)} />
                    )}
                </GestureHandlerRootView>
            </OnboardingProvider>
        </AuthProvider>
        </ThemeProvider>
        </DatabaseProvider>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
});
