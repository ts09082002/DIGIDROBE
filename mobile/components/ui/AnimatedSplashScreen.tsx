import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Image } from 'react-native';
import { Colors, FontFamily } from '../../constants/theme';
import { useFonts, Cormorant_600SemiBold, Cormorant_700Bold } from '@expo-google-fonts/cormorant';
import { Montserrat_400Regular, Montserrat_500Medium } from '@expo-google-fonts/montserrat';

const { width, height } = Dimensions.get('window');

interface Props {
    onFinish: () => void;
}

export default function AnimatedSplashScreen({ onFinish }: Props) {
    // Animate the whole brand name as one unit + subtitle separately
    const logoOpacity    = useRef(new Animated.Value(0)).current;
    const brandOpacity   = useRef(new Animated.Value(0)).current;
    const brandY         = useRef(new Animated.Value(18)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const footerOpacity  = useRef(new Animated.Value(0)).current;
    const screenOpacity  = useRef(new Animated.Value(1)).current;

    const [fontsLoaded] = useFonts({
        Cormorant_600SemiBold,
        Cormorant_700Bold,
        Montserrat_400Regular,
        Montserrat_500Medium,
    });

    useEffect(() => {
        if (!fontsLoaded) return;

        Animated.sequence([
            // 1. Diamond icon fades in
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 450,
                delay: 150,
                useNativeDriver: true,
            }),
            // 2. Brand name rises and fades in elegantly
            Animated.parallel([
                Animated.timing(brandOpacity, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(brandY, {
                    toValue: 0,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ]),
            // 3. Subtitle + footer fade in
            Animated.parallel([
                Animated.timing(subtitleOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(footerOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
            // 4. Hold
            Animated.delay(1400),
            // 5. Fade out
            Animated.timing(screenOpacity, {
                toValue: 0,
                duration: 450,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onFinish();
        });
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return <View style={styles.container} />;
    }

    return (
        <Animated.View style={[styles.container, { opacity: screenOpacity }]} pointerEvents="auto">

            {/* App logo */}
            <Animated.View style={[styles.iconWrap, { opacity: logoOpacity }]}>
                <Image
                    source={require('../../assets/splash.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* Brand name block */}
            <Animated.View
                style={[
                    styles.brandBlock,
                    {
                        opacity: brandOpacity,
                        transform: [{ translateY: brandY }],
                    },
                ]}
            >
                {/* VIBE in accent, CHECK in dark — split word for tonal contrast */}
                <View style={styles.brandRow}>
                    <Text style={[styles.brandWord, styles.brandAccent]}>VIBE</Text>
                    <Text style={[styles.brandWord, styles.brandDark]}>CHECK</Text>
                </View>
                <Animated.View style={[styles.subtitleRow, { opacity: subtitleOpacity }]}>
                    <View style={styles.subtitleLine} />
                    <Text style={styles.subtitleText}>THE DIGITAL WARDROBE</Text>
                    <View style={styles.subtitleLine} />
                </Animated.View>
            </Animated.View>

            {/* Footer */}
            <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
                <View style={styles.footerLine} />
                <Text style={styles.footerText}>CURATED BY AI</Text>
                <Text style={styles.footerGlyph}>✦</Text>
            </Animated.View>
        </Animated.View>
    );
}

const ACCENT = Colors.gold; // Dusty Rose — matches new theme

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.cream,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },

    /* Logo */
    iconWrap: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
    },
    logoImage: {
        width: 160,
        height: 160,
    },

    /* Brand block */
    brandBlock: {
        alignItems: 'center',
        paddingHorizontal: 32,       // breathing room on small screens
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        marginBottom: 14,
    },
    brandWord: {
        fontFamily: FontFamily.heading,
        fontSize: 44,
        fontWeight: '700',
        fontStyle: 'italic',
        letterSpacing: 3,
    },
    brandAccent: {
        color: ACCENT,
    },
    brandDark: {
        color: Colors.charcoal,
    },

    /* Subtitle */
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    subtitleLine: {
        width: 28,
        height: 1,
        backgroundColor: Colors.lightGray,
    },
    subtitleText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: 10,
        letterSpacing: 2.5,
        color: Colors.darkGray,
    },

    /* Footer */
    footer: {
        position: 'absolute',
        bottom: height * 0.08,
        alignItems: 'center',
    },
    footerLine: {
        width: 48,
        height: 1,
        backgroundColor: ACCENT,
        marginBottom: 10,
        opacity: 0.6,
    },
    footerText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: 9,
        letterSpacing: 3.5,
        color: Colors.darkGray,
        marginBottom: 8,
    },
    footerGlyph: {
        fontSize: 14,
        color: ACCENT,
        opacity: 0.7,
    },
});
