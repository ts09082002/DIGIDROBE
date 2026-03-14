import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/theme';
import { ThemeProvider } from '../context/ThemeContext';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { useRouter, useSegments } from 'expo-router';

function RootLayoutNav() {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';

        if (!user && !inAuthGroup) {
            router.replace('/login');
        } else if (user && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [user, isLoading, segments]);

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.warmGray },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
    );
}

export default function RootLayout() {
    const [showStartupSplash, setShowStartupSplash] = useState(true);
    const progress = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const progressAnim = Animated.timing(progress, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
        });

        progressAnim.start();

        const hideTimer = setTimeout(() => {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 280,
                useNativeDriver: true,
            }).start(() => setShowStartupSplash(false));
        }, 2000);

        return () => {
            clearTimeout(hideTimer);
            progressAnim.stop();
        };
    }, [opacity, progress]);

    const progressWidth = progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <ThemeProvider>
            <AuthProvider>
                <StatusBar style="auto" />
                <View style={styles.root}>
                    <RootLayoutNav />

                    {showStartupSplash && (
                        <Animated.View style={[styles.splashContainer, { opacity }]}>
                            <Image source={require('../assets/splash.png')} style={styles.logo} resizeMode="contain" />
                            <Text style={styles.appName}>Digidrobe</Text>

                            <View style={styles.progressTrack}>
                                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                            </View>
                        </Animated.View>
                    )}
                </View>
            </AuthProvider>
        </ThemeProvider>
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
        backgroundColor: '#E7DFD3',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.gold,
        borderRadius: 999,
    },
});
