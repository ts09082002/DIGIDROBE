import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;

const TABS = ['My Looks', 'Community Inspiration'];

const MY_OUTFITS = [
    {
        id: '1',
        name: 'Parisian Autumn',
        items: 4,
        color: '#E8D5C0',
    },
    {
        id: '2',
        name: 'Urban Minimalist',
        items: 2,
        color: '#D5D8DC',
    },
    {
        id: '3',
        name: 'Summer Breeze',
        items: 3,
        color: '#C5E0B4',
    },
    {
        id: '4',
        name: 'Midnight Gala',
        items: 2,
        color: '#2C2C3E',
    },
];

const TRENDING_COLLECTIONS = [
    { id: '1', name: 'Monochrome Magic', label: 'COLLECTION', color: '#C9A84C' },
    { id: '2', name: 'Spring Essentials', label: 'COLLECTION', color: '#8FBC8F' },
];

export default function OutfitsScreen() {
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('My Looks');
    const [selectedOutfit, setSelectedOutfit] = useState<any>(null);

    const theme = {
        background: isDarkMode ? '#1A1A1A' : Colors.warmGray,
        card: isDarkMode ? '#242424' : Colors.white,
        text: isDarkMode ? '#FFFFFF' : Colors.charcoal,
        textSecondary: isDarkMode ? '#A0A0A0' : Colors.darkGray,
        iconBtnBg: isDarkMode ? '#333333' : Colors.white,
        tabBg: isDarkMode ? '#333333' : Colors.lightGray,
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="sparkles" size={20} color={Colors.gold} />
                        <Text style={[styles.title, { color: theme.text }]}>My Outfits</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.iconBtnBg }]}>
                            <Ionicons name="search" size={20} color={theme.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.iconBtnBg }]}>
                            <Ionicons name="options-outline" size={20} color={theme.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tabs */}
                <View style={[styles.tabsContainer, { backgroundColor: theme.tabBg }]}>
                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[
                                styles.tab,
                                activeTab === tab && [styles.tabActive, { backgroundColor: theme.card }],
                            ]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    { color: theme.textSecondary },
                                    activeTab === tab && [styles.tabTextActive, { color: theme.text }],
                                ]}
                            >
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Outfits Grid */}
                <View style={styles.grid}>
                    {MY_OUTFITS.map((outfit, index) => (
                        <TouchableOpacity
                            key={outfit.id}
                            style={styles.outfitCard}
                            onPress={() => setSelectedOutfit(outfit)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.outfitImage, { backgroundColor: outfit.color }]}>
                                <Ionicons
                                    name="person-outline"
                                    size={60}
                                    color={outfit.color === '#2C2C3E' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'}
                                />
                                <TouchableOpacity style={[styles.moreBtn, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)' }]}>
                                    <Ionicons name="ellipsis-horizontal" size={16} color={theme.text} />
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.outfitName, { color: theme.text }]}>{outfit.name}</Text>
                            <View style={styles.outfitItems}>
                                {Array.from({ length: Math.min(outfit.items, 3) }).map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.itemDot,
                                            { backgroundColor: i === 0 ? Colors.dark : i === 1 ? Colors.goldDark : Colors.mediumGray },
                                            { marginLeft: i > 0 ? -6 : 0 },
                                        ]}
                                    />
                                ))}
                                {outfit.items > 3 && (
                                    <Text style={styles.moreItems}>+{outfit.items - 3}</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Trending Styles */}
                <View style={styles.trendingSection}>
                    <View style={styles.trendingHeader}>
                        <Text style={[styles.trendingTitle, { color: theme.text }]}>Trending Styles</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {TRENDING_COLLECTIONS.map((collection) => (
                            <TouchableOpacity key={collection.id} style={styles.trendingCard}>
                                <View style={[styles.trendingImage, { backgroundColor: collection.color }]}>
                                    <Ionicons name="shirt-outline" size={40} color="rgba(255,255,255,0.5)" />
                                </View>
                                <View style={styles.trendingOverlay}>
                                    <Text style={styles.trendingLabel}>{collection.label}</Text>
                                    <Text style={styles.trendingName}>{collection.name}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="add" size={28} color={Colors.white} />
            </TouchableOpacity>

            {/* Outfit Detail Modal */}
            <Modal
                visible={!!selectedOutfit}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedOutfit(null)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setSelectedOutfit(null)}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setSelectedOutfit(null)}
                        >
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>

                        {selectedOutfit && (
                            <>
                                <View style={[styles.expandedOutfitContainer, { backgroundColor: selectedOutfit.color }]}>
                                    <Ionicons
                                        name="person-outline"
                                        size={120}
                                        color={selectedOutfit.color === '#2C2C3E' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'}
                                    />
                                </View>

                                <View style={styles.modalInfo}>
                                    <Text style={[styles.modalTitle, { color: theme.text }]}>
                                        {selectedOutfit.name}
                                    </Text>
                                    <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                                        {selectedOutfit.items} Items in this look
                                    </Text>

                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, { backgroundColor: Colors.gold }]}
                                            onPress={() => {
                                                setSelectedOutfit(null);
                                            }}
                                        >
                                            <Ionicons name="shirt-outline" size={18} color={Colors.white} />
                                            <Text style={styles.modalActionText}>Try On</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, { backgroundColor: isDarkMode ? '#333' : '#F5F5F5' }]}
                                            onPress={() => {
                                                setSelectedOutfit(null);
                                            }}
                                        >
                                            <Ionicons name="create-outline" size={18} color={theme.text} />
                                            <Text style={[styles.modalActionText, { color: theme.text }]}>Edit</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.warmGray,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    title: {
        ...Typography.heading1,
        fontSize: 24,
    },
    headerRight: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: Spacing.xl,
        backgroundColor: Colors.lightGray,
        borderRadius: BorderRadius.round,
        padding: 4,
        marginBottom: Spacing.xl,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.round,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: Colors.white,
        ...Shadows.sm,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.darkGray,
    },
    tabTextActive: {
        color: Colors.charcoal,
        fontWeight: '600',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: Spacing.xl,
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    outfitCard: {
        width: CARD_WIDTH,
        marginBottom: Spacing.sm,
    },
    outfitImage: {
        width: '100%',
        height: CARD_WIDTH * 1.15,
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: Spacing.sm,
    },
    moreBtn: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    outfitName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.charcoal,
        marginBottom: 4,
    },
    outfitItems: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: Colors.white,
    },
    moreItems: {
        fontSize: 11,
        color: Colors.darkGray,
        marginLeft: Spacing.xs,
    },
    trendingSection: {
        paddingHorizontal: Spacing.xl,
    },
    trendingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    trendingTitle: {
        ...Typography.heading3,
    },
    seeAll: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.gold,
    },
    trendingCard: {
        width: width * 0.55,
        height: 160,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginRight: Spacing.md,
        position: 'relative',
    },
    trendingImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    trendingOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: Spacing.md,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    trendingLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1,
    },
    trendingName: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.white,
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: Spacing.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.gold,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.lg,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    modalContent: {
        width: '100%',
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        alignItems: 'center',
        position: 'relative',
    },
    closeBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expandedOutfitContainer: {
        width: '100%',
        height: 300,
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
        marginTop: Spacing.md,
    },
    modalInfo: {
        width: '100%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        marginBottom: Spacing.xl,
    },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        width: '100%',
        justifyContent: 'center',
    },
    modalActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    modalActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.white,
    },
});
