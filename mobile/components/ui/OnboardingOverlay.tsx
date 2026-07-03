import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const STEPS_DATA = [
    {
        title: 'Meet VibeCheck',
        description: "Let’s turn your physical closet into a smart, weather-ready digital wardrobe. Ready to level up your style?",
        anchorKey: null,
        verb: 'Let\'s Go'
    },
    {
        title: 'Add Your First Item',
        description: 'Tap the + button to snap or upload your first clothing item.',
        anchorKey: 'wardrobe_add',
        verb: 'Tap'
    },
    {
        title: 'On-Device AI Magic',
        description: 'Watch the AI instantly clear your photo’s background and auto-tag its category.',
        anchorKey: 'wardrobe_processing',
        verb: 'Watch'
    },
    {
        title: 'Mix & Match',
        description: 'Swipe right to love an outfit, or left to skip to new styles.',
        anchorKey: 'outfits_swiper',
        verb: 'Swipe'
    },
    {
        title: 'Daily Wear',
        description: 'Check your daily recommendation, perfectly matched to the local real-time weather.',
        anchorKey: 'home_sotd',
        verb: 'Check'
    }
];

export default function OnboardingOverlay() {
    const { colors: tc } = useTheme();
    const insets = useSafeAreaInsets();
    const {
        currentStep,
        isVisible,
        anchors,
        nextStep,
        prevStep,
        skipOnboarding
    } = useOnboarding();

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isVisible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [isVisible, currentStep]);

    if (!isVisible) return null;

    const stepData = STEPS_DATA[currentStep];
    const anchor = stepData.anchorKey ? anchors[stepData.anchorKey] : null;

    // Determine tooltip position dynamically based on spotlight anchor
    let tooltipStyle: any = styles.centeredTooltip;
    if (anchor) {
        const isAnchorInBottomHalf = anchor.y > screenHeight / 2;
        if (isAnchorInBottomHalf) {
            // Place tooltip above the anchor
            tooltipStyle = {
                position: 'absolute',
                bottom: screenHeight - anchor.y + 16,
                left: 16,
                right: 16,
            };
        } else {
            // Place tooltip below the anchor
            tooltipStyle = {
                position: 'absolute',
                top: anchor.y + anchor.height + 16,
                left: 16,
                right: 16,
            };
        }
    }

    return (
        <Modal transparent visible={isVisible} animationType="none" onRequestClose={skipOnboarding}>
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                
                {/* DRAW CUTOUT BACKDROP */}
                {anchor ? (
                    <>
                        {/* Top panel */}
                        <View style={[styles.backdropPanel, { top: 0, left: 0, right: 0, height: anchor.y }]} />
                        {/* Left panel */}
                        <View style={[styles.backdropPanel, { top: anchor.y, left: 0, width: anchor.x, height: anchor.height }]} />
                        {/* Right panel */}
                        <View style={[styles.backdropPanel, { top: anchor.y, left: anchor.x + anchor.width, right: 0, height: anchor.height }]} />
                        {/* Bottom panel */}
                        <View style={[styles.backdropPanel, { top: anchor.y + anchor.height, left: 0, right: 0, bottom: 0 }]} />
                        
                        {/* Spotlight dashed border indicator */}
                        <View style={[
                            styles.spotlight, 
                            { 
                                top: anchor.y - 6, 
                                left: anchor.x - 6, 
                                width: anchor.width + 12, 
                                height: anchor.height + 12,
                                borderColor: tc.accent,
                                borderRadius: anchor.width === anchor.height ? (anchor.width + 12) / 2 : 12
                            }
                        ]} />
                    </>
                ) : (
                    // Full screen translucent dark background for step 0 (welcome modal)
                    <View style={[styles.fullBackdrop]} />
                )}

                {/* SKIP ESCAPE HATCH */}
                <TouchableOpacity 
                    style={[styles.skipButton, { top: insets.top + 12 }]} 
                    onPress={skipOnboarding}
                >
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>

                {/* TOOLTIP DIALOG CARD */}
                <View style={[tooltipStyle, styles.card, { backgroundColor: tc.surface }]}>
                    <View style={styles.headerRow}>
                        <View style={[styles.badge, { backgroundColor: tc.accent + '20' }]}>
                            <Text style={[styles.badgeText, { color: tc.accent }]}>
                                {currentStep === 0 ? 'VIBECHECK' : `STEP ${currentStep} OF 4`}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.title, { color: tc.textPrimary }]}>
                        {stepData.title}
                    </Text>

                    <Text style={[styles.description, { color: tc.textSecondary }]}>
                        {stepData.description}
                    </Text>

                    {/* Progress indicators (Dots) */}
                    <View style={styles.progressRow}>
                        {STEPS_DATA.map((_, index) => (
                            <View 
                                key={index} 
                                style={[
                                    styles.dot, 
                                    { 
                                        backgroundColor: index === currentStep ? tc.accent : tc.border,
                                        width: index === currentStep ? 16 : 6,
                                    }
                                ]} 
                            />
                        ))}
                    </View>

                    {/* Action buttons */}
                    <View style={styles.buttonRow}>
                        {currentStep > 0 && (
                            <TouchableOpacity 
                                style={[styles.navButton, { borderColor: tc.border, borderWidth: 1 }]}
                                onPress={prevStep}
                            >
                                <Text style={[styles.navButtonText, { color: tc.textSecondary }]}>Back</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={[
                                styles.primaryButton, 
                                { 
                                    backgroundColor: tc.accent,
                                    flex: currentStep > 0 ? 1 : 0,
                                    width: currentStep === 0 ? '100%' : 'auto',
                                }
                            ]}
                            onPress={nextStep}
                        >
                            <Text style={styles.primaryButtonText}>
                                {currentStep === 0 ? 'Let\'s Go' : currentStep === 4 ? 'Finish' : 'Next'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    backdropPanel: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    spotlight: {
        position: 'absolute',
        borderWidth: 2.5,
        borderStyle: 'dashed',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 8,
    },
    skipButton: {
        position: 'absolute',
        right: 20,
        padding: 8,
        zIndex: 999,
    },
    skipText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
    },
    centeredTooltip: {
        width: screenWidth - 32,
        alignSelf: 'center',
    },
    card: {
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    headerRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        fontFamily: 'Montserrat_700Bold',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Cormorant_700Bold',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'Montserrat_400Regular',
        marginBottom: 20,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    dot: {
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    navButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navButtonText: {
        fontSize: 14,
        fontFamily: 'Montserrat_600SemiBold',
    },
    primaryButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Montserrat_600SemiBold',
    },
});
