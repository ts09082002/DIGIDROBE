import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/theme';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DatabaseProvider } from '../db/DatabaseProvider';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useFonts, Cormorant_600SemiBold, Cormorant_700Bold } from '@expo-google-fonts/cormorant';
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';

/** Auth gate — redirects based on auth state using Expo Router segments. */
function AuthGate({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return; // Wait for auth check to finish

        const inAuthGroup = segments[0] === '(auth)';

        if (!isAuthenticated && !inAuthGroup) {
            // Not signed in and not on login → redirect to login
            router.replace('/(auth)/login' as any);
        } else if (isAuthenticated && inAuthGroup) {
            // Signed in but on login → redirect to tabs
            router.replace('/(tabs)' as any);
        }
    }, [isAuthenticated, isLoading, segments, router]);

    return <>{children}</>;
}

export default function RootLayout() {
    const [showStartupSplash, setShowStartupSplash] = useState(true);
    const progress = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    const [fontsLoaded] = useFonts({
        Cormorant_600SemiBold,
        Cormorant_700Bold,
        Montserrat_400Regular,
        Montserrat_500Medium,
        Montserrat_600SemiBold,
        Montserrat_700Bold,
    });

    useEffect(() => {
        if (!fontsLoaded) return;

        const progressAnim = Animated.timing(progress, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
        });

        progressAnim.start();

        const hideTimer = setTimeout(() => {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start(() => setShowStartupSplash(false));
        }, 1000);

        return () => {
            clearTimeout(hideTimer);
            progressAnim.stop();
        };
    }, [fontsLoaded, opacity, progress]);

    return (
        <ErrorBoundary>
        <DatabaseProvider>
        <ThemeProvider>
        <AuthProvider>
            <StatusBar style="auto" />
            <View style={styles.root}>
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

                {(!fontsLoaded || showStartupSplash) && (
                    <Animated.View style={[styles.splashContainer, fontsLoaded ? { opacity } : undefined]}>
                        <Image source={require('../assets/splash.png')} style={styles.logo} resizeMode="contain" />
                        <Text style={styles.appName}>Drobeo</Text>

                        <View style={styles.progressTrack}>
                            <Animated.View style={[styles.progressFill, { width: fontsLoaded ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '0%' }]} />
                        </View>
                    </Animated.View>
                )}
            </View>
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
    splashContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.warmGray,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
    },
    logo: {
        width: 84,
        height: 84,
        marginBottom: 16,
    },
    appName: {
        fontSize: 26,
        fontWeight: '800',
        color: Colors.charcoal,
        marginBottom: 22,
        letterSpacing: 0.2,
    },
    progressTrack: {
        width: 180,
        height: 6,
        borderRadius: 999,
        backgroundColor: Colors.lightGray,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.gold,
        borderRadius: 999,
    },
});
