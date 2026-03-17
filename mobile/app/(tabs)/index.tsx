import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ImageBackground,
    Dimensions,
    StatusBar,
    Platform,
    FlatList,
    ActivityIndicator,
    Alert,
    Switch,
    Modal,
    Animated,
} from 'react-native';
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { api, WardrobeItem } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { normalizeCategory } from '../../constants/categories';
import { generateStyleOfDayForWardrobe } from '../../engine';
import { RecommendationContext } from '../../engine/types';
import { generateOutfitDescription } from '../../engine/textGenerator';

const { width: SW } = Dimensions.get('window');

const STAGE_H = 460;
const CX = SW / 2; // canvas center x

// ─────────────────────────────────────────────────────────────────────────────
//  INDIVIDUAL DRAGGABLE + PINCH-RESIZABLE ITEM
// ─────────────────────────────────────────────────────────────────────────────
interface DraggableItemProps {
    item: WardrobeItem | null;
    initX: number;
    initY: number;
    itemW: number;
    itemH: number;
    iconName: string;
    surfaceBg: string;
    emptyIconColor: string;
}

function DraggableClothingItem({ item, initX, initY, itemW, itemH, iconName, surfaceBg, emptyIconColor }: DraggableItemProps) {
    const panRef   = useRef<any>(null);
    const pinchRef = useRef<any>(null);

    // Position animated values — initialised at item position
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const posOffset  = useRef({ x: initX, y: initY });

    // Scale animated values — multiply base × live-pinch-delta
    const baseScale  = useRef(new Animated.Value(1)).current;
    const pinchDelta = useRef(new Animated.Value(1)).current;
    const scale      = Animated.multiply(baseScale, pinchDelta);
    const savedScale = useRef(1);

    // Set initial offset once
    useEffect(() => {
        translateX.setOffset(initX);
        translateX.setValue(0);
        translateY.setOffset(initY);
        translateY.setValue(0);
    }, []);

    // ── Pan handlers ──────────────────────────────────────────────────────────
    const onPanEvent = Animated.event(
        [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
        { useNativeDriver: true },
    );

    const onPanStateChange = (e: any) => {
        if (e.nativeEvent.oldState === State.ACTIVE) {
            posOffset.current.x += e.nativeEvent.translationX;
            posOffset.current.y += e.nativeEvent.translationY;
            translateX.setOffset(posOffset.current.x);
            translateX.setValue(0);
            translateY.setOffset(posOffset.current.y);
            translateY.setValue(0);
        }
    };

    // ── Pinch handlers ────────────────────────────────────────────────────────
    const onPinchEvent = Animated.event(
        [{ nativeEvent: { scale: pinchDelta } }],
        { useNativeDriver: true },
    );

    const onPinchStateChange = (e: any) => {
        if (e.nativeEvent.oldState === State.ACTIVE) {
            savedScale.current = Math.max(0.25, Math.min(3, savedScale.current * e.nativeEvent.scale));
            baseScale.setValue(savedScale.current);
            pinchDelta.setValue(1);
        }
    };

    const url = item ? (item.processedUrl || item.originalUrl) : null;

    return (
        <PinchGestureHandler
            ref={pinchRef}
            onGestureEvent={onPinchEvent}
            onHandlerStateChange={onPinchStateChange}
            simultaneousHandlers={panRef}
        >
            <Animated.View style={{ position: 'absolute', top: 0, left: 0 }}>
                <PanGestureHandler
                    ref={panRef}
                    onGestureEvent={onPanEvent}
                    onHandlerStateChange={onPanStateChange}
                    simultaneousHandlers={pinchRef}
                    minDist={4}
                >
                    <Animated.View style={{
                        width: itemW,
                        height: itemH,
                        transform: [
                            { translateX },
                            { translateY },
                            { scale },
                        ],
                    }}>
                        {/* ── content box ── */}
                        <View style={{
                            width: '100%', height: '100%',
                            backgroundColor: url ? 'transparent' : surfaceBg,
                            borderRadius: 14,
                            overflow: 'hidden',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: url ? 0 : 1,
                            borderColor: 'rgba(93,173,226,0.25)',
                            borderStyle: 'dashed',
                        }}>
                            {url ? (
                                <Image
                                    source={{ uri: api.getImageUrl(url) }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="contain"
                                />
                            ) : (
                                <Ionicons name={iconName as any} size={28} color={emptyIconColor} />
                            )}
                        </View>
                    </Animated.View>
                </PanGestureHandler>
            </Animated.View>
        </PinchGestureHandler>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  OUTFIT CANVAS  — free-floating items on a fixed stage
// ─────────────────────────────────────────────────────────────────────────────
function OutfitCanvas({
    isDarkMode,
    topItem, bottomItem, footwearItem,
    surfaceBg,
}: {
    isDarkMode: boolean;
    topItem: WardrobeItem | null;
    bottomItem: WardrobeItem | null;
    footwearItem: WardrobeItem | null;
    surfaceBg: string;
}) {
    const emptyIconColor = isDarkMode ? '#6A5E52' : '#C0B8B0';

    // Item natural sizes
    const TOP_W = 150; const TOP_H = 140;
    const BOT_W = 140; const BOT_H = 155;
    const SHO_W = 130; const SHO_H = 90;

    // Centered positions
    const topX = CX - TOP_W / 2;
    const botX = CX - BOT_W / 2;
    const shoX = CX - SHO_W / 2;

    return (
        <View style={{ width: SW, height: STAGE_H }}>
            {/* ── TOP (shirt / blouse) ── */}
            <DraggableClothingItem
                item={topItem}
                initX={topX} initY={20}
                itemW={TOP_W} itemH={TOP_H}
                iconName="shirt-outline"
                surfaceBg={surfaceBg} emptyIconColor={emptyIconColor}
            />

            {/* ── BOTTOM (trousers / skirt) ── */}
            <DraggableClothingItem
                item={bottomItem}
                initX={botX} initY={175}
                itemW={BOT_W} itemH={BOT_H}
                iconName="triangle-outline"
                surfaceBg={surfaceBg} emptyIconColor={emptyIconColor}
            />

            {/* ── FOOTWEAR (shoes / boots) ── */}
            <DraggableClothingItem
                item={footwearItem}
                initX={shoX} initY={340}
                itemW={SHO_W} itemH={SHO_H}
                iconName="walk-outline"
                surfaceBg={surfaceBg} emptyIconColor={emptyIconColor}
            />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ITEM SCROLL ROW
// ─────────────────────────────────────────────────────────────────────────────
const THUMB = 74;

function ItemRow({ label, icon, items, selected, onSelect, gold, surfaceBg, tp, tm }: {
    label: string; icon: string;
    items: WardrobeItem[];
    selected: WardrobeItem | null;
    onSelect: (i: WardrobeItem | null) => void;
    gold: string; surfaceBg: string; tp: string; tm: string;
}) {
    if (items.length === 0) return null;
    return (
        <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 8 }}>
                <Ionicons name={icon as any} size={13} color={gold} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: tp }}>{label}</Text>
                {selected && <Text style={{ fontSize: 11, color: tm, flex: 1 }} numberOfLines={1}>{selected.name}</Text>}
            </View>
            <FlatList
                data={items}
                horizontal
                keyExtractor={(i) => i.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                renderItem={({ item }) => {
                    const url = item.processedUrl || item.originalUrl;
                    const resolved = url ? api.getImageUrl(url) : null;
                    const isSel = selected?.id === item.id;
                    return (
                        <TouchableOpacity
                            onPress={() => onSelect(isSel ? null : item)}
                            activeOpacity={0.75}
                            style={{
                                width: THUMB, height: THUMB, borderRadius: 14,
                                backgroundColor: surfaceBg,
                                overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
                                position: 'relative',
                                borderWidth: isSel ? 2.5 : 0,
                                borderColor: gold,
                            }}
                        >
                            {resolved ? (
                                <Image source={{ uri: resolved }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                            ) : (
                                <Ionicons name="shirt-outline" size={22} color={tm} />
                            )}
                            {isSel && (
                                <View style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: gold, justifyContent: 'center', alignItems: 'center' }}>
                                    <Ionicons name="checkmark" size={9} color="#000" />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TIME OF DAY
// ─────────────────────────────────────────────────────────────────────────────
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
function getTimeOfDay(): TimeOfDay {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 21) return 'evening';
    return 'night';
}
const GREET: Record<TimeOfDay, string> = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Good night' };

const TOD_IMAGES: Record<TimeOfDay, string[]> = {
    morning:   [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=75',
        'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=900&q=75',
        'https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=900&q=75'
    ],
    afternoon: [
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=75',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&q=75',
        'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=900&q=75'
    ],
    evening:   [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=75',
        'https://images.unsplash.com/photo-1472120435266-53107fd0c44a?w=900&q=75',
        'https://images.unsplash.com/photo-1460352828695-1f9175d27df8?w=900&q=75'
    ],
    night:     [
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=75',
        'https://images.unsplash.com/photo-1488161628813-04466f872507?w=900&q=75',
        'https://images.unsplash.com/photo-1445233566136-a2bbcb52c038?w=900&q=75'
    ],
};

const TOD_ICONS: Record<TimeOfDay, string> = {
    morning: 'sunny-outline', afternoon: 'partly-sunny-outline',
    evening: 'sunset-outline', night: 'moon-outline',
};

const TOD_TIPS: Record<TimeOfDay, string> = {
    morning:   'Start fresh — pick your look for today',
    afternoon: 'Keep it sharp for the afternoon ahead',
    evening:   'Golden hour calls for a standout outfit',
    night:     'Dress to impress for the night out',
};

// ─────────────────────────────────────────────────────────────────────────────
//  HOME SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
    const { user, isLoading: authLoading } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const router = useRouter();

    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [notifCount, setNotifCount] = useState(0);
    const [menuVisible, setMenuVisible] = useState(false);
    const [arMode, setArMode] = useState(false);
    const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay());
    const [todImage, setTodImage] = useState<string>('');

    // Banner Modal
    const [bannerModalVisible, setBannerModalVisible] = useState(false);
    const [bannerLoading, setBannerLoading] = useState(false);
    const [bannerAiText, setBannerAiText] = useState('');
    const [bannerOutfit, setBannerOutfit] = useState<WardrobeItem[]>([]);

    // Set a random image for the current time of day
    const updateTodImage = useCallback((currentTod: TimeOfDay) => {
        const pool = TOD_IMAGES[currentTod] || TOD_IMAGES['morning'];
        if (pool && pool.length > 0) {
            const r = Math.floor(Math.random() * pool.length);
            setTodImage(pool[r]);
        }
    }, []);

    useEffect(() => {
        updateTodImage(timeOfDay);
    }, [timeOfDay, updateTodImage]);

    const [selectedTop, setSelectedTop] = useState<WardrobeItem | null>(null);
    const [selectedBottom, setSelectedBottom] = useState<WardrobeItem | null>(null);
    const [selectedFootwear, setSelectedFootwear] = useState<WardrobeItem | null>(null);

    const bg        = isDarkMode ? '#000000' : '#F4F9FD';
    const cardBg    = isDarkMode ? '#0D0D0D' : '#FFFFFF';
    const surfaceBg = isDarkMode ? '#1A1A1A' : '#E8F4FB';
    const gold      = '#5DADE2';
    const goldLight = '#AED6F1';
    const tp        = isDarkMode ? '#FFFFFF' : '#1A1A1A';
    const ts        = isDarkMode ? '#8899AA' : '#666666';
    const tm        = isDarkMode ? '#3A4A55' : '#AAAAAA';
    const stageBg   = isDarkMode ? '#050505' : '#D6EAF8';

    useEffect(() => {
        const id = setInterval(() => {
            const nextTod = getTimeOfDay();
            if (nextTod !== timeOfDay) {
                setTimeOfDay(nextTod);
            }
        }, 300_000);
        return () => clearInterval(id);
    }, [timeOfDay]);

    const fetchItems = useCallback(async () => {
        if (authLoading || !user) return;
        try {
            setLoading(true);
            const data = await api.getWardrobeItems(undefined);
            const mapped = (data || []).map((i: WardrobeItem) => ({ ...i, category: normalizeCategory(i.category) }));
            setItems(mapped);
            setSelectedTop(mapped.find((i: WardrobeItem) => i.category === 'topwear') ?? null);
            setSelectedBottom(mapped.find((i: WardrobeItem) => i.category === 'bottomwear') ?? null);
            setSelectedFootwear(mapped.find((i: WardrobeItem) => i.category === 'footwear') ?? null);
        } catch { setItems([]); } finally { setLoading(false); }
    }, [authLoading, user]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const fetchNotifs = useCallback(async () => {
        if (authLoading || !user) return;
        try { const d = await api.getNotifications(); setNotifCount(d.filter((n: any) => !n.read).length); } catch { }
    }, [authLoading, user]);

    useEffect(() => {
        fetchNotifs();
        const id = setInterval(fetchNotifs, 30_000);
        return () => clearInterval(id);
    }, [fetchNotifs]);

    useEffect(() => {
        if (user && !authLoading) api.claimGuestItems().then((r: any) => { if (r.count > 0) fetchItems(); }).catch(() => { });
    }, [user, authLoading]);

    const tops      = items.filter(i => i.category === 'topwear');
    const bottoms   = items.filter(i => i.category === 'bottomwear');
    const footwears = items.filter(i => i.category === 'footwear');
    const hasAny    = tops.length > 0 || bottoms.length > 0 || footwears.length > 0;
    const hasSel    = !!(selectedTop || selectedBottom || selectedFootwear);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={bg} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <View style={styles.logoBadge}><Ionicons name="diamond" size={13} color="#000" /></View>
                    <Text style={[styles.logoText, { color: tp }]}>Wardora</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => router.push('/notifications')} style={[styles.iconBtn, { backgroundColor: surfaceBg }]}>
                        <Ionicons name="notifications-outline" size={19} color={ts} />
                        {notifCount > 0 && <View style={[styles.notifDot, { backgroundColor: gold }]}><Text style={styles.notifDotTxt}>{notifCount}</Text></View>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMenuVisible(true)} style={[styles.iconBtn, { backgroundColor: surfaceBg }]}>
                        <Ionicons name="ellipsis-horizontal" size={19} color={ts} />
                    </TouchableOpacity>
                    <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                        <View style={styles.menuOverlay}>
                            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setMenuVisible(false)} />
                            <View style={[styles.menuBox, { backgroundColor: cardBg }]}>
                                <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuVisible(false); router.push('/(tabs)/profile'); }}>
                                    <Ionicons name="person-circle-outline" size={20} color={ts} /><Text style={[styles.menuTxt, { color: tp }]}>Profile</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuVisible(false); router.push('/about'); }}>
                                    <Ionicons name="information-circle-outline" size={20} color={ts} /><Text style={[styles.menuTxt, { color: tp }]}>About Us</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuRow} onPress={() => { toggleTheme(); setMenuVisible(false); }}>
                                    <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={20} color={ts} /><Text style={[styles.menuTxt, { color: tp }]}>{isDarkMode ? 'Light mode' : 'Dark mode'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                    {/* AR Switch removed per user request */}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

                {/* ── Time-of-Day Banner Card ── */}
                <TouchableOpacity 
                    activeOpacity={0.9} 
                    onPress={async () => {
                        setBannerModalVisible(true);
                        if (items.length < 2) {
                            setBannerAiText("I need a few more items in your wardrobe to generate a full look. Try uploading a top, bottom, and some shoes!");
                            setBannerOutfit([]);
                            return;
                        }
                        setBannerLoading(true);
                        try {
                            // Mocking context/location since there is no live location API connected
                            const context: RecommendationContext = {
                                temperatureC: timeOfDay === 'night' ? 14 : timeOfDay === 'morning' ? 19 : 25,
                                weather: 'sunny',
                                occasion: 'casual',
                                dayOfWeek: new Date().getDay(),
                                timeOfDay: timeOfDay
                            };
                            const loc = { city: 'Mumbai', country: 'India' }; // Mock location

                            const rootStyle = await generateStyleOfDayForWardrobe(items, context, new Date().toISOString());
                            
                            if (rootStyle && rootStyle.scores.itemIds.length > 0) {
                                const outfitItems = items.filter(it => rootStyle.scores.itemIds.includes(it.id));
                                setBannerOutfit(outfitItems);
                                // Cast to any to bypass engine specific maps for quick generator
                                setBannerAiText(generateOutfitDescription(outfitItems as any, context, loc));
                            } else {
                                setBannerAiText("Looks like you have clothes, but I couldn't piece together a full matching outfit today.");
                                setBannerOutfit([]);
                            }
                        } catch (e) {
                            setBannerAiText("Something went wrong while asking the Stylist.");
                            setBannerOutfit([]);
                        } finally {
                            setBannerLoading(false);
                        }
                    }}
                >
                    <ImageBackground
                        source={{ uri: todImage || TOD_IMAGES['morning'][0] }}
                        style={styles.todCard}
                        imageStyle={styles.todCardImg}
                        resizeMode="cover"
                    >
                        {/* gradient-like dark scrim for legibility */}
                        <View style={styles.todScrim}>
                        <View style={styles.todContent}>
                            {/* left — greeting + tip */}
                            <View style={{ flex: 1, gap: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                                    <Ionicons name={TOD_ICONS[timeOfDay] as any} size={18} color={gold} />
                                    <Text style={styles.todGreet}>{GREET[timeOfDay]}</Text>
                                </View>
                                <Text style={styles.todName} numberOfLines={1}>
                                    {(user as any)?.name || (user as any)?.username || 'Stylist'}
                                </Text>
                                <Text style={styles.todTip} numberOfLines={2}>{TOD_TIPS[timeOfDay]}</Text>
                            </View>

                            {/* right — wardrobe count pill */}
                            <View style={styles.todCountPill}>
                                <Ionicons name="shirt" size={12} color={gold} />
                                <Text style={styles.todCountTxt}>{items.length}</Text>
                                <Text style={[styles.todCountTxt, { opacity: 0.7, fontSize: 9 }]}>items</Text>
                            </View>
                        </View>

                        {/* bottom strip — occasion hint */}
                        <View style={styles.todStrip}>
                            <Ionicons name="sparkles" size={11} color={gold} />
                            <Text style={styles.todStripTxt}>Tap occasion chips in Outfits to get AI suggestions</Text>
                        </View>
                        </View>
                    </ImageBackground>
                </TouchableOpacity>

                {/* Canvas hint */}
                <View style={styles.canvasHint}>
                    <Ionicons name="hand-left-outline" size={12} color="rgba(160,130,60,0.7)" />
                    <Text style={[styles.canvasHintTxt, { color: ts }]}>Drag each item • Pinch to resize</Text>
                </View>

                {/* ── Outfit Canvas Stage ── */}
                <View style={[styles.stage, { backgroundColor: stageBg }]}>
                    {loading ? (
                        <ActivityIndicator size="large" color={gold} />
                    ) : (
                        <OutfitCanvas
                            isDarkMode={isDarkMode}
                            topItem={selectedTop}
                            bottomItem={selectedBottom}
                            footwearItem={selectedFootwear}
                            surfaceBg={surfaceBg}
                        />
                    )}
                </View>

                {/* ── Item scroll rows ── */}
                <View style={[styles.rowsCard, { backgroundColor: cardBg }]}>
                    <View style={styles.rowsHeader}>
                        <Text style={[styles.rowsTitle, { color: tp }]}>Mix & match</Text>
                        {hasSel && (
                            <TouchableOpacity style={[styles.clearBtn, { backgroundColor: surfaceBg }]} onPress={() => { setSelectedTop(null); setSelectedBottom(null); setSelectedFootwear(null); }}>
                                <Text style={[styles.clearBtnTxt, { color: ts }]}>Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {loading ? (
                        <ActivityIndicator color={gold} style={{ paddingVertical: 24 }} />
                    ) : !hasAny ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="cloud-upload-outline" size={36} color={tm} />
                            <Text style={[styles.emptyTxt, { color: ts }]}>Upload clothes in the Wardrobe tab</Text>
                        </View>
                    ) : (
                        <>
                            <ItemRow label="Tops"     icon="shirt-outline"    items={tops}      selected={selectedTop}      onSelect={setSelectedTop}      gold={gold} surfaceBg={surfaceBg} tp={tp} tm={tm} />
                            <ItemRow label="Bottoms"  icon="triangle-outline" items={bottoms}   selected={selectedBottom}   onSelect={setSelectedBottom}   gold={gold} surfaceBg={surfaceBg} tp={tp} tm={tm} />
                            <ItemRow label="Footwear" icon="walk-outline"     items={footwears} selected={selectedFootwear} onSelect={setSelectedFootwear} gold={gold} surfaceBg={surfaceBg} tp={tp} tm={tm} />
                        </>
                    )}

                    {hasSel && (
                        <TouchableOpacity style={[styles.aiBtn, { backgroundColor: gold }]} onPress={() => router.push('/(tabs)/outfits')} activeOpacity={0.85}>
                            <Ionicons name="sparkles" size={14} color="#000" />
                            <Text style={styles.aiBtnTxt}>See AI Outfit Suggestions</Text>
                        </TouchableOpacity>
                    )}
                </View>

            </ScrollView>

            {/* AI Suggestion Modal */}
            <Modal visible={bannerModalVisible} transparent animationType="fade" onRequestClose={() => setBannerModalVisible(false)}>
                <View style={styles.bannerModalOverlay}>
                    <View style={[styles.bannerModalBox, { backgroundColor: cardBg }]}>
                        <View style={styles.bannerModalHeader}>
                            <Ionicons name="sparkles" size={20} color={gold} />
                            <Text style={[styles.bannerModalTitle, { color: tp }]}>Your Stylist Suggests</Text>
                            <TouchableOpacity onPress={() => setBannerModalVisible(false)}>
                                <Ionicons name="close" size={24} color={ts} />
                            </TouchableOpacity>
                        </View>
                        
                        {bannerLoading ? (
                            <ActivityIndicator size="large" color={gold} style={{ paddingVertical: 40 }} />
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={[styles.bannerAiParagraph, { color: ts }]}>
                                    {bannerAiText}
                                </Text>

                                {bannerOutfit.length > 0 && (
                                    <View style={styles.bannerOutfitList}>
                                        {bannerOutfit.map(it => (
                                            <View key={it.id} style={[styles.bannerOutfitCard, { backgroundColor: surfaceBg }]}>
                                                <Image source={{ uri: api.getImageUrl(it.processedUrl || it.originalUrl) }} style={{ width: 60, height: 60 }} resizeMode="contain" />
                                                <View style={{ flex: 1, paddingLeft: 10 }}>
                                                    <Text style={[styles.bannerOutfitCat, { color: tm }]}>{it.category.toUpperCase()}</Text>
                                                    <Text style={[styles.bannerOutfitName, { color: tp }]} numberOfLines={1}>{it.name}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 36 : 8, paddingBottom: 10 },
    logoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logoBadge: { backgroundColor: '#5DADE2', width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    logoText:  { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    notifDot: { position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
    notifDotTxt: { color: '#000', fontSize: 9, fontWeight: '800' },
    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', paddingTop: Platform.OS === 'android' ? 86 : 96, paddingRight: 16, alignItems: 'flex-end' },
    menuBox: { minWidth: 180, borderRadius: 14, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 14, elevation: 10 },
    menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
    menuTxt: { fontSize: 15, fontWeight: '600' },
    arRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A3A55', borderRadius: 20, paddingLeft: 10, paddingRight: 3, paddingVertical: 3, gap: 4 },
    arLbl:   { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    arSwitch: { transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] },

    // ── Time-of-Day card ──────────────────────────────────────────────────────
    todCard:      { marginHorizontal: 16, marginBottom: 14, height: 148, borderRadius: 22, overflow: 'hidden' },
    todCardImg:   { borderRadius: 22 },
    todScrim:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'space-between', paddingTop: 18, paddingBottom: 0 },
    todContent:   { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, gap: 12 },
    todGreet:     { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
    todName:      { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.80)' },
    todTip:       { fontSize: 11, fontWeight: '400', color: 'rgba(255,255,255,0.62)', lineHeight: 16, marginTop: 2 },
    todCountPill: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, gap: 2, borderWidth: 1, borderColor: 'rgba(93,173,226,0.35)' },
    todCountTxt:  { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    todStrip:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 16, paddingVertical: 9, marginTop: 10 },
    todStripTxt:  { fontSize: 11, color: 'rgba(255,255,255,0.65)', flex: 1 },

    canvasHint:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 20, marginBottom: 8 },
    canvasHintTxt: { fontSize: 11, fontWeight: '500', opacity: 0.65 },

    stage: { marginHorizontal: 16, borderRadius: 24, height: STAGE_H, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },

    rowsCard: { marginHorizontal: 16, borderRadius: 22, paddingTop: 18, paddingBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    rowsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
    rowsTitle: { fontSize: 15, fontWeight: '700' },
    clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    clearBtnTxt: { fontSize: 12, fontWeight: '600' },
    emptyBox: { alignItems: 'center', paddingVertical: 28, gap: 10, paddingHorizontal: 32 },
    emptyTxt: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
    aiBtn: { marginHorizontal: 20, marginTop: 14, paddingVertical: 13, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    aiBtnTxt: { fontSize: 14, fontWeight: '700', color: '#000' },

    // Banner Modal
    bannerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    bannerModalBox: { borderRadius: 20, padding: 20, maxHeight: '80%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { height: 5, width: 0}, elevation: 5 },
    bannerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    bannerModalTitle: { fontSize: 18, fontWeight: '700', flex: 1, marginLeft: 10 },
    bannerAiParagraph: { fontSize: 16, lineHeight: 24, fontStyle: 'italic', marginBottom: 20 },
    bannerOutfitList: { gap: 10 },
    bannerOutfitCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12 },
    bannerOutfitCat: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
    bannerOutfitName: { fontSize: 14, fontWeight: '600' }
});
