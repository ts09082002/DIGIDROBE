import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    TextInput,
    ActivityIndicator,
    Image,
    Dimensions,
    ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { api, WardrobeItem } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TripPlan, getTripPlans, saveTripPlan, deleteTripPlan, updatePackingStatus, markAllPacked } from '../../storage/tripPlans';
import { generateOfflineTripPlan } from '../../engine/packingGenerator';

const { width } = Dimensions.get('window');

type TravelViewState = 'DASHBOARD' | 'QUESTIONNAIRE' | 'PLANNER';

export default function TravelScreen() {
    const { isDarkMode } = useTheme();
    const { user, isLoading: authLoading } = useAuth();
    const insets = useSafeAreaInsets();

    const [viewState, setViewState] = useState<TravelViewState>('DASHBOARD');
    const [savedTrips, setSavedTrips] = useState<TripPlan[]>([]);
    const [activeTrip, setActiveTrip] = useState<TripPlan | null>(null);
    const [plannerTab, setPlannerTab] = useState<'CHECKLIST' | number>(1); // Day 1, 2, 3.. or Checklist

    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<WardrobeItem[]>([]);

    // Questionnaire State
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [days, setDays] = useState('3');
    const [tripType, setTripType] = useState('Beach');
    const [mood, setMood] = useState('Comfortable');

    const theme = {
        background: isDarkMode ? '#1A1A1A' : Colors.warmGray,
        card: isDarkMode ? '#242424' : Colors.white,
        text: isDarkMode ? '#FFFFFF' : Colors.charcoal,
        textSecondary: isDarkMode ? '#A0A0A0' : Colors.darkGray,
        border: isDarkMode ? '#333333' : Colors.lightGray,
        gold: Colors.gold,
        surface: isDarkMode ? '#050505' : '#D6EAF8',
    };

    const loadTrips = useCallback(async () => {
        const trips = await getTripPlans();
        setSavedTrips(trips);
    }, []);

    const fetchWardrobe = useCallback(async () => {
        if (!authLoading && user) {
            try {
                const data = await api.getWardrobeItems(undefined);
                setItems(data || []);
            } catch (e) {
                console.log(e);
            }
        }
    }, [authLoading, user]);

    useEffect(() => {
        loadTrips();
        fetchWardrobe();
    }, [loadTrips, fetchWardrobe]);

    const handleGenerateTrip = async () => {
        if (!destination.trim()) return;
        setLoading(true);
        try {
            const start = new Date(startDate);
            const d = parseInt(days, 10) || 3;
            const end = new Date(start);
            end.setDate(start.getDate() + d - 1);

            const newTrip = generateOfflineTripPlan(items, {
                destination,
                startDate: start,
                endDate: end,
                tripType,
                mood
            });

            await saveTripPlan(newTrip);
            setActiveTrip(newTrip);
            setViewState('PLANNER');
            setPlannerTab(1); // Default to Day 1
            loadTrips();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePackToggle = async (itemId: string, packed: boolean) => {
        if (!activeTrip) return;
        await updatePackingStatus(activeTrip.id, itemId, packed);
        const updated = await getTripPlans();
        const refresh = updated.find(t => t.id === activeTrip.id);
        if (refresh) setActiveTrip(refresh);
    };

    const handleMarkAllPacked = async () => {
        if (!activeTrip) return;
        await markAllPacked(activeTrip.id);
        const updated = await getTripPlans();
        const refresh = updated.find(t => t.id === activeTrip.id);
        if (refresh) setActiveTrip(refresh);
    };

    const handleSyncToCalendar = async () => {
        if (!activeTrip) return;
        setLoading(true);
        try {
            const start = new Date(activeTrip.startDate);
            for (const day of activeTrip.dailyOutfits) {
                const dateForDay = new Date(start);
                dateForDay.setDate(start.getDate() + day.dayNumber - 1);
                const isoDate = dateForDay.toISOString().split('T')[0];
                const itemIds = day.items.map(i => i.id);
                // Push to calendar via api payload
                await api.saveOOTD(isoDate, itemIds, `[${activeTrip.name}] ${day.title}`);
            }
            alert("Trip Outfits Synced to your Wardora Calendar!");
        } catch (e) {
            console.error("Failed to sync to calendar", e);
            alert("Failed to sync some days to the calendar.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTrip = async (id: string) => {
        await deleteTripPlan(id);
        if (activeTrip?.id === id) setViewState('DASHBOARD');
        loadTrips();
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDERING
    // ─────────────────────────────────────────────────────────────────────────
    
    if (viewState === 'DASHBOARD') {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>My Trips</Text>
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <TouchableOpacity
                        style={[styles.bigCreateBtn, { backgroundColor: theme.gold }]}
                        onPress={() => setViewState('QUESTIONNAIRE')}
                    >
                        <Ionicons name="airplane" size={24} color="#FFF" />
                        <Text style={styles.bigCreateBtnTxt}>Plan a New Trip</Text>
                    </TouchableOpacity>

                    {savedTrips.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Ionicons name="compass-outline" size={60} color={theme.textSecondary} />
                            <Text style={[{ color: theme.textSecondary, marginTop: 15 }]}>No saved trips yet. Better get planning!</Text>
                        </View>
                    ) : (
                        <View style={styles.tripList}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Saved Plans</Text>
                            {savedTrips.map(trip => (
                                <TouchableOpacity
                                    key={trip.id}
                                    style={[styles.tripCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                                    onPress={() => {
                                        setActiveTrip(trip);
                                        setPlannerTab(1);
                                        setViewState('PLANNER');
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.tripCardTitle, { color: theme.text }]}>{trip.name}</Text>
                                        <Text style={[styles.tripCardSub, { color: theme.textSecondary }]}>{trip.tripType} • {trip.daysCount} Days</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity onPress={() => handleDeleteTrip(trip.id)} style={{ padding: 10 }}>
                                        <Ionicons name="trash-outline" size={20} color="red" />
                                    </TouchableOpacity>
                                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} style={{ padding: 10 }} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (viewState === 'QUESTIONNAIRE') {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={[styles.headerNav, { paddingTop: insets.top }]}>
                    <TouchableOpacity onPress={() => setViewState('DASHBOARD')} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerNavTitle, { color: theme.text }]}>Trip Details</Text>
                    <View style={{ width: 40 }} />
                </View>
                <ScrollView contentContainerStyle={styles.formContent}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>WHERE TO?</Text>
                    <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="e.g. Goa, Paris" placeholderTextColor={theme.textSecondary} value={destination} onChangeText={setDestination} />

                    <View style={{ flexDirection: 'row', gap: 15, marginTop: 15 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>START DATE (YYYY-MM-DD)</Text>
                            <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} value={startDate} onChangeText={setStartDate} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>DAYS</Text>
                            <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} value={days} keyboardType="numeric" onChangeText={setDays} />
                        </View>
                    </View>

                    <Text style={[styles.label, { color: theme.textSecondary, marginTop: 15 }]}>TRIP TYPE</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 5 }}>
                        {['Beach', 'City', 'Trekking', 'Business'].map(type => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => setTripType(type)}
                                style={[styles.chip, tripType === type ? { backgroundColor: theme.gold, borderColor: theme.gold } : { borderColor: theme.border, backgroundColor: theme.surface }]}
                            >
                                <Text style={[styles.chipTxt, tripType === type ? { color: '#FFF' } : { color: theme.text }]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={[styles.label, { color: theme.textSecondary, marginTop: 15 }]}>STYLE MOOD</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 5 }}>
                        {['Comfortable', 'Fashionable', 'Minimalist'].map(m => (
                            <TouchableOpacity
                                key={m}
                                onPress={() => setMood(m)}
                                style={[styles.chip, mood === m ? { backgroundColor: theme.gold, borderColor: theme.gold } : { borderColor: theme.border, backgroundColor: theme.surface }]}
                            >
                                <Text style={[styles.chipTxt, mood === m ? { color: '#FFF' } : { color: theme.text }]}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={[styles.bigCreateBtn, { backgroundColor: theme.gold, marginTop: 30 }]} onPress={handleGenerateTrip} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bigCreateBtnTxt}>Generate Offline Plan</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (viewState === 'PLANNER' && activeTrip) {
        // Planner Header Matching Mockup
        const { dailyOutfits, packingList, missingCategories } = activeTrip;
        const totalItems = packingList.length;
        const packedItems = packingList.filter(l => l.packed).length;
        const progress = totalItems === 0 ? 0 : packedItems / totalItems;

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Custom Header */}
                <View style={[styles.plannerTopHeader, { paddingTop: insets.top, backgroundColor: theme.card }]}>
                     <TouchableOpacity onPress={() => setViewState('DASHBOARD')} style={{ padding: 10 }}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.plannerTopTitle, { color: theme.text }]}>Travel Outfit Planner</Text>
                        <Text style={[styles.plannerTopSub, { color: theme.gold }]}>WARDORA OFFLINE</Text>
                    </View>
                    <TouchableOpacity onPress={handleSyncToCalendar} style={{ padding: 10 }}>
                        <Ionicons name="calendar-outline" size={24} color={theme.gold} />
                    </TouchableOpacity>
                </View>

                {/* Trip Banner Header */}
                <View style={[styles.plannerTripHeader, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.tripHeroName, { color: theme.text }]}>{activeTrip.name}</Text>
                    <Text style={[styles.tripHeroDates, { color: theme.textSecondary }]}>
                        <Ionicons name="calendar-outline" size={12} /> {activeTrip.startDate} • {activeTrip.daysCount} Days
                    </Text>
                </View>

                {/* Horizontal Tab Strip */}
                <View style={{ backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>
                        {dailyOutfits.map(day => (
                            <TouchableOpacity key={day.dayNumber} style={[styles.tabBtn, plannerTab === day.dayNumber && { borderBottomColor: theme.gold, borderBottomWidth: 2 }]} onPress={() => setPlannerTab(day.dayNumber)}>
                                <Text style={[styles.tabTxt, plannerTab === day.dayNumber ? { color: theme.gold, fontWeight: '700' } : { color: theme.textSecondary }]}>DAY {day.dayNumber}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={[styles.tabBtn, plannerTab === 'CHECKLIST' && { borderBottomColor: theme.gold, borderBottomWidth: 2 }]} onPress={() => setPlannerTab('CHECKLIST')}>
                            <Text style={[styles.tabTxt, plannerTab === 'CHECKLIST' ? { color: theme.gold, fontWeight: '700' } : { color: theme.textSecondary }]}>CHECKLIST</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 100 }}>
                    {plannerTab === 'CHECKLIST' ? (
                        <>
                            <View style={[styles.progressBox, { backgroundColor: theme.card }]}>
                                <Text style={[styles.progressTxt, { color: theme.text }]}>{Math.round(progress * 100)}% Packed</Text>
                                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                                    <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.gold }]} />
                                </View>
                                <TouchableOpacity onPress={handleMarkAllPacked} style={{ marginTop: 15, alignSelf: 'center' }}><Text style={{ color: theme.gold, fontWeight: '600' }}>Mark all packed</Text></TouchableOpacity>
                            </View>

                            {missingCategories.length > 0 && (
                                <View style={styles.missingAlert}>
                                    <Ionicons name="alert-circle" size={20} color="#D32F2F" />
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={{ color: '#D32F2F', fontWeight: '700', fontSize: 13 }}>Missing Important Items</Text>
                                        <Text style={{ color: '#D32F2F', fontSize: 12, marginTop: 2 }}>You don't have: {missingCategories.join(', ')}</Text>
                                    </View>
                                </View>
                            )}

                            <View style={{ marginTop: 20 }}>
                                {packingList.map(itm => (
                                    <View key={itm.id} style={[styles.checklistItem, { borderBottomColor: theme.border }]}>
                                        <TouchableOpacity onPress={() => handlePackToggle(itm.id, !itm.packed)}>
                                            <Ionicons name={itm.packed ? "checkbox" : "square-outline"} size={26} color={itm.packed ? theme.gold : theme.textSecondary} />
                                        </TouchableOpacity>
                                        <Image source={{ uri: api.getImageUrl(itm.item.processedUrl || itm.item.originalUrl) }} style={styles.checkImg} resizeMode="contain" />
                                        <Text style={[styles.checkTxt, { color: theme.text, textDecorationLine: itm.packed ? 'line-through' : 'none' }]}>{itm.item.name || itm.item.category}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    ) : (
                        <View>
                            {/* All Days View */}
                            {dailyOutfits.map(day => (
                                <View key={day.dayNumber} style={styles.dayBlock}>
                                    <View style={styles.dayHeaderRow}>
                                        <Text style={[styles.dayTitle, { color: theme.textSecondary }]}>DAY {day.dayNumber}: {day.title.toUpperCase()}</Text>
                                        <View style={[styles.weatherChip, { backgroundColor: '#F0F4F8' }]}>
                                            <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600' }}>{day.weatherLabel}</Text>
                                        </View>
                                    </View>

                                    {/* The White Card containing Image + Items */}
                                    <View style={[styles.dayCardWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                        <ImageBackground
                                            source={{ uri: 'https://images.unsplash.com/photo-1544365558-35aa4afcf11f?w=900&q=80' }} // Mock hero Mockup image
                                            style={styles.heroImg}
                                        >
                                            <TouchableOpacity style={[styles.editOutfitBtn, { backgroundColor: theme.card }]}>
                                                <Ionicons name="pencil" size={14} color={theme.text} />
                                                <Text style={[styles.editOutfitTxt, { color: theme.text }]}>Edit Outfit</Text>
                                            </TouchableOpacity>
                                        </ImageBackground>

                                        <View style={styles.dailyItemsGrid}>
                                            {day.items.map(itm => (
                                                <View key={itm.id} style={[styles.dayItemCard, { backgroundColor: theme.background }]}>
                                                    <Image source={{ uri: api.getImageUrl(itm.processedUrl || itm.originalUrl) }} style={styles.dayItemImg} resizeMode="cover" />
                                                    <Text style={[styles.dayItemTxt, { color: theme.textSecondary }]} numberOfLines={1}>{itm.name || itm.category}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            ))}
                            
                            {/* Footer Matching Mockup */}
                            <ImageBackground
                                source={{ uri: 'https://images.unsplash.com/photo-1498569614210-6b6f7091cc77?w=1000&q=80' }}
                                style={styles.routeMapImg}
                                imageStyle={{ borderRadius: 12 }}
                            >
                                <View style={styles.routeMapBtn}>
                                    <Text style={styles.routeMapTxt}>VIEW ROUTE MAP</Text>
                                </View>
                            </ImageBackground>

                            <TouchableOpacity style={[styles.bigSaveBtn, { backgroundColor: theme.gold }]} onPress={() => setViewState('DASHBOARD')}>
                                <Ionicons name="save" size={20} color="#000" />
                                <Text style={styles.bigSaveBtnTxt}>SAVE TRIP PLAN</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm },
    headerTitle: { ...Typography.heading1 },
    scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: 20 },
    
    // Dashboard elements
    bigCreateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60, borderRadius: 16, gap: 10 },
    bigCreateBtnTxt: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 30, marginBottom: 15 },
    tripList: { gap: 15 },
    tripCard: { padding: 15, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
    tripCardTitle: { fontSize: 18, fontWeight: '600' },
    tripCardSub: { fontSize: 13, marginTop: 4 },

    // Questionnaire
    headerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingBottom: 15 },
    headerNavTitle: { fontSize: 18, fontWeight: '600' },
    backBtn: { padding: 10, marginLeft: -10 },
    formContent: { paddingHorizontal: Spacing.xl, paddingVertical: 20 },
    label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
    input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontSize: 16 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
    chipTxt: { fontSize: 14, fontWeight: '600' },

    // Planner UI Mockup Elements
    plannerTopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingBottom: 10 },
    plannerTopTitle: { fontSize: 16, fontWeight: '700' },
    plannerTopSub: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
    plannerTripHeader: { padding: 20, alignItems: 'center' },
    tripHeroName: { fontSize: 24, fontWeight: '800' },
    tripHeroDates: { fontSize: 13, marginTop: 6 },
    tabStrip: { paddingHorizontal: 20, gap: 5 },
    tabBtn: { paddingVertical: 15, paddingHorizontal: 15 },
    tabTxt: { fontSize: 12, fontWeight: '600', letterSpacing: 1 },

    dayHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    dayTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
    weatherChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    dayBlock: { marginBottom: 35 },
    dayCardWrapper: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
    heroImg: { width: '100%', height: 230, justifyContent: 'flex-end', alignItems: 'flex-end', padding: 15 },
    editOutfitBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, gap: 5 },
    editOutfitTxt: { fontSize: 13, fontWeight: '700' },

    dailyItemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 15 },
    dayItemCard: { width: '31%', borderRadius: 8, padding: 8, alignItems: 'center' },
    dayItemImg: { width: 50, height: 60, marginBottom: 5, borderRadius: 4 },
    dayItemTxt: { fontSize: 11, textAlign: 'center', fontWeight: '500' },

    routeMapImg: { width: '100%', height: 120, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    routeMapBtn: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    routeMapTxt: { color: '#FFF', fontWeight: '700', fontSize: 13, letterSpacing: 1 },
    bigSaveBtn: { flexDirection: 'row', backgroundColor: Colors.gold, borderRadius: 12, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 30, gap: 10 },
    bigSaveBtnTxt: { color: '#000', fontWeight: '800', fontSize: 16 },

    // Checklist
    progressBox: { padding: 20, borderRadius: 16, marginBottom: 20 },
    progressTxt: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
    progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%' },
    missingAlert: { backgroundColor: '#FFEBEE', flexDirection: 'row', padding: 15, borderRadius: 12, alignItems: 'center' },
    checklistItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    checkImg: { width: 40, height: 40, marginHorizontal: 15 },
    checkTxt: { fontSize: 16, fontWeight: '500' }
});
