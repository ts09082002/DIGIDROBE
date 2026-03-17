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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const CATEGORIES = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'];

const SAMPLE_ITEMS = [
    { id: '1', name: 'Basic Tee', type: 'BASIC', color: '#F5F0E8' },
    { id: '2', name: 'Bomber Jacket', type: 'ACTIVE', color: '#E8E8E8' },
    { id: '3', name: 'Linen Shirt', type: 'LINEN', color: '#E0F0F0' },
    { id: '4', name: 'Denim Jacket', type: 'CASUAL', color: '#E0E8F0' },
];

const SKIN_TONES = ['#F5D6C3', '#E8C4A8', '#D4A574', '#B8865A', '#8B6542', '#5C3D2E'];

export default function StylingScreen() {
    const { isDarkMode } = useTheme();
    const bg = isDarkMode ? '#000000' : '#FEFCF9';
    const cardBg = isDarkMode ? '#0D0D0D' : Colors.white;
    const surfaceBg = isDarkMode ? '#1A1A1A' : '#F5F5F3';
    const gold = '#5DADE2';
    const textPrimary = isDarkMode ? '#FFFFFF' : Colors.charcoal;
    const textSecondary = isDarkMode ? '#A09080' : Colors.darkGray;

    const [selectedCategory, setSelectedCategory] = useState('Tops');
    const [selectedItem, setSelectedItem] = useState('2');
    const [selectedSkinTone, setSelectedSkinTone] = useState('#E8C4A8');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity>
                    <Ionicons name="arrow-back" size={24} color={textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textPrimary }]}>Avatar Styling</Text>
                <TouchableOpacity>
                    <Text style={[styles.resetText, { color: gold }]}>Reset</Text>
                </TouchableOpacity>
            </View>

            {/* Avatar Area */}
            <View style={styles.avatarContainer}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDarkMode ? '#0D0D0D' : '#3A3A4E' }]}>
                    {/* Placeholder for 3D avatar */}
                    <View style={styles.avatarBody}>
                        <View style={[styles.avatarHead, { backgroundColor: selectedSkinTone }]} />
                        <View style={[styles.avatarTorso, { backgroundColor: selectedSkinTone }]}>
                            <Ionicons name="person" size={80} color="rgba(0,0,0,0.1)" />
                        </View>
                    </View>

                    {/* Dashed guides */}
                    <View style={[styles.guideDashed, { borderColor: gold }]} />
                    <View style={[styles.guideHorizontal, { backgroundColor: gold }]} />

                    {/* Controls */}
                    <TouchableOpacity style={[styles.controlBtnLeft, { backgroundColor: surfaceBg }]}>
                        <Ionicons name="link-outline" size={20} color={textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.controlBtnRight, { backgroundColor: surfaceBg }]}>
                        <Ionicons name="refresh-outline" size={20} color={textPrimary} />
                    </TouchableOpacity>

                    {/* Move icon */}
                    <View style={[styles.moveIcon, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)' }]}>
                        <Ionicons name="move" size={16} color={gold} />
                    </View>

                    {/* Resize icon */}
                    <View style={[styles.resizeIcon, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)' }]}>
                        <Ionicons name="resize-outline" size={16} color={gold} />
                    </View>
                </View>

                {/* Skin Tone Selector */}
                <View style={styles.skinToneRow}>
                    {SKIN_TONES.map((tone) => (
                        <TouchableOpacity
                            key={tone}
                            style={[
                                styles.skinToneDot,
                                { backgroundColor: tone },
                                selectedSkinTone === tone && [styles.skinToneDotActive, { borderColor: gold }],
                            ]}
                            onPress={() => setSelectedSkinTone(tone)}
                        />
                    ))}
                </View>
            </View>

            {/* Category Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryTabs}
            >
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        style={[
                            styles.categoryTab,
                            selectedCategory === cat && styles.categoryTabActive,
                        ]}
                        onPress={() => setSelectedCategory(cat)}
                    >
                        <Text
                            style={[
                                styles.categoryTabText,
                                { color: textSecondary },
                                selectedCategory === cat && [styles.categoryTabTextActive, { color: gold }],
                            ]}
                        >
                            {cat}
                        </Text>
                        {selectedCategory === cat && <View style={[styles.categoryIndicator, { backgroundColor: gold }]} />}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Clothing Items */}
            <FlatList
                data={SAMPLE_ITEMS}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.itemsContainer}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.itemCard,
                            selectedItem === item.id && styles.itemCardActive,
                        ]}
                        onPress={() => setSelectedItem(item.id)}
                    >
                        <View style={[styles.itemImage, { backgroundColor: isDarkMode ? '#1A1A1A' : item.color }]}>
                            <Ionicons name="shirt-outline" size={40} color={isDarkMode ? gold : Colors.darkGray} />
                            {selectedItem === item.id && (
                                <View style={styles.checkmark}>
                                    <Ionicons name="checkmark-circle" size={22} color={gold} />
                                </View>
                            )}
                        </View>
                        <Text
                            style={[
                                styles.itemLabel,
                                { color: textSecondary },
                                selectedItem === item.id && [styles.itemLabelActive, { color: gold }],
                            ]}
                        >
                            {item.type}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {/* Bottom Actions */}
            <View style={[styles.bottomActions, { backgroundColor: cardBg, borderTopColor: surfaceBg }]}>
                <View style={styles.bottomLeft}>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Ionicons name="shirt-outline" size={20} color={textPrimary} />
                        <Text style={[styles.actionLabel, { color: textSecondary }]}>CLOSET</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Ionicons name="sparkles-outline" size={20} color={textPrimary} />
                        <Text style={[styles.actionLabel, { color: textSecondary }]}>AI GEN</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.finishButton, { backgroundColor: gold }]}>
                    <Text style={styles.finishButtonText}>Finish Look →</Text>
                </TouchableOpacity>
            </View>
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
        paddingVertical: Spacing.md,
    },
    headerTitle: {
        ...Typography.heading3,
        fontSize: 17,
        fontWeight: '700',
    },
    resetText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.gold,
    },
    avatarContainer: {
        height: 340,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
    },
    avatarPlaceholder: {
        flex: 1,
        backgroundColor: '#3A3A4E',
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    avatarBody: {
        alignItems: 'center',
    },
    avatarHead: {
        width: 70,
        height: 70,
        borderRadius: 35,
        marginBottom: -5,
    },
    avatarTorso: {
        width: 120,
        height: 160,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    guideDashed: {
        position: 'absolute',
        top: 30,
        left: width * 0.25,
        right: width * 0.25,
        height: 200,
        borderWidth: 1.5,
        borderColor: Colors.gold,
        borderStyle: 'dashed',
        borderRadius: BorderRadius.md,
    },
    guideHorizontal: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: 1.5,
        backgroundColor: Colors.gold,
        opacity: 0.5,
    },
    controlBtnLeft: {
        position: 'absolute',
        left: Spacing.md,
        bottom: '40%',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.md,
    },
    controlBtnRight: {
        position: 'absolute',
        right: Spacing.md,
        bottom: '40%',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.md,
    },
    moveIcon: {
        position: 'absolute',
        left: '30%',
        top: '52%',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resizeIcon: {
        position: 'absolute',
        right: '28%',
        top: '20%',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    skinToneRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingTop: Spacing.md,
    },
    skinToneDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    skinToneDotActive: {
        borderColor: Colors.gold,
        borderWidth: 3,
    },
    categoryTabs: {
        paddingHorizontal: Spacing.xl,
        gap: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    categoryTab: {
        paddingBottom: Spacing.sm,
        position: 'relative',
    },
    categoryTabActive: {},
    categoryTabText: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.mediumGray,
    },
    categoryTabTextActive: {
        color: Colors.gold,
        fontWeight: '700',
    },
    categoryIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: Colors.gold,
        borderRadius: 1.5,
    },
    itemsContainer: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        gap: Spacing.md,
    },
    itemCard: {
        width: 130,
        alignItems: 'center',
    },
    itemCardActive: {},
    itemImage: {
        width: 120,
        height: 130,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    checkmark: {
        position: 'absolute',
        top: Spacing.xs,
        right: Spacing.xs,
    },
    itemLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.darkGray,
        marginTop: Spacing.sm,
        letterSpacing: 0.5,
    },
    itemLabelActive: {
        color: Colors.gold,
    },
    bottomActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.lightGray,
    },
    bottomLeft: {
        flexDirection: 'row',
        gap: Spacing.xl,
    },
    actionBtn: {
        alignItems: 'center',
        gap: 4,
    },
    actionLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.darkGray,
        letterSpacing: 0.5,
    },
    finishButton: {
        backgroundColor: Colors.gold,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.round,
    },
    finishButtonText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 15,
    },
});
