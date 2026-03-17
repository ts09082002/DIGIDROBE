import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Spacing, BorderRadius } from '../constants/theme';

export default function AboutScreen() {
    const router = useRouter();
    const { isDarkMode } = useTheme();

    const bg = isDarkMode ? '#000000' : '#FFFFFF';
    const cardBg = isDarkMode ? '#121212' : '#F8F9FA';
    const blueCardBg = isDarkMode ? '#1A2A3A' : '#F0F8FF';
    const lightBlueCardBg = isDarkMode ? '#162331' : '#F9FCFF';
    const surfaceBg = isDarkMode ? '#1A1A1A' : '#F5F5F3';
    
    // Theme specifically requested
    const skyBlue = '#5DADE2'; 
    const gold = isDarkMode ? '#D4AF37' : '#F2A900'; 
    
    const textPrimary = isDarkMode ? '#FFFFFF' : '#1A1A24';
    const textSecondary = isDarkMode ? '#A0A0A0' : '#556070';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: surfaceBg }]}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: surfaceBg }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textPrimary }]}>About Wardora</Text>
                <View style={{ width: 36 }} /> {/* Balance for absolute centering */}
            </View>

            <ScrollView 
                style={styles.scroll} 
                contentContainerStyle={{ paddingBottom: Spacing.xxl }}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <ImageBackground 
                    source={{ uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' }} // Placeholder closet image
                    style={styles.heroCard}
                    imageStyle={{ borderRadius: 16 }}
                >
                    <View style={styles.heroOverlay}>
                        <View style={styles.heroPill}>
                            <Text style={styles.heroPillText}>WARDORA SKY</Text>
                        </View>
                        <Text style={styles.heroTitle}>Our Story</Text>
                        <Text style={styles.heroSubtitle}>Reimagining the digital closet</Text>
                    </View>
                </ImageBackground>

                {/* The Mission Section */}
                <View style={styles.missionSection}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={[styles.iconBadgeBlue, { backgroundColor: lightBlueCardBg }]}>
                            <Ionicons name="sparkles" size={20} color={skyBlue} />
                        </View>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>The Mission</Text>
                    </View>
                    <Text style={[styles.paragraphText, { color: textSecondary }]}>
                        Wardora was born from a simple observation: our digital lives are expanding, but our closets are stuck in the physical past. We believe fashion should be accessible, personal, and limitlessly creative. We're building a space where your style knows no boundaries.
                    </Text>
                </View>

                {/* The Technology Section */}
                <View style={[styles.techCard, { backgroundColor: cardBg }]}>
                    <Text style={[styles.techCardTitle, { color: textPrimary }]}>The Technology</Text>
                    
                    <View style={styles.techRow}>
                        <View style={[styles.smallIconBadge, { backgroundColor: '#FFF5E5' }]}>
                             <Ionicons name="cog" size={16} color={gold} />
                        </View>
                        <View style={styles.techContent}>
                            <Text style={[styles.techTitle, { color: textPrimary }]}>AI-Powered Styling</Text>
                            <Text style={[styles.techDesc, { color: textSecondary }]}>
                                Sophisticated algorithms that understand your taste, body type, and the latest trends.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.techRow}>
                        <View style={[styles.smallIconBadge, { backgroundColor: '#FFF5E5' }]}>
                             <Ionicons name="body" size={16} color={gold} />
                        </View>
                        <View style={styles.techContent}>
                            <Text style={[styles.techTitle, { color: textPrimary }]}>3D Interactive Avatars</Text>
                            <Text style={[styles.techDesc, { color: textSecondary }]}>
                                Hyper-realistic avatars that let you try on garments virtually with precision fit technology.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Our Vision Section */}
                <View style={styles.visionSection}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={[styles.iconBadgeGold, { backgroundColor: '#FFF5E5' }]}>
                            <Ionicons name="eye" size={20} color={gold} />
                        </View>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Our Vision</Text>
                    </View>

                    <View style={styles.visionGrid}>
                        <View style={[styles.visionBox, { backgroundColor: blueCardBg }]}>
                            <Text style={[styles.visionBoxTitle, { color: skyBlue }]}>SUSTAINABILITY</Text>
                            <Text style={[styles.visionBoxDesc, { color: textSecondary }]}>
                                Reducing waste through digital first-try experiences.
                            </Text>
                        </View>
                        
                        <View style={[styles.visionBox, { backgroundColor: blueCardBg }]}>
                            <Text style={[styles.visionBoxTitle, { color: skyBlue }]}>EMPOWERMENT</Text>
                            <Text style={[styles.visionBoxDesc, { color: textSecondary }]}>
                                Giving everyone the tools to express their true identity.
                            </Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scroll: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
    },
    // Hero
    heroCard: {
        width: '100%',
        height: 220,
        marginTop: Spacing.lg,
        borderRadius: 16,
        overflow: 'hidden',
    },
    heroOverlay: {
        flex: 1,
        backgroundColor: 'rgba(50,40,30,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    heroPill: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        marginBottom: Spacing.sm,
    },
    heroPillText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 4,
    },
    heroSubtitle: {
        color: '#E0E0E0',
        fontSize: 14,
    },
    // Sections
    missionSection: {
        paddingVertical: Spacing.xl,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
        gap: Spacing.md,
    },
    iconBadgeBlue: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBadgeGold: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    paragraphText: {
        fontSize: 15,
        lineHeight: 24,
        letterSpacing: 0.2,
    },
    // Tech Card
    techCard: {
        borderRadius: 16,
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    techCardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: Spacing.lg,
    },
    techRow: {
        flexDirection: 'row',
        marginBottom: Spacing.lg,
        gap: Spacing.md,
    },
    smallIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    techContent: {
        flex: 1,
    },
    techTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    techDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    // Vision
    visionSection: {
        marginBottom: Spacing.xxl,
    },
    visionGrid: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    visionBox: {
        flex: 1,
        borderRadius: 12,
        padding: Spacing.lg,
    },
    visionBoxTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: Spacing.sm,
    },
    visionBoxDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
});
