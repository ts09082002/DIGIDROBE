import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * DROBEO Design System
 * Premium luxury wardrobe app — warm gold on stone neutrals, refined typography
 */

// ── Raw Palette ──────────────────────────────────────────────────────────────

export const Colors = {
    // Primary (warm gold)
    gold: '#CA8A04',
    goldLight: '#FDE68A',
    goldDark: '#A16207',
    amber: '#F59E0B',
    amberLight: '#FCD34D',

    // Stone neutrals
    white: '#FFFFFF',
    cream: '#F5F5F4',        // stone-100
    warmGray: '#FAFAF9',     // stone-50
    lightGray: '#E7E5E4',    // stone-200
    mediumGray: '#A8A29E',   // stone-400
    darkGray: '#78716C',     // stone-500
    charcoal: '#1C1917',     // stone-900
    dark: '#1C1917',         // stone-900
    black: '#000000',

    // Status
    success: '#16A34A',      // green-600
    error: '#DC2626',        // red-600
    warning: '#F59E0B',      // amber-500
    info: '#2563EB',         // blue-600

    // Card backgrounds
    cardBg: '#FFFFFF',
    cardBgAlt: '#FAFAF9',
    overlayBg: 'rgba(0,0,0,0.5)',

    // Category colors
    categoryActive: '#FEF3C7',   // amber-100
    categoryBorder: '#CA8A04',
};

// ── Semantic Light / Dark Palettes ───────────────────────────────────────────

export const LightColors = {
    background: '#FAFAF9',       // stone-50
    backgroundElevated: '#FFFFFF',
    surface: '#F5F5F4',          // stone-100
    surfacePressed: '#E7E5E4',   // stone-200
    card: '#FFFFFF',
    border: '#E7E5E4',           // stone-200
    borderStrong: '#D6D3D1',     // stone-300
    textPrimary: '#1C1917',      // stone-900
    textSecondary: '#78716C',    // stone-500
    textMuted: '#A8A29E',        // stone-400
    textInverse: '#FAFAF9',
    iconDefault: '#78716C',      // stone-500
    iconBtnBg: '#FFFFFF',
    accent: '#CA8A04',
    accentLight: '#FEF3C7',      // amber-100
    accentText: '#92400E',       // amber-800
    skeleton: '#E7E5E4',
    skeletonHighlight: '#F5F5F4',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E7E5E4',
    statusBar: 'dark' as const,
};

export const DarkColors = {
    background: '#1C1917',       // stone-900
    backgroundElevated: '#292524', // stone-800
    surface: '#292524',          // stone-800
    surfacePressed: '#44403C',   // stone-700
    card: '#292524',
    border: '#44403C',           // stone-700
    borderStrong: '#57534E',     // stone-600
    textPrimary: '#FAFAF9',      // stone-50
    textSecondary: '#A8A29E',    // stone-400
    textMuted: '#78716C',        // stone-500
    textInverse: '#1C1917',
    iconDefault: '#A8A29E',      // stone-400
    iconBtnBg: '#44403C',
    accent: '#CA8A04',
    accentLight: '#451A03',      // amber-950 (subtle on dark)
    accentText: '#FDE68A',
    skeleton: '#44403C',
    skeletonHighlight: '#57534E',
    tabBar: '#1C1917',
    tabBarBorder: '#44403C',
    statusBar: 'light' as const,
};

export type SemanticColors = Omit<typeof LightColors, 'statusBar'> & { statusBar: 'dark' | 'light' };

// ── Font Families ────────────────────────────────────────────────────────────

export const FontFamily = {
    heading: 'Cormorant_700Bold',
    headingMedium: 'Cormorant_600SemiBold',
    body: 'Montserrat_400Regular',
    bodyMedium: 'Montserrat_500Medium',
    bodySemiBold: 'Montserrat_600SemiBold',
    bodyBold: 'Montserrat_700Bold',
};

// ── Typography ───────────────────────────────────────────────────────────────

export const Typography = {
    heading1: {
        fontSize: 28,
        fontWeight: '700' as const,
        fontFamily: FontFamily.heading,
        color: Colors.dark,
        letterSpacing: -0.5,
    },
    heading2: {
        fontSize: 22,
        fontWeight: '700' as const,
        fontFamily: FontFamily.heading,
        color: Colors.dark,
        letterSpacing: -0.3,
    },
    heading3: {
        fontSize: 18,
        fontWeight: '600' as const,
        fontFamily: FontFamily.headingMedium,
        color: Colors.dark,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '600' as const,
        fontFamily: FontFamily.bodySemiBold,
        color: Colors.darkGray,
        letterSpacing: 1.2,
        textTransform: 'uppercase' as const,
    },
    body: {
        fontSize: 15,
        fontWeight: '400' as const,
        fontFamily: FontFamily.body,
        color: Colors.charcoal,
        lineHeight: 22,
    },
    bodySmall: {
        fontSize: 14,
        fontWeight: '400' as const,
        fontFamily: FontFamily.body,
        color: Colors.darkGray,
    },
    caption: {
        fontSize: 12,
        fontWeight: '500' as const,
        fontFamily: FontFamily.bodyMedium,
        color: Colors.mediumGray,
        letterSpacing: 0.5,
    },
    button: {
        fontSize: 16,
        fontWeight: '600' as const,
        fontFamily: FontFamily.bodySemiBold,
        color: Colors.white,
    },
    label: {
        fontSize: 12,
        fontWeight: '500' as const,
        fontFamily: FontFamily.bodyMedium,
        color: Colors.darkGray,
    },
};

// ── Spacing ──────────────────────────────────────────────────────────────────

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

// ── Border Radius ────────────────────────────────────────────────────────────

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    round: 50,
};

// ── Shadows ──────────────────────────────────────────────────────────────────

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

// ── API Base URL ─────────────────────────────────────────────────────────────

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
