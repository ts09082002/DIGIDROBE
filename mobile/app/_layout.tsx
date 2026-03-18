import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/theme';
import { ThemeProvider } from '../context/ThemeContext';
import { DatabaseProvider } from '../db/DatabaseProvider';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useFonts, Cormorant_600SemiBold, Cormorant_700Bold } from '@expo-google-fonts/cormorant';
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';

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
            <StatusBar style="auto" />
            <View style={styles.root}>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: Colors.warmGray },
                        animation: 'slide_from_right',
                    }}
                >
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>

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
