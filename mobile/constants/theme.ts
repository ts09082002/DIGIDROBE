import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * DROBEO Design System
 * Premium luxury wardrobe app — warm gold on stone neutrals, refined typography
 */

// ── Raw Palette ──────────────────────────────────────────────────────────────

export const Colors = {
    // Primary (now mapping to Swiggy-inspired Slate Green for backward compatibility)
    gold: '#627D72',         // Desaturated Slate Green
    goldLight: '#E8F0EC',    // Very light slate green
    goldDark: '#4A6158',     // Darker Slate Green
    amber: '#627D72',        // Also mapped to Slate Green to unify action areas
    amberLight: '#E8F0EC',   
    
    // Stone neutrals
    white: '#FFFFFF',        // Pure White
    cream: '#FAF6F2',        // Warm Oatmeal
    warmGray: '#F3F4F6',     // Very light grey
    lightGray: '#E5E7EB',    // Gray 200
    mediumGray: '#9CA3AF',   // Muted Pebble Grey
    darkGray: '#6B7280',     // Mist Grey
    charcoal: '#212121',     // Ink Charcoal
    dark: '#111827',         // Gray 900
    black: '#000000',

    // Status
    success: '#10B981',      
    error: '#EF4444',        
    warning: '#F59E0B',      
    info: '#3B82F6',         

    // Card backgrounds
    cardBg: '#FFFFFF',
    cardBgAlt: '#FAF6F2',
    overlayBg: 'rgba(33,33,33,0.5)',

    // Category colors
    categoryActive: '#E8F0EC',   
    categoryBorder: '#627D72',   
};

// ── Semantic Light / Dark Palettes ───────────────────────────────────────────

export const LightColors = {
    background: '#FAF6F2',       // Warm Oatmeal
    backgroundElevated: '#FFFFFF',
    surface: '#FFFFFF',          // Cards & Surfaces
    surfacePressed: '#F3F4F6',   // Active touches
    card: '#FFFFFF',             // Pure White
    border: '#E5E7EB',           // Faint border
    borderStrong: '#D1D5DB',     // Stronger border
    textPrimary: '#212121',      // Ink Charcoal
    textSecondary: '#6B7280',    // Mist Grey
    textMuted: '#9CA3AF',        // Muted Pebble
    textInverse: '#FFFFFF',      // White
    iconDefault: '#9CA3AF',      // Muted Pebble Grey
    iconBtnBg: '#FFFFFF',        // White
    accent: '#627D72',           // Desaturated Slate Green
    accentLight: '#E8F0EC',      // Light Tinted Green
    accentText: '#FFFFFF',       // Primary Action Text -> White
    skeleton: '#E5E7EB',         
    skeletonHighlight: '#F3F4F6',
    tabBar: 'rgba(255, 255, 255, 0.9)',           // Frosted White
    tabBarBorder: 'transparent',
    statusBar: 'dark' as const,
};

export const DarkColors = {
    background: '#121212',       // Soft Dark
    backgroundElevated: '#1E1E1E', // Elevated Dark
    surface: '#1E1E1E',          // Cards
    surfacePressed: '#2C2C2C',   // Touched Dark
    card: '#1E1E1E',             // Cards
    border: '#2C2C2C',           // Borders
    borderStrong: '#3D3D3D',     // Strong Border
    textPrimary: '#F9FAFB',      // Off-White
    textSecondary: '#9CA3AF',    // Muted Pebble
    textMuted: '#6B7280',        // Mist Grey
    textInverse: '#121212',      // Dark
    iconDefault: '#9CA3AF',      // Muted Pebble
    iconBtnBg: '#2C2C2C',        // Surface Icon
    accent: '#627D72',           // Slate Green
    accentLight: '#2A3631',      // Deep Slate tint
    accentText: '#FFFFFF',       // White Text
    skeleton: '#2C2C2C',         
    skeletonHighlight: '#3D3D3D', 
    tabBar: 'rgba(30, 30, 30, 0.9)',           // Frosted Dark
    tabBarBorder: 'transparent', // No harsh borders
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
    sm: 12,
    md: 16,     // Replaces typical 8px with 16px minimum for cards/buttons
    lg: 20,     // 20px radius
    xl: 24,
    xxl: 28,
    round: 50,
};

// ── Shadows ──────────────────────────────────────────────────────────────────

export const Shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03, // Soft glow
        shadowRadius: 15,
        elevation: 2,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 20,
        elevation: 4,
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
