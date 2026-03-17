import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * DGDORDE Design System
 * Premium luxury wardrobe app — gold accents, soft neutrals, clean typography
 */

export const Colors = {
    // Primary — Sky Blue palette
    gold: '#5DADE2',          // was gold, now sky blue primary
    goldLight: '#AED6F1',     // was goldLight, now light sky blue
    goldDark: '#2E86C1',      // was goldDark, now deeper sky blue
    amber: '#5DADE2',         // unified to sky blue
    amberLight: '#AED6F1',

    // Neutrals
    white: '#FFFFFF',
    cream: '#EBF5FB',         // sky-tinted cream
    warmGray: '#F4F9FD',      // sky-tinted warm gray
    lightGray: '#E3F0F9',     // sky-tinted light gray
    mediumGray: '#B0B0B0',
    darkGray: '#6B6B6B',
    charcoal: '#333333',
    dark: '#1A1A2E',
    black: '#000000',

    // Status
    success: '#4CAF50',
    error: '#E53935',
    warning: '#FF9800',
    info: '#2196F3',

    // Card backgrounds
    cardBg: '#FFFFFF',
    cardBgAlt: '#F0F7FC',
    overlayBg: 'rgba(0,0,0,0.5)',

    // Category colors
    categoryActive: '#D6EAF8',   // light sky blue
    categoryBorder: '#5DADE2',   // sky blue
};

export const Typography = {
    heading1: {
        fontSize: 28,
        fontWeight: '700' as const,
        color: Colors.dark,
        letterSpacing: -0.5,
    },
    heading2: {
        fontSize: 22,
        fontWeight: '700' as const,
        color: Colors.dark,
        letterSpacing: -0.3,
    },
    heading3: {
        fontSize: 18,
        fontWeight: '600' as const,
        color: Colors.dark,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: Colors.darkGray,
        letterSpacing: 1.2,
        textTransform: 'uppercase' as const,
    },
    body: {
        fontSize: 15,
        fontWeight: '400' as const,
        color: Colors.charcoal,
        lineHeight: 22,
    },
    bodySmall: {
        fontSize: 13,
        fontWeight: '400' as const,
        color: Colors.darkGray,
    },
    caption: {
        fontSize: 11,
        fontWeight: '500' as const,
        color: Colors.mediumGray,
        letterSpacing: 0.5,
    },
    button: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: Colors.white,
    },
    label: {
        fontSize: 12,
        fontWeight: '500' as const,
        color: Colors.darkGray,
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    round: 50,
};

export const Shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
};

function resolveApiBaseUrl(): string {
    const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
    if (envBaseUrl) return envBaseUrl;

    const hostUri =
        (Constants.expoConfig as any)?.hostUri ||
        (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
        '';
    const host = hostUri.split(':')[0];

    if (host) return `http://${host}:3000`;
    if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
    return 'http://localhost:3000';
}

export const API_BASE_URL = resolveApiBaseUrl();
