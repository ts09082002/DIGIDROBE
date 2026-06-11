import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, TouchableOpacity, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const HAS_SEEN_ONBOARDING_KEY = '@vibecheck_has_seen_onboarding';

export default function OnboardingOverlay() {
    const [isVisible, setIsVisible] = useState(false);
    const { colors: tc, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    
    // Animation values
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const hasSeen = await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY);
                if (hasSeen !== 'true') {
                    // Show onboarding after a short delay so the main screen can render
                    setTimeout(() => {
                        setIsVisible(true);
                        Animated.timing(fadeAnim, {
                            toValue: 1,
                            duration: 500,
                            useNativeDriver: true,
                        }).start();
                    }, 500);
                }
            } catch (e) {
                console.warn('Failed to check onboarding status', e);
            }
        };
        
        checkOnboarding();
    }, []);

    const handleDismiss = async () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(async () => {
            setIsVisible(false);
            try {
                await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, 'true');
            } catch (e) {
                console.warn('Failed to save onboarding status', e);
            }
        });
    };

    if (!isVisible) return null;

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="none"
            onRequestClose={handleDismiss}
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                {/* Visual cutout/pointer effect toward the Add button (which is typically top right in Wardrobe) */}
                <View style={[styles.pointer, { top: insets.top + 10 }]} />
                
                <View style={[styles.card, { backgroundColor: tc.surface }]}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="sparkles" size={32} color={tc.accent} />
                    </View>
                    
                    <Text style={[styles.title, { color: tc.textPrimary }]}>
                        Welcome to VibeCheck!
                    </Text>
                    
                    <Text style={[styles.description, { color: tc.textSecondary }]}>
                        Let's build your digital wardrobe. Tap the <Text style={{fontWeight: 'bold', color: tc.textPrimary}}>+</Text> button to add your first items.
                    </Text>

                    <View style={styles.featureList}>
                        <View style={styles.featureItem}>
                            <Ionicons name="images-outline" size={20} color={tc.textSecondary} style={styles.featureIcon} />
                            <Text style={[styles.featureText, { color: tc.textSecondary }]}>Upload up to 15 photos at once</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="color-wand-outline" size={20} color={tc.textSecondary} style={styles.featureIcon} />
                            <Text style={[styles.featureText, { color: tc.textSecondary }]}>AI removes backgrounds automatically</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="pricetag-outline" size={20} color={tc.textSecondary} style={styles.featureIcon} />
                            <Text style={[styles.featureText, { color: tc.textSecondary }]}>Smart auto-categorization</Text>
                        </View>
                    </View>
                    
                    <TouchableOpacity 
                        style={[styles.button, { backgroundColor: tc.accent }]}
                        onPress={handleDismiss}
                    >
                        <Text style={styles.buttonText}>Get Started</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    pointer: {
        position: 'absolute',
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#fff',
        borderStyle: 'dashed',
    },
    card: {
        width: '100%',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Cormorant_700Bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        fontFamily: 'Montserrat_400Regular',
        textAlign: 'center',
        marginBottom: 24,
    },
    featureList: {
        width: '100%',
        marginBottom: 28,
        paddingHorizontal: 8,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureIcon: {
        marginRight: 12,
        width: 24,
        textAlign: 'center',
    },
    featureText: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
        flex: 1,
    },
    button: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
});
