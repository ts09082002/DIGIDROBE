import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions } from 'react-native';
import { Colors, FontFamily } from '../../constants/theme';
import { useFonts, Cormorant_600SemiBold, Cormorant_700Bold } from '@expo-google-fonts/cormorant';
import { Montserrat_400Regular, Montserrat_500Medium } from '@expo-google-fonts/montserrat';

const { width, height } = Dimensions.get('window');

interface Props {
    onFinish: () => void;
}

export default function AnimatedSplashScreen({ onFinish }: Props) {
    const letters = 'VIBECHECK'.split('');
    const letterAnims = useRef(letters.map(() => new Animated.Value(0))).current;
    
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const footerOpacity = useRef(new Animated.Value(0)).current;
    const screenOpacity = useRef(new Animated.Value(1)).current;

    const [fontsLoaded] = useFonts({
        Cormorant_600SemiBold,
        Cormorant_700Bold,
        Montserrat_400Regular,
        Montserrat_500Medium,
    });

    useEffect(() => {
        if (!fontsLoaded) return;

        // Intro animation sequence
        const letterAnimations = letterAnims.map(anim => 
            Animated.timing(anim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            })
        );

        Animated.sequence([
            // 1. Fade in the diamond logo
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 400,
                delay: 200,
                useNativeDriver: true,
            }),
            // 2. Stagger in the letters D-R-O-B-E-O
            Animated.stagger(120, letterAnimations),
            // 3. Fade in subtitle & footer
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
                })
            ]),
            // 4. Wait for a moment to let user read
            Animated.delay(1200),
            // 5. Fade out entire screen
            Animated.timing(screenOpacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            })
        ]).start(() => {
            onFinish();
        });

    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return <View style={styles.container} />; // Plain bg while loading
    }

    return (
        <Animated.View style={[styles.container, { opacity: screenOpacity }]} pointerEvents="auto">
            {/* Top Logo Section */}
            <View style={styles.topSection}>
                <Animated.View style={[styles.diamondWrapper, { opacity: logoOpacity }]}>
                    <View style={styles.diamond} />
                    <Text style={styles.diamondText}>V</Text>
                </Animated.View>
            </View>

            {/* Middle Brand Section */}
            <View style={styles.middleSection}>
                <View style={styles.lettersContainer}>
                    {letters.map((char, index) => {
                        return (
                            <Animated.Text 
                                key={index} 
                                style={[
                                    styles.brandLetter, 
                                    { 
                                        opacity: letterAnims[index],
                                        transform: [{
                                            translateY: letterAnims[index].interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [10, 0]
                                            })
                                        }]
                                    }
                                ]}
                            >
                                {char}
                            </Animated.Text>
                        );
                    })}
                </View>

                <Animated.View style={[styles.subtitleContainer, { opacity: subtitleOpacity }]}>
                    <View style={styles.subtitleLine} />
                    <Text style={styles.subtitleText}>THE DIGITAL WARDROBE</Text>
                    <View style={styles.subtitleLine} />
                </Animated.View>
            </View>

            {/* Bottom Footer Section */}
            <Animated.View style={[styles.footerSection, { opacity: footerOpacity }]}>
                <View style={styles.footerLine} />
                <Text style={styles.footerText}>CURATED BY AI</Text>
                <Text style={styles.footerInfinity}>∞</Text>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.cream, // Warm Alabaster
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    topSection: {
        position: 'absolute',
        top: height * 0.35,
        alignItems: 'center',
    },
    diamondWrapper: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    diamond: {
        position: 'absolute',
        width: 36,
        height: 36,
        backgroundColor: Colors.gold, // Maroon Red
        transform: [{ rotate: '45deg' }],
    },
    diamondText: {
        color: Colors.white,
        fontFamily: FontFamily.heading,
        fontSize: 20,
        fontWeight: '500',
    },
    middleSection: {
        alignItems: 'center',
        marginTop: height * 0.15,
    },
    lettersContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    brandLetter: {
        fontSize: 36,
        fontFamily: FontFamily.heading,
        fontWeight: '500',
        color: Colors.gold, // Maroon Red
        letterSpacing: 3,
    },
    subtitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    subtitleLine: {
        width: 30,
        height: 1,
        backgroundColor: Colors.lightGray,
    },
    subtitleText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: 12,
        letterSpacing: 2,
        color: Colors.amber, // Denim Blue
    },
    footerSection: {
        position: 'absolute',
        bottom: height * 0.08,
        alignItems: 'center',
    },
    footerLine: {
        width: 60,
        height: 1,
        backgroundColor: Colors.gold, // Maroon Red
        marginBottom: 12,
    },
    footerText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: 10,
        letterSpacing: 3,
        color: Colors.amber, // Denim Blue
        marginBottom: 20,
    },
    footerInfinity: {
        fontSize: 18,
        color: Colors.amber,
    },
});
