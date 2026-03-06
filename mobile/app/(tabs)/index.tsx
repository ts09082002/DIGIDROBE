import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Mock Data
const POSTS = [
    {
        id: '1',
        user: { name: 'Elena Rosé', location: 'Paris', avatar: 'https://i.pravatar.cc/150?u=elena' },
        time: '2 hours ago',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800',
        rating: 4.9,
        likes: '1.2k',
        comments: '84',
        taggedItems: [
            'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=150',
            'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=150',
            'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=150'
        ]
    },
    {
        id: '2',
        user: { name: 'Julian Vane', location: 'London', avatar: 'https://i.pravatar.cc/150?u=julian' },
        time: '5 hours ago',
        image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=800',
        rating: 4.7,
        likes: '856',
        comments: '32',
        taggedItems: [
            'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=150',
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=150'
        ]
    }
];

const FOLLOWING_ITEMS = [
    { id: 'f1', name: 'Summer Essentials', items: 12, image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=500' },
    { id: 'f2', name: 'Streetwear Fits', items: 8, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=500' },
    { id: 'f3', name: 'Office Minimal', items: 24, image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&q=80&w=500' },
    { id: 'f4', name: 'Evening Elegance', items: 6, image: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&q=80&w=500' },
];

const CARD_WIDTH = (width - 45) / 2;

export default function HomeScreen() {
    const [activeTab, setActiveTab] = useState('Trending');
    const { isDarkMode, toggleTheme } = useTheme();
    const router = useRouter();

    const colors = {
        background: isDarkMode ? '#1A1A1A' : '#F8F9FA',
        card: isDarkMode ? '#242424' : '#FFFFFF',
        text: isDarkMode ? '#FFFFFF' : '#1A1A1A',
        textSecondary: isDarkMode ? '#A0A0A0' : '#8E8E93',
        border: isDarkMode ? '#333333' : '#E5E5EA',
        primary: '#F2A900', // Gold color from logo
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoIconBg}>
                        <Ionicons name="diamond" size={16} color="#000" />
                    </View>
                    <Text style={[styles.logoText, { color: colors.text }]}>Digidrobe</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
                        <Ionicons name={isDarkMode ? "sunny" : "moon"} size={22} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="notifications" size={24} color={isDarkMode ? '#A0A0A0' : '#4A5568'} />
                        <View style={styles.notificationBadge} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => router.push('/(tabs)/profile')}
                    >
                        <Ionicons name="person-circle-outline" size={26} color={isDarkMode ? '#A0A0A0' : '#4A5568'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
                {['Trending', 'Following', 'Newest'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === tab ? colors.text : colors.textSecondary },
                            activeTab === tab && styles.tabTextActive
                        ]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Feed */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.feedContainer}>
                {activeTab === 'Following' ? (
                    <View style={styles.followingGrid}>
                        {FOLLOWING_ITEMS.map(item => (
                            <TouchableOpacity key={item.id} style={[styles.followingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Image source={{ uri: item.image }} style={styles.followingImage} />
                                <View style={styles.followingInfo}>
                                    <Text style={[styles.followingName, { color: colors.text }]}>{item.name}</Text>
                                    <Text style={[styles.followingItems, { color: colors.textSecondary }]}>{item.items} items</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    POSTS.map(post => (
                        <View key={post.id} style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

                            {/* Post Header */}
                            <View style={styles.postHeader}>
                                <View style={styles.postUserInfo}>
                                    <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
                                    <View>
                                        <Text style={[styles.userName, { color: colors.text }]}>{post.user.name}</Text>
                                        <Text style={[styles.timeLocation, { color: colors.textSecondary }]}>
                                            {post.time} • {post.user.location}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity>
                                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Post Image Container */}
                            <View style={styles.imageContainer}>
                                <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" />
                                <View style={styles.ratingBadge}>
                                    <Ionicons name="star" size={12} color="#F2A900" />
                                    <Text style={styles.ratingText}>{post.rating}</Text>
                                </View>
                            </View>

                            {/* Actions */}
                            <View style={styles.actionsContainer}>
                                <View style={styles.leftActions}>
                                    <TouchableOpacity style={styles.actionButton}>
                                        <Ionicons name="heart" size={24} color="#4A5568" />
                                        <Text style={[styles.actionText, { color: colors.text }]}>{post.likes}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionButton}>
                                        <Ionicons name="chatbubble" size={22} color="#4A5568" />
                                        <Text style={[styles.actionText, { color: colors.text }]}>{post.comments}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionButton}>
                                        <Ionicons name="paper-plane" size={24} color="#4A5568" />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity>
                                    <Ionicons name="bookmark" size={24} color="#4A5568" />
                                </TouchableOpacity>
                            </View>

                            {/* Tagged Items */}
                            <View style={styles.taggedSection}>
                                <Text style={[styles.taggedTitle, { color: colors.textSecondary }]}>TAGGED ITEMS</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.taggedList}>
                                    {post.taggedItems.map((item, index) => (
                                        <View key={index} style={[styles.taggedItemWrapper, { borderColor: colors.border }]}>
                                            <Image source={{ uri: item }} style={styles.taggedItemImage} />
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>

                        </View>
                    ))
                )}
                {/* Spacer for bottom tab bar and FAB */}
                <View style={{ height: 100 }} />
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 15,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoIconBg: {
        backgroundColor: '#F2A900',
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    iconButton: {
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: 0,
        right: 2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F2A900',
        borderWidth: 1,
        borderColor: '#FFF',
    },
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
        borderBottomWidth: 1,
        paddingBottom: 0,
    },
    tab: {
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '500',
    },
    tabTextActive: {
        fontWeight: '700',
    },
    feedContainer: {
        paddingVertical: 15,
        paddingBottom: 120,
    },
    followingGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        justifyContent: 'space-between',
        gap: 15,
    },
    followingCard: {
        width: CARD_WIDTH,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    followingImage: {
        width: '100%',
        height: CARD_WIDTH * 1.2,
        backgroundColor: '#EAEAEA',
    },
    followingInfo: {
        padding: 12,
    },
    followingName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    followingItems: {
        fontSize: 12,
    },
    postCard: {
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 15,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    postUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
    },
    timeLocation: {
        fontSize: 12,
        marginTop: 2,
    },
    imageContainer: {
        position: 'relative',
        borderRadius: 15,
        overflow: 'hidden',
        height: 400,
        backgroundColor: '#EAEAEA',
    },
    postImage: {
        width: '100%',
        height: '100%',
    },
    ratingBadge: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        backgroundColor: 'rgba(0,0,0,0.7)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    ratingText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 15,
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    taggedSection: {
        marginTop: 5,
    },
    taggedTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 10,
    },
    taggedList: {
        flexDirection: 'row',
    },
    taggedItemWrapper: {
        width: 50,
        height: 50,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 10,
        overflow: 'hidden',
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    taggedItemImage: {
        width: '80%',
        height: '80%',
        resizeMode: 'contain',
    }
});
