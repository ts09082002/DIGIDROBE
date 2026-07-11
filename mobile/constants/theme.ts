import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * VibeCheck Design System
 * Premium digital wardrobe app — Champagne Gold on clean linens, refined Soft UI
 */

// ── Raw Palette ──────────────────────────────────────────────────────────────

export const Colors = {
    // Primary brand accent — Dusty Rose (premium wardrobe / fashion-forward)
    gold: '#A0627A',
    goldLight: '#F9EFF2',
    goldDark: '#7B4560',
    amber: '#A0627A',
    amberLight: '#F9EFF2',

    // Clean neutrals
    white: '#FFFFFF',
    cream: '#F8F7F4',           // Clean Linen — breathable background
    warmGray: '#F2F2F0',        // Very light grey
    lightGray: '#EBEBEB',       // Subtle border
    mediumGray: '#94A3B8',      // Muted Slate
    darkGray: '#64748B',        // Cool Slate
    charcoal: '#1A1A1A',        // Near Black
    dark: '#111116',            // Deep Onyx
    black: '#000000',

    // Status
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Card backgrounds
    cardBg: '#FFFFFF',
    cardBgAlt: '#F8F7F4',
    overlayBg: 'rgba(26,26,26,0.5)',

    // Category colors
    categoryActive: '#F9EFF2',
    categoryBorder: '#A0627A',
};

// ── Semantic Light / Dark Palettes ───────────────────────────────────────────

export const LightColors = {
    background: '#F8F7F4',           // Clean Linen — airy and breathable
    backgroundElevated: '#FFFFFF',
    surface: '#FFFFFF',              // Pure white cards
    surfacePressed: '#F2F2F0',       // Subtle press state
    card: '#FFFFFF',
    border: '#EBEBEB',               // Feather-light border
    borderStrong: '#D4D4D8',
    textPrimary: '#1A1A1A',          // Near-black — 100% legible
    textSecondary: '#64748B',        // Cool Slate — clear secondary
    textMuted: '#94A3B8',            // Muted Slate
    textInverse: '#FFFFFF',
    iconDefault: '#94A3B8',
    iconBtnBg: '#FFFFFF',
    accent: '#A0627A',               // Dusty Rose
    accentLight: '#F9EFF2',          // Soft rose tint
    accentText: '#FFFFFF',
    skeleton: '#EBEBEB',
    skeletonHighlight: '#F2F2F0',
    tabBar: 'rgba(255, 255, 255, 0.92)',
    tabBarBorder: 'transparent',
    statusBar: 'dark' as const,
};

export const DarkColors = {
    background: '#0E0E12',           // Deep Onyx — rich dark
    backgroundElevated: '#18181E',
    surface: '#18181E',              // Elevated dark surface
    surfacePressed: '#222230',       // Active press
    card: '#18181E',
    border: '#2A2A35',               // Subtle dark border
    borderStrong: '#3A3A48',
    textPrimary: '#F0F0F0',          // Bright off-white — 100% legible on dark
    textSecondary: '#B0B0C0',        // Visible muted — no dark-on-dark
    textMuted: '#7A7A90',            // Still readable against dark surfaces
    textInverse: '#0E0E12',
    iconDefault: '#B0B0C0',
    iconBtnBg: '#222230',
    accent: '#C07A90',               // Dusty Rose — slightly lighter in dark mode for pop
    accentLight: '#2D1820',          // Deep rose tint
    accentText: '#FFFFFF',
    skeleton: '#2A2A35',
    skeletonHighlight: '#3A3A48',
    tabBar: 'rgba(18, 18, 24, 0.92)',
    tabBarBorder: 'transparent',
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
        color: Colors.charcoal,
        letterSpacing: -0.5,
    },
    heading2: {
        fontSize: 22,
        fontWeight: '700' as const,
        fontFamily: FontFamily.heading,
        color: Colors.charcoal,
        letterSpacing: -0.3,
    },
    heading3: {
        fontSize: 18,
        fontWeight: '600' as const,
        fontFamily: FontFamily.headingMedium,
        color: Colors.charcoal,
    },
    subtitle: {
        fontSize: 11,
        fontWeight: '600' as const,
        fontFamily: FontFamily.bodySemiBold,
        color: Colors.darkGray,
        letterSpacing: 1.4,
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
        fontSize: 11,
        fontWeight: '600' as const,
        fontFamily: FontFamily.bodySemiBold,
        color: Colors.darkGray,
        letterSpacing: 1.2,
        textTransform: 'uppercase' as const,
    },
};

// ── Spacing — enterprise-grade 16/24px gutters ────────────────────────────────

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
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    round: 50,
};

// ── Shadows — ultra-soft, premium depth ──────────────────────────────────────

export const Shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 5,
    },
};

// ── API Base URL ─────────────────────────────────────────────────────────────

function resolveApiBaseUrl(): string {
    const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
    if (envBaseUrl) {
        if (!__DEV__ && envBaseUrl.startsWith('http://')) {
            return envBaseUrl.replace('http://', 'https://');
        }
        return envBaseUrl;
    }

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
