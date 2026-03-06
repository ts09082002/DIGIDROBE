import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    TextInput,
    ActivityIndicator,
    Share,
    Image,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { api, WardrobeItem } from '../../services/api';
import { Toast } from '../../components/Toast';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function TravelScreen() {
    const { isDarkMode } = useTheme();
    const [destination, setDestination] = useState('');
    const [days, setDays] = useState('3');
    const [loading, setLoading] = useState(false);
    const [packingList, setPackingList] = useState<WardrobeItem[] | null>(null);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
    const insets = useSafeAreaInsets();

    const theme = {
        background: isDarkMode ? '#1A1A1A' : Colors.warmGray,
        card: isDarkMode ? '#242424' : Colors.white,
        text: isDarkMode ? '#FFFFFF' : Colors.charcoal,
        textSecondary: isDarkMode ? '#A0A0A0' : Colors.darkGray,
        border: isDarkMode ? '#333333' : Colors.lightGray,
        gold: Colors.gold,
    };

    const handleGenerate = async () => {
        if (!destination.trim()) {
            setToastType('error');
            setToastMessage('Please enter a destination');
            setToastVisible(true);
            return;
        }
        const d = parseInt(days, 10);
        if (isNaN(d) || d < 1) {
            setToastType('error');
            setToastMessage('Please enter a valid number of days');
            setToastVisible(true);
            return;
        }

        try {
            setLoading(true);
            const list = await api.generatePackingList(destination, d);
            setPackingList(list);
        } catch (e) {
            setToastType('error');
            setToastMessage('Failed to generate packing list');
            setToastVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!packingList?.length) return;

        const intro = `My packing list for ${destination} (${days} days) made with Digidrobe:\n`;
        const items = packingList.map(i => `- ${i.name || i.category}`).join('\n');

        try {
            await Share.share({
                message: intro + '\n' + items,
            });
        } catch (error: any) {
            setToastType('error');
            setToastMessage(error.message || 'Could not share packing list');
            setToastVisible(true);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Travel Pack</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >

                {/* Form Section */}
                <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>DESTINATION</Text>
                    <View style={[styles.inputContainer, { borderColor: theme.border, backgroundColor: theme.background }]}>
                        <Ionicons name="location" size={20} color={theme.textSecondary} />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            placeholder="Where to?"
                            placeholderTextColor={theme.textSecondary}
                            value={destination}
                            onChangeText={setDestination}
                        />
                    </View>

                    <Text style={[styles.label, { color: theme.textSecondary, marginTop: 15 }]}>DURATION (DAYS)</Text>
                    <View style={[styles.inputContainer, { borderColor: theme.border, backgroundColor: theme.background }]}>
                        <Ionicons name="calendar-clear" size={20} color={theme.textSecondary} />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            placeholder="e.g. 3"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numeric"
                            value={days}
                            onChangeText={setDays}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.generateBtn, { backgroundColor: theme.gold }]}
                        onPress={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <Ionicons name="flash" size={18} color={Colors.white} />
                                <Text style={styles.generateBtnText}>Generate Packing List</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Results Section */}
                {packingList !== null && (
                    <View style={styles.resultsContainer}>
                        <View style={styles.resultsHeader}>
                            <Text style={[styles.resultsTitle, { color: theme.text }]}>Your List</Text>
                            <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
                                <Ionicons name="share-outline" size={20} color={theme.gold} />
                                <Text style={[styles.shareText, { color: theme.gold }]}>Share</Text>
                            </TouchableOpacity>
                        </View>

                        {packingList.length === 0 ? (
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                Add items to your wardrobe first to get suggestions!
                            </Text>
                        ) : (
                            <View style={styles.grid}>
                                {packingList.map((item, index) => (
                                    <View key={index} style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                        <Image
                                            source={{ uri: api.getImageUrl(item.processedUrl) }}
                                            style={styles.itemImage}
                                            resizeMode="contain"
                                        />
                                        <View style={styles.itemInfo}>
                                            <Text style={[styles.itemCategory, { color: theme.textSecondary }]} numberOfLines={1}>
                                                {item.name || item.category}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
            <Toast
                visible={toastVisible}
                type={toastType}
                message={toastMessage}
                onHide={() => setToastVisible(false)}
            />
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
        paddingHorizontal: Spacing.xl,
        paddingTop: 0,
        paddingBottom: Spacing.sm,
    },
    headerTitle: {
        ...Typography.heading1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 100,
    },
    formCard: {
        marginHorizontal: Spacing.xl,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    generateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        borderRadius: 14,
        marginTop: 25,
        gap: 8,
    },
    generateBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    resultsContainer: {
        marginTop: 30,
        paddingHorizontal: Spacing.xl,
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    resultsTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    shareText: {
        fontSize: 15,
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 15,
        fontStyle: 'italic',
        marginTop: 10,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 15,
    },
    itemCard: {
        width: CARD_WIDTH,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: CARD_WIDTH * 1.2,
        backgroundColor: '#F0F0F0',
        resizeMode: 'cover',
    },
    itemInfo: {
        padding: 10,
        alignItems: 'center',
    },
    itemCategory: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
});



