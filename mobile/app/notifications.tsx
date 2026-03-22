import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../context/ThemeContext';
import { FontFamily, Spacing, BorderRadius } from '../constants/theme';
import ScreenContainer from '../components/ui/ScreenContainer';
import { getNotifications, markAllRead, AppNotification } from '../services/notifications';

const MOCK_NOTIFICATIONS: AppNotification[] = [
    {
        id: 'mock1',
        type: 'system',
        title: 'Style Recommendation',
        message: "A new 'Parisian Chic' edit is ready for you!",
        timestamp: Date.now() - 120000, // 2 mins ago
        read: false,
    },
    {
        id: 'mock2',
        type: 'system',
        title: 'Catalog Update',
        message: 'New Spring arrivals added to the catalog. Explore 200+ new pieces from your favorite brands.',
        timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
        read: true,
    },
    {
        id: 'mock3',
        type: 'system',
        title: 'Daily Inspo',
        message: "It's 18°C and sunny in Paris. We recommend your Beige Trench Coat today.",
        timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
        read: true,
    }
];

export default function NotificationsScreen() {
    const router = useRouter();
    const tc = useThemeColors();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        const fetchNotifs = async () => {
            const stored = await getNotifications();
            if (stored.length === 0) {
                setNotifications(MOCK_NOTIFICATIONS);
            } else {
                setNotifications(stored);
            }
        };
        fetchNotifs();
    }, []);

    const handleMarkAllRead = async () => {
        await markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const newNotifs = notifications.filter(n => Date.now() - n.timestamp < 12 * 60 * 60 * 1000);
    const earlierNotifs = notifications.filter(n => Date.now() - n.timestamp >= 12 * 60 * 60 * 1000);

    const getTimeString = (ts: number) => {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days === 1) return `Yesterday`;
        return `${days}d ago`;
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'upload': return 'cloud-upload';
            case 'delete': return 'trash';
            case 'system': return 'sparkles';
            default: return 'notifications';
        }
    };

    const renderNotification = (n: AppNotification) => (
        <View key={n.id} style={[styles.card, { backgroundColor: tc.surface }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#FDF3E3' }]}>
                    <Ionicons name={getIconForType(n.type)} size={20} color="#D4AF37" />
                </View>
                <View style={styles.textContent}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.cardTitle, { color: tc.textPrimary }]}>{n.title}</Text>
                        <View style={styles.timeWrap}>
                            <Text style={styles.timeText}>{getTimeString(n.timestamp)}</Text>
                            {!n.read && <View style={styles.unreadDot} />}
                        </View>
                    </View>
                    <Text style={[styles.cardMessage, { color: tc.textSecondary }]}>{n.message}</Text>
                </View>
            </View>
            {n.imageUri && (
                <View style={styles.imageGallery}>
                    <Image source={{ uri: n.imageUri }} style={styles.attachedImage} />
                </View>
            )}
        </View>
    );

    return (
        <ScreenContainer>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: tc.background }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={tc.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: tc.textPrimary }]}>Notifications</Text>
                <TouchableOpacity onPress={handleMarkAllRead}>
                    <Text style={styles.markReadText}>Mark all as read</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {newNotifs.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>NEW</Text>
                        {newNotifs.map(renderNotification)}
                    </View>
                )}

                {earlierNotifs.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>EARLIER</Text>
                        {earlierNotifs.map(renderNotification)}
                    </View>
                )}

                {notifications.length === 0 && (
                    <Text style={{ textAlign: 'center', marginTop: 40, color: tc.textMuted }}>No notifications yet.</Text>
                )}
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
    },
    backButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
        flex: 1,
    },
    markReadText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#D4AF37', // Gold text
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 60,
        backgroundColor: '#FCFBFA', // matching mockup off-white
    },
    section: {
        marginTop: Spacing.xl,
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: '#9CA3AF',
        marginBottom: Spacing.md,
    },
    card: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContent: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: FontFamily.bodyBold,
    },
    timeWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D4AF37',
    },
    cardMessage: {
        fontSize: 13,
        lineHeight: 18,
        fontFamily: FontFamily.body,
    },
    imageGallery: {
        flexDirection: 'row',
        gap: 8,
        marginTop: Spacing.md,
        paddingLeft: 44 + Spacing.md, // align with text
    },
    attachedImage: {
        width: 60,
        height: 80,
        borderRadius: 8,
    },
});
