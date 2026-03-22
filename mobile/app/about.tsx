import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../context/ThemeContext';
import { FontFamily, Spacing, BorderRadius } from '../constants/theme';
import ScreenContainer from '../components/ui/ScreenContainer';

const { width } = Dimensions.get('window');

export default function AboutScreen() {
    const router = useRouter();
    const tc = useThemeColors();

    return (
        <ScreenContainer>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: tc.background }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={tc.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: tc.textPrimary }]}>About Drobeo</Text>
                <View style={{ width: 40 }} /> {/* balance */}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Hero Card */}
                <View style={styles.heroWrap}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1549439602-43ebca2327af?q=80&w=800&auto=format&fit=crop' }}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                    <View style={styles.heroOverlay}>
                        <View style={styles.pillLabel}>
                            <Text style={styles.pillText}>DROBEO CLOSET</Text>
                        </View>
                        <Text style={styles.heroTitle}>Our Story</Text>
                        <Text style={styles.heroSubtitle}>Reimagining the digital closet</Text>
                    </View>
                </View>

                {/* The Mission */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <View style={[styles.iconBox, { backgroundColor: tc.accentLight }]}>
                            <Ionicons name="sparkles" size={18} color={tc.accent} />
                        </View>
                        <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>The Mission</Text>
                    </View>
                    <Text style={[styles.paragraph, { color: tc.textSecondary }]}>
                        Drobeo was born from a simple observation: our digital lives are expanding, but our closets are stuck in the physical past. We believe fashion should be accessible, personal, and limitlessly creative. We're building a space where your style knows no boundaries.
                    </Text>
                </View>

                {/* The Technology */}
                <View style={[styles.technologyCard, { backgroundColor: tc.surface }]}>
                    <Text style={[styles.cardTitle, { color: tc.textPrimary }]}>The Technology</Text>
                    
                    <View style={styles.techRow}>
                        <View style={[styles.iconBoxWarm, { backgroundColor: '#FDF3E3' }]}>
                            <Ionicons name="hardware-chip" size={18} color="#D4AF37" />
                        </View>
                        <View style={styles.techTextWrap}>
                            <Text style={[styles.techTitle, { color: tc.textPrimary }]}>AI-Powered Styling</Text>
                            <Text style={[styles.techSub, { color: tc.textSecondary }]}>
                                Sophisticated algorithms that understand your taste, body type, and the latest trends.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.techRow}>
                        <View style={[styles.iconBoxWarm, { backgroundColor: '#FDF3E3' }]}>
                            <Ionicons name="body" size={18} color="#D4AF37" />
                        </View>
                        <View style={styles.techTextWrap}>
                            <Text style={[styles.techTitle, { color: tc.textPrimary }]}>Interactive Canvas</Text>
                            <Text style={[styles.techSub, { color: tc.textSecondary }]}>
                                Mix and match your garments virtually to create identical real-life aesthetic outfits.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Our Vision */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <View style={[styles.iconBoxWarm, { backgroundColor: '#FDF3E3' }]}>
                            <Ionicons name="eye" size={18} color="#D4AF37" />
                        </View>
                        <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>Our Vision</Text>
                    </View>
                    <View style={styles.visionGrid}>
                        <View style={[styles.visionCard, { backgroundColor: '#F0F9FF' }]}>
                            <Text style={[styles.visionTitle, { color: '#0369A1' }]}>SUSTAINABILITY</Text>
                            <Text style={[styles.visionDesc, { color: tc.textSecondary }]}>
                                Reducing waste through digital first-try experiences.
                            </Text>
                        </View>
                        <View style={[styles.visionCard, { backgroundColor: '#F0F9FF' }]}>
                            <Text style={[styles.visionTitle, { color: '#0369A1' }]}>EMPOWERMENT</Text>
                            <Text style={[styles.visionDesc, { color: tc.textSecondary }]}>
                                Giving everyone the tools to express their true identity.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Adding Items Instructions */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <View style={[styles.iconBox, { backgroundColor: tc.accentLight }]}>
                            <Ionicons name="add-circle" size={18} color={tc.accent} />
                        </View>
                        <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>How it works</Text>
                    </View>
                    <View style={[styles.instructionBox, { backgroundColor: tc.surface }]}>
                        <Text style={[styles.instructionStep, { color: tc.textPrimary }]}>1. Go to the <Text style={{fontWeight: 'bold'}}>Wardrobe</Text> tab.</Text>
                        <Text style={[styles.instructionStep, { color: tc.textPrimary }]}>2. Tap the blue <Text style={{fontWeight: 'bold'}}>+ Add Item</Text> button.</Text>
                        <Text style={[styles.instructionStep, { color: tc.textPrimary }]}>3. Take a picture or select an image from your gallery.</Text>
                        <Text style={[styles.instructionStep, { color: tc.textPrimary }]}>4. Our AI instantly removes the background.</Text>
                        <Text style={[styles.instructionStep, { color: tc.textPrimary }]}>5. Mix and match your new item on the Home canvas!</Text>
                    </View>
                </View>

            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 60,
    },
    heroWrap: {
        width: '100%',
        height: 220,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        marginTop: Spacing.lg,
        marginBottom: Spacing.xl,
        position: 'relative',
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    pillLabel: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        marginBottom: Spacing.sm,
    },
    pillText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 2,
    },
    heroTitle: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '800',
        fontFamily: FontFamily.heading,
        marginBottom: 6,
    },
    heroSubtitle: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
        fontFamily: FontFamily.body,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBoxWarm: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: FontFamily.headingMedium,
    },
    paragraph: {
        fontSize: 14,
        lineHeight: 22,
        fontFamily: FontFamily.body,
    },
    technologyCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: FontFamily.headingMedium,
        marginBottom: Spacing.lg,
    },
    techRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: Spacing.lg,
        gap: Spacing.md,
    },
    techTextWrap: {
        flex: 1,
    },
    techTitle: {
        fontSize: 15,
        fontWeight: '700',
        fontFamily: FontFamily.bodyBold,
        marginBottom: 4,
    },
    techSub: {
        fontSize: 13,
        lineHeight: 18,
        fontFamily: FontFamily.body,
    },
    visionGrid: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.xs,
    },
    visionCard: {
        flex: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    visionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: Spacing.xs,
    },
    visionDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    instructionBox: {
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        gap: Spacing.sm,
    },
    instructionStep: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: FontFamily.body,
    },
});
