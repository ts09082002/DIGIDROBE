import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/theme';
import { ThemeProvider } from '../context/ThemeContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    Platform,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { useRouter, useSegments } from 'expo-router';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Carousel config ──────────────────────────────────────────────────────────
const CARD_W   = Math.round(SW * 0.38);
const CARD_H   = Math.round(CARD_W * 0.85);   // shorter cards
const CARD_GAP = 10;

const SPLASH_IMGS = [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=70',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=70',
    'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400&q=70',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=70',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=70',
];

// Fisher-Yates shuffle — runs once at module load
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
const SHUFFLED = [...shuffle(SPLASH_IMGS), ...shuffle(SPLASH_IMGS)]; // doubled for scroll

// ── Auth-aware navigator ─────────────────────────────────────────────────────
function RootLayoutNav() {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router   = useRouter();

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
            <Stack.Screen name="index"  options={{ headerShown: false }} />
            <Stack.Screen name="login"  options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
    );
}

// ── Root layout with custom splash ──────────────────────────────────────────
export default function RootLayout() {
    const [showSplash, setShowSplash] = useState(true);
    const [dotIdx,     setDotIdx]     = useState(0);

    const progress = useRef(new Animated.Value(0)).current;
    const opacity  = useRef(new Animated.Value(1)).current;
    const scrollX  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // 1. Loading progress bar: 0 → 100% in 2200 ms
        Animated.timing(progress, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
        }).start();

        // 2. Slow carousel scroll (moves ~2.5 card widths left over 3 s)
        Animated.timing(scrollX, {
            toValue: -(CARD_W + CARD_GAP) * 2.5,
            duration: 3000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();

        // 3. Dot cycle: 0 → 1 → 2
        const t1 = setTimeout(() => setDotIdx(1), 900);
        const t2 = setTimeout(() => setDotIdx(2), 1800);

        // 4. Fade out at 3.5 s to give images time to load
        const hide = setTimeout(() => {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setShowSplash(false));
        }, 3500);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(hide);
        };
    }, []);

    const progressWidth = progress.interpolate({
        inputRange:  [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
                <AuthProvider>
                    <StatusBar style="auto" />
                    <View style={styles.root}>
                        <RootLayoutNav />

                        {showSplash && (
                            <Animated.View style={[styles.splash, { opacity }]}>

                                {/* ── Upper logo area ─────────────────────── */}
                                <View style={styles.logoArea}>
                                    <MaterialCommunityIcons
                                        name="hanger"
                                        size={52}
                                        color={SKY}
                                        style={{ marginBottom: 12 }}
                                    />
                                    <Text style={styles.brandName}>WARDORA</Text>
                                    <View style={styles.brandRule} />
                                    <Text style={styles.brandTagline}>DIGITAL ATELIER</Text>
                                </View>

                                {/* ── Bottom sky-blue strip with carousel ─── */}
                                <View style={styles.bottomStrip}>

                                    {/* scrolling carousel */}
                                    <View style={styles.carouselWrap}>
                                        <Animated.View
                                            style={[
                                                styles.carouselStrip,
                                                { transform: [{ translateX: scrollX }] },
                                            ]}
                                        >
                                            {SHUFFLED.map((uri, i) => (
                                                <View key={i} style={styles.carouselCard}>
                                                    <Image
                                                        source={{ uri }}
                                                        style={styles.carouselImg}
                                                        resizeMode="cover"
                                                    />
                                                </View>
                                            ))}
                                        </Animated.View>
                                    </View>

                                    {/* caption */}
                                    <Text style={styles.caption}>CURATING YOUR COLLECTION</Text>

                                    {/* progress bar */}
                                    <View style={styles.progressTrack}>
                                        <Animated.View
                                            style={[styles.progressFill, { width: progressWidth }]}
                                        />
                                    </View>

                                    {/* 3 dots */}
                                    <View style={styles.dots}>
                                        {[0, 1, 2].map(i => (
                                            <View
                                                key={i}
                                                style={[styles.dot, dotIdx === i && styles.dotActive]}
                                            />
                                        ))}
                                    </View>

                                </View>

                            </Animated.View>
                        )}
                    </View>
                </AuthProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const SPLASH_BG = '#F9F6F0';   // very light cream/off-white to match image
const SKY       = '#5DADE2';   // sky blue accent
const SKY_STRIP = '#D6EAF8';   // soft sky blue for the bottom strip

const styles = StyleSheet.create({
    root: { flex: 1 },

    splash: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: SPLASH_BG,
        zIndex: 999,
        flexDirection: 'column',
        alignItems: 'stretch',
    },

    // ── Logo area (takes ~60% of screen height) ───────────────────────────────
    logoArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 20,
    },
    brandName: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontStyle: 'italic',
        fontSize: 60,
        letterSpacing: 4,
        color: '#14142A',
        lineHeight: 70,
    },
    brandRule: {
        width: 100,
        height: 1.5,
        backgroundColor: SKY,
        marginTop: 10,
        marginBottom: 10,
    },
    brandTagline: {
        fontSize: 11,
        letterSpacing: 5,
        color: '#7EA8C4',
        fontWeight: '400',
    },

    // ── Bottom strip ──────────────────────────────────────────────────────────
    bottomStrip: {
        paddingTop: 18,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        alignItems: 'center',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },

    // ── Carousel ──────────────────────────────────────────────────────────────
    carouselWrap: {
        width: SW,
        height: CARD_H,
        overflow: 'hidden',
        marginBottom: 14,
    },
    carouselStrip: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        gap: CARD_GAP,
    },
    carouselCard: {
        width: CARD_W,
        height: CARD_H,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    carouselImg: {
        width: '100%',
        height: '100%',
    },

    caption: {
        fontSize: 9,
        letterSpacing: 4,
        color: '#4A8EAF',
        fontWeight: '500',
        marginBottom: 12,
    },

    // ── Progress ──────────────────────────────────────────────────────────────
    progressTrack: {
        width: 180,
        height: 3,
        borderRadius: 999,
        backgroundColor: '#B3D4EA',
        overflow: 'hidden',
        marginBottom: 14,
    },
    progressFill: {
        height: '100%',
        backgroundColor: SKY,
        borderRadius: 999,
    },

    // ── Dots ──────────────────────────────────────────────────────────────────
    dots: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#9AC8E0',
    },
    dotActive: {
        backgroundColor: SKY,
        width: 18,
        borderRadius: 3,
    },
});
