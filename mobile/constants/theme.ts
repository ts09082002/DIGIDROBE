/**
 * DGDORDE Design System
 * Premium luxury wardrobe app — gold accents, soft neutrals, clean typography
 */

export const Colors = {
    // Primary
    gold: '#C9A84C',
    goldLight: '#E8D5A0',
    goldDark: '#A88B3C',
    amber: '#F5A623',
    amberLight: '#FFD580',

    // Neutrals
    white: '#FFFFFF',
    cream: '#F5F0E8',
    warmGray: '#F8F6F3',
    lightGray: '#EDEDED',
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
    cardBgAlt: '#FAF8F5',
    overlayBg: 'rgba(0,0,0,0.5)',

    // Category colors
    categoryActive: '#FFF3D6',
    categoryBorder: '#C9A84C',
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

export const API_BASE_URL = 'http://192.168.4.104:3000'; // Updated to match local network IP
