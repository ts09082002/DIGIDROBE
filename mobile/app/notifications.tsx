import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { api, NotificationDto } from '../services/api';
import { Modal, Alert } from 'react-native';

type NotificationType = 'style' | 'social' | 'catalog' | 'daily' | 'comment';

type NotificationItem = {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    timeAgo: string;
    isNew: boolean;
};

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data: NotificationDto[] = await api.getNotifications();
            const mapped: NotificationItem[] = data.map((n) => {
                const date = new Date(n.createdAt);
                return {
                    id: n.id,
                    type: n.type === 'daily_outfit' ? 'daily' : 'style',
                    title: n.type === 'upload' ? 'New item added' : n.title || 'Update',
                    body: n.message,
                    timeAgo: date.toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    isNew: !n.read,
                };
            });
            setNotifications(mapped);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const hasNew = notifications.some((n) => n.isNew);
    const newItems = notifications.filter((n) => n.isNew);
    const earlierItems = notifications.filter((n) => !n.isNew);

    const markAllAsRead = () => {
        if (!hasNew) return;
        setNotifications((prev) => prev.map((n) => ({ ...n, isNew: false })));
    };

    const renderIcon = (type: NotificationType) => {
        switch (type) {
            case 'style':
                return (
                    <View style={[styles.iconBadge, { backgroundColor: '#FFF4DC' }]}>
                        <Ionicons name="star" size={16} color="#D89927" />
                    </View>
                );
            case 'social':
                return (
                    <View style={[styles.iconBadge, { backgroundColor: '#FCE4EB' }]}>
                        <Ionicons name="people" size={16} color="#D9446A" />
                    </View>
                );
            case 'catalog':
                return (
                    <View style={[styles.iconBadge, { backgroundColor: '#E3F1FF' }]}>
                        <Ionicons name="folder-open" size={16} color="#2E7CC5" />
                    </View>
                );
            case 'daily':
                return (
                    <View style={[styles.iconBadge, { backgroundColor: '#FFF4DC' }]}>
                        <Ionicons name="bulb" size={16} color="#D89927" />
                    </View>
                );
            case 'comment':
                return (
                    <View style={[styles.iconBadge, { backgroundColor: '#E9E5FF' }]}>
                        <Ionicons name="chatbubble" size={16} color="#6B5ACD" />
                    </View>
                );
            default:
                return null;
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await api.deleteNotification(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            if (selectedNotification?.id === id) {
                setSelectedNotification(null);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to delete notification');
        }
    };

    const renderNotificationCard = (item: NotificationItem, cardBg: string, surfaceBg: string, textPrimary: string, textSecondary: string) => {
        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.card, { backgroundColor: item.isNew ? surfaceBg : cardBg }, item.isNew && styles.cardNew]}
                onPress={() => setSelectedNotification(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        {renderIcon(item.type)}
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: textPrimary }]}>{item.title}</Text>
                            <Text style={[styles.cardBody, { color: textSecondary }]} numberOfLines={2}>
                                {item.body}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.cardHeaderRight}>
                        <Text style={[styles.timeAgo, { color: textSecondary }]}>{item.timeAgo}</Text>
                        {item.isNew && <View style={styles.newDot} />}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const { isDarkMode } = useTheme();
    const bg = isDarkMode ? '#1A1410' : '#FEFCF9';
    const cardBg = isDarkMode ? '#2A2018' : '#FFFFFF';
    const surfaceBg = isDarkMode ? '#332A1E' : '#F5F5F3';
    const gold = isDarkMode ? '#D4A843' : '#D4A843';
    const textPrimary = isDarkMode ? '#FFFFFF' : '#1A1A1A';
    const textSecondary = isDarkMode ? '#A09080' : '#666666';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
            <View style={[styles.header, { borderBottomColor: surfaceBg }]}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: surfaceBg }]} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textPrimary }]}>Notifications</Text>
                <TouchableOpacity
                    style={styles.markReadBtn}
                    onPress={markAllAsRead}
                    disabled={!hasNew}
                >
                    <Text
                        style={[
                            styles.markReadText,
                            { color: hasNew ? gold : textSecondary },
                        ]}
                    >
                        Mark all as read
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={gold} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ paddingBottom: Spacing.xxl }}
                    showsVerticalScrollIndicator={false}
                >
                    {newItems.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionLabel, { color: gold }]}>NEW</Text>
                            {newItems.map((n) => renderNotificationCard(n, cardBg, surfaceBg, textPrimary, textSecondary))}
                        </View>
                    )}

                    {earlierItems.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionLabel, { color: gold }]}>EARLIER</Text>
                            {earlierItems.map((n) => renderNotificationCard(n, cardBg, surfaceBg, textPrimary, textSecondary))}
                        </View>
                    )}

                    {notifications.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="notifications-off-outline" size={40} color={textSecondary} />
                            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No notifications yet</Text>
                            <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                                When there’s something new about your outfits, we’ll show it here.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Notification Details Modal */}
            <Modal
                visible={!!selectedNotification}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedNotification(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                {selectedNotification && renderIcon(selectedNotification.type)}
                                <Text style={[styles.modalTitle, { color: textPrimary }]}>{selectedNotification?.title}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedNotification(null)}>
                                <Ionicons name="close" size={24} color={textPrimary} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.modalScroll}>
                            <Text style={[styles.modalTime, { color: textSecondary }]}>{selectedNotification?.timeAgo}</Text>
                            <Text style={[styles.modalBody, { color: textPrimary }]}>{selectedNotification?.body}</Text>
                        </ScrollView>

                        <View style={[styles.modalFooter, { borderTopColor: surfaceBg }]}>
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => {
                                    if (selectedNotification) {
                                        Alert.alert(
                                            'Delete Notification',
                                            'Are you sure you want to delete this notification?',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { 
                                                    text: 'Delete', 
                                                    style: 'destructive',
                                                    onPress: () => deleteNotification(selectedNotification.id)
                                                }
                                            ]
                                        );
                                    }
                                }}
                            >
                                <Ionicons name="trash-outline" size={20} color="#FF4444" />
                                <Text style={styles.deleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    markReadBtn: {
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    markReadText: {
        fontSize: 12,
        fontWeight: '600',
    },
    scroll: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
    },
    section: {
        marginTop: Spacing.lg,
        gap: Spacing.sm,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: Spacing.xs,
    },
    card: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    cardNew: {
        borderWidth: 1,
        borderColor: '#D4A843',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        flex: 1,
    },
    cardHeaderRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    iconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    cardBody: {
        fontSize: 12,
    },
    timeAgo: {
        fontSize: 11,
    },
    newDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D4A843',
    },
    emptyState: {
        marginTop: Spacing.xxl,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: Spacing.xl,
    },

    /* Modal Styles */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    modalContent: {
        width: '100%',
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalScroll: {
        marginBottom: Spacing.xl,
    },
    modalTime: {
        fontSize: 12,
        marginBottom: Spacing.sm,
    },
    modalBody: {
        fontSize: 15,
        lineHeight: 22,
    },
    modalFooter: {
        borderTopWidth: 1,
        paddingTop: Spacing.md,
        alignItems: 'center',
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    deleteBtnText: {
        color: '#FF4444',
        fontWeight: '600',
        fontSize: 14,
    },
});

