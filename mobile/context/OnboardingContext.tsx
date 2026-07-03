import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const HAS_SEEN_ONBOARDING_KEY = '@vibecheck_has_seen_onboarding';

export type LayoutRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type OnboardingContextType = {
    currentStep: number;
    isVisible: boolean;
    anchors: Record<string, LayoutRect>;
    registerAnchor: (name: string, rect: LayoutRect) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipOnboarding: () => void;
    startOnboarding: () => void;
};

export const OnboardingContext = createContext<OnboardingContextType>({
    currentStep: 0,
    isVisible: false,
    anchors: {},
    registerAnchor: () => {},
    nextStep: () => {},
    prevStep: () => {},
    skipOnboarding: () => {},
    startOnboarding: () => {},
});

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [anchors, setAnchors] = useState<Record<string, LayoutRect>>({});
    const router = useRouter();

    // Check if user has seen onboarding on mount
    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const hasSeen = await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY);
                if (hasSeen !== 'true') {
                    setIsVisible(true);
                }
            } catch (e) {
                console.warn('Failed to check onboarding status', e);
            }
        };
        checkOnboarding();
    }, []);

    const registerAnchor = useCallback((name: string, rect: LayoutRect) => {
        setAnchors(prev => ({ ...prev, [name]: rect }));
    }, []);

    const nextStep = useCallback(() => {
        setCurrentStep(prev => {
            const next = prev + 1;
            // Screen transitions based on step progression
            if (next === 3) {
                // Navigate to Outfits screen for Step 3
                router.push('/(tabs)/outfits');
            } else if (next === 4) {
                // Navigate to Home screen for Step 4
                router.push('/(tabs)');
            } else if (next > 4) {
                // Completed
                setIsVisible(false);
                AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, 'true');
            }
            return next;
        });
    }, [router]);

    const prevStep = useCallback(() => {
        setCurrentStep(prev => {
            const next = Math.max(0, prev - 1);
            // Reverse transitions if user goes back
            if (next === 0 || next === 1 || next === 2) {
                router.push('/(tabs)/wardrobe');
            } else if (next === 3) {
                router.push('/(tabs)/outfits');
            }
            return next;
        });
    }, [router]);

    const skipOnboarding = useCallback(async () => {
        setIsVisible(false);
        try {
            await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, 'true');
        } catch (e) {
            console.warn('Failed to save onboarding completion', e);
        }
    }, []);

    const startOnboarding = useCallback(async () => {
        setCurrentStep(0);
        setIsVisible(true);
        try {
            await AsyncStorage.removeItem(HAS_SEEN_ONBOARDING_KEY);
        } catch (e) {
            console.warn('Failed to clear onboarding state', e);
        }
        router.push('/(tabs)/wardrobe');
    }, [router]);

    return (
        <OnboardingContext.Provider
            value={{
                currentStep,
                isVisible,
                anchors,
                registerAnchor,
                nextStep,
                prevStep,
                skipOnboarding,
                startOnboarding,
            }}
        >
            {children}
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = () => useContext(OnboardingContext);
