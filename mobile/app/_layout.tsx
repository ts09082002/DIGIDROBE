import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'expo-keep-awake';
import { Colors } from '../constants/theme';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DatabaseProvider } from '../db/DatabaseProvider';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
import { GoogleSignin } from '@react-native-google-signin/google-signin';


/** Auth gate — redirects based on auth state using Expo Router segments. */
function AuthGate({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const navigationState = useRootNavigationState();

    useEffect(() => {
        if (!navigationState?.key || isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!isAuthenticated && !inAuthGroup) {
            setTimeout(() => router.replace('/(auth)/login'), 10);
        } else if (isAuthenticated && (inAuthGroup || !segments[0])) {
            setTimeout(() => router.replace('/(tabs)'), 10);
        }
    }, [isAuthenticated, isLoading, segments, router, navigationState]);

    return <>{children}</>;
}

export default function RootLayout() {
    const [showStartupSplash, setShowStartupSplash] = useState(true);

    // Configure Google Sign-In once on mount and clear any stale session
    useEffect(() => {
        GoogleSignin.configure({
            webClientId: '838322575800-lluotvoiimbfrftp44bphkrtmge8i2ii.apps.googleusercontent.com',
            offlineAccess: true,
            scopes: ['profile', 'email'],
        });
    }, []);

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

    if (!fontsLoaded) {
        return <View style={{ flex: 1, backgroundColor: Colors.warmGray }} />;
    }

    return (
        <ErrorBoundary>
        <DatabaseProvider>
        <ThemeProvider>
        <AuthProvider>
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
                
                {showStartupSplash && (
                    <AnimatedSplashScreen onFinish={() => setShowStartupSplash(false)} />
                )}
            </GestureHandlerRootView>
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
