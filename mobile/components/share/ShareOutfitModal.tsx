/**
 * ShareOutfitModal — Spotify-style outfit share card
 *
 * Generates the branded card using a hidden WebView canvas (pure JS, works in Expo Go).
 * Flow:
 *   1. Download outfit images → encode as base64 data-URIs
 *   2. Hidden WebView draws them on an HTML canvas with VibeCheck branding
 *   3. Canvas posts back a PNG base64 string via onMessage
 *   4. We write it to FileSystem cache and open expo-sharing
 */
import React, { useState, useCallback, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { WardrobeItem } from '../../services/api';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 48;
const CARD_H = CARD_W + 80;

/* Canvas dimensions (fixed — independent of screen size) */
const C_W = 400;
const C_H = 533;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(s: string) {
    const d = new Date(s + 'T00:00:00');
    return `${MONTHS[d.getMonth()].toUpperCase()} ${d.getDate()}, ${d.getFullYear()}`;
}

/* ── HTML canvas card builder ── */
function buildCardHTML(b64Images: string[], lookName: string, dateStr: string): string {
    const count = b64Images.length;

    function pos(i: number) {
        if (count === 1) return { x: 20, y: 50, w: 360, h: 390 };
        if (count === 2) return { x: i === 0 ? 5 : 202, y: 65, w: 193, h: 330 };
        if (count === 3) return { x: i * 130 + 5, y: 75, w: 124, h: 280 };
        const col = i % 2, row = Math.floor(i / 2);
        return { x: col * 198 + 2, y: 50 + row * 200, w: 196, h: 196 };
    }

    const drawCode = b64Images.map((_, i) => {
        const p = pos(i);
        return `loadImg(${i}, ${p.x}, ${p.y}, ${p.w}, ${p.h});`;
    }).join('\n        ');

    const safeName = lookName.replace(/\\/g, '\\\\').replace(/'/g, "\\'").substring(0, 28);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; }
  body { width: ${C_W}px; height: ${C_H}px; overflow: hidden; background: #0D0D18; }
  canvas { display: block; }
</style>
</head>
<body>
<canvas id="c" width="${C_W}" height="${C_H}"></canvas>
<script>
var cv = document.getElementById('c');
var ctx = cv.getContext('2d');
var srcs = ${JSON.stringify(b64Images)};
var total = srcs.length === 0 ? 1 : srcs.length;
var done = 0;

function finish() {
    /* Brand */
    ctx.fillStyle = '#A0627A';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('+ VibeCheck', 20, 36);

    /* Look name */
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'italic bold 22px Georgia, serif';
    ctx.fillText('${safeName}', 20, 480);

    /* Date */
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.font = '13px Arial';
    ctx.fillText('${dateStr}', 20, 502);

    var b64 = cv.toDataURL('image/png').split(',')[1];
    window.ReactNativeWebView.postMessage(b64);
}

function tick() { if (++done >= total) finish(); }

function loadImg(idx, x, y, w, h) {
    var img = new Image();
    img.onload = function() {
        /* Draw image scaled to fill slot (object-fit: contain style) */
        var scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
        var dw = img.naturalWidth * scale;
        var dh = img.naturalHeight * scale;
        var dx = x + (w - dw) / 2;
        var dy = y + (h - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
        tick();
    };
    img.onerror = function() { tick(); };
    img.src = srcs[idx];
}

/* Background */
ctx.fillStyle = '#0D0D18';
ctx.fillRect(0, 0, ${C_W}, ${C_H});

/* Glow blobs */
var g1 = ctx.createRadialGradient(370, 30, 0, 370, 30, 130);
g1.addColorStop(0, 'rgba(160,98,122,0.22)');
g1.addColorStop(1, 'rgba(160,98,122,0)');
ctx.fillStyle = g1; ctx.fillRect(0, 0, ${C_W}, ${C_H});

var g2 = ctx.createRadialGradient(20, 490, 0, 20, 490, 110);
g2.addColorStop(0, 'rgba(107,74,128,0.2)');
g2.addColorStop(1, 'rgba(107,74,128,0)');
ctx.fillStyle = g2; ctx.fillRect(0, 0, ${C_W}, ${C_H});

${count === 0 ? `
ctx.fillStyle = 'rgba(255,255,255,0.15)';
ctx.font = '60px Arial';
ctx.fillText('?', 175, 300);
finish();
` : drawCode}
</script>
</body>
</html>`;
}

type Props = {
    visible: boolean;
    lookName: string;
    items: WardrobeItem[];
    date: string;
    onClose: () => void;
};

function OutfitCollage({ items, size }: { items: WardrobeItem[]; size: number }) {
    const urls = items.map(i => i.processedUrl || i.originalUrl).filter(Boolean).slice(0, 4);
    if (urls.length === 0) {
        return (
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="shirt-outline" size={56} color="rgba(255,255,255,0.2)" />
            </View>
        );
    }
    if (urls.length === 1) {
        return <Image source={{ uri: urls[0] }} style={{ width: size, height: size }} resizeMode="contain" />;
    }
    if (urls.length === 2) {
        const w = size / 2 - 4;
        return (
            <View style={{ width: size, height: size, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                {urls.map((u, i) => <Image key={i} source={{ uri: u }} style={{ width: w, height: size - 8 }} resizeMode="contain" />)}
            </View>
        );
    }
    if (urls.length === 3) {
        const w = size / 3 - 4;
        return (
            <View style={{ width: size, height: size, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
                {urls.map((u, i) => <Image key={i} source={{ uri: u }} style={{ width: w, height: size * 0.85 }} resizeMode="contain" />)}
            </View>
        );
    }
    const half = size / 2 - 4;
    return (
        <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {urls.map((u, i) => <Image key={i} source={{ uri: u }} style={{ width: half, height: half }} resizeMode="contain" />)}
        </View>
    );
}

export default function ShareOutfitModal({ visible, lookName, items, date, onClose }: Props) {
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const [sharing, setSharing] = useState(false);
    const [cardHtml, setCardHtml] = useState<string | null>(null);
    const inProgress = useRef(false);

    const startShare = useCallback(async () => {
        if (inProgress.current) return;
        inProgress.current = true;
        setSharing(true);
        try {
            /* Download every outfit image and encode as base64 data-URI */
            const b64List = await Promise.all(
                items.slice(0, 4).map(async (item) => {
                    const url = item.processedUrl || item.originalUrl;
                    if (!url) return '';
                    try {
                        if (url.startsWith('file://')) {
                            /* Already local — read directly */
                            const b64 = await FileSystem.readAsStringAsync(url, {
                                encoding: FileSystem.EncodingType.Base64,
                            });
                            const mime = url.endsWith('.png') ? 'image/png' : 'image/jpeg';
                            return `data:${mime};base64,${b64}`;
                        } else {
                            /* Remote URL — download first */
                            const dest = `${FileSystem.cacheDirectory}vc_img_${item.id}.jpg`;
                            await FileSystem.downloadAsync(url, dest);
                            const b64 = await FileSystem.readAsStringAsync(dest, {
                                encoding: FileSystem.EncodingType.Base64,
                            });
                            return `data:image/jpeg;base64,${b64}`;
                        }
                    } catch {
                        return '';
                    }
                })
            );

            const validImages = b64List.filter(Boolean);
            setCardHtml(buildCardHTML(validImages, lookName, fmtDate(date)));
            /* sharing flag stays true until onWebViewMessage resolves */
        } catch (e: any) {
            inProgress.current = false;
            setSharing(false);
            Alert.alert('Could not prepare card', e?.message ?? 'Unknown error.');
        }
    }, [items, lookName, date]);

    const onWebViewMessage = useCallback(async (base64Png: string) => {
        setCardHtml(null);
        try {
            const dest = `${FileSystem.cacheDirectory}vibecheck_card.png`;
            await FileSystem.writeAsStringAsync(dest, base64Png, {
                encoding: FileSystem.EncodingType.Base64,
            });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(dest, {
                    mimeType: 'image/png',
                    dialogTitle: `${lookName} — VibeCheck`,
                    UTI: 'public.png',
                });
            } else {
                await Share.share({ url: dest, title: `${lookName} — VibeCheck` });
            }
        } catch (e: any) {
            Alert.alert('Could not share', e?.message ?? 'Unknown error.');
        } finally {
            inProgress.current = false;
            setSharing(false);
        }
    }, [lookName]);

    if (!visible) return null;

    const sheet = isDarkMode ? '#16161E' : '#FFFFFF';

    return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0D0D18', zIndex: 999 }]}>
            <StatusBar barStyle="light-content" backgroundColor="#0D0D18" />

            {/* Hidden WebView — off-screen, renders canvas card and posts PNG base64 */}
            {cardHtml !== null && (
                <WebView
                    source={{ html: cardHtml }}
                    style={styles.hiddenWebView}
                    javaScriptEnabled
                    originWhitelist={['*']}
                    onMessage={e => onWebViewMessage(e.nativeEvent.data)}
                />
            )}

            {/* Header */}
            <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color="#E0E0F0" />
                </TouchableOpacity>
                <Text style={styles.topTitle}>Share Outfit</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Card preview */}
            <View style={styles.cardWrap}>
                <View style={styles.cardOuter}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0D0D18' }]} />
                    <View style={styles.blobTR} />
                    <View style={styles.blobBL} />
                    <View style={styles.cardTop}>
                        <Text style={styles.cardBrand}>✦ VibeCheck</Text>
                    </View>
                    <View style={styles.collageWrap}>
                        <OutfitCollage items={items} size={CARD_W - 48} />
                    </View>
                    <View style={styles.cardBottom}>
                        <Text style={styles.cardName} numberOfLines={1}>{lookName}</Text>
                        <Text style={styles.cardDate}>{fmtDate(date)}</Text>
                    </View>
                </View>
            </View>

            {/* Bottom share sheet */}
            <View style={[styles.sheet, { backgroundColor: sheet, paddingBottom: insets.bottom + 24 }]}>
                <Text style={[styles.sheetLabel, { color: isDarkMode ? '#4A4A7A' : '#C0BDB8' }]}>
                    SHARE TO
                </Text>
                <View style={styles.platformRow}>
                    {([
                        { icon: 'logo-instagram',             label: 'Instagram', color: '#C13584' },
                        { icon: 'logo-whatsapp',              label: 'WhatsApp',  color: '#25D366' },
                        { icon: 'logo-facebook',              label: 'Facebook',  color: '#1877F2' },
                        { icon: 'ellipsis-horizontal-circle', label: 'More',      color: '#8888AA' },
                    ] as const).map(p => (
                        <TouchableOpacity
                            key={p.label}
                            style={styles.platformBtn}
                            onPress={startShare}
                            disabled={sharing}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.platformIcon, { backgroundColor: p.color + '22' }]}>
                                {sharing
                                    ? <ActivityIndicator size="small" color={p.color} />
                                    : <Ionicons name={p.icon} size={26} color={p.color} />}
                            </View>
                            <Text style={[styles.platformLabel, { color: isDarkMode ? '#C0C0D8' : '#555' }]}>
                                {p.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    hiddenWebView: {
        position: 'absolute',
        width: C_W,
        height: C_H,
        top: -2000,
        left: -2000,
        opacity: 0,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    closeBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#2A2A38',
        alignItems: 'center', justifyContent: 'center',
    },
    topTitle: {
        fontSize: 18,
        fontFamily: FontFamily.heading,
        fontStyle: 'italic',
        fontWeight: '700',
        color: '#F0F0F0',
    },
    cardWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardOuter: {
        width: CARD_W,
        height: CARD_H,
        borderRadius: 20,
        overflow: 'hidden',
        padding: 20,
    },
    blobTR: {
        position: 'absolute', top: -50, right: -50,
        width: 160, height: 160, borderRadius: 80,
        backgroundColor: 'rgba(160,98,122,0.18)',
    },
    blobBL: {
        position: 'absolute', bottom: -30, left: -30,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(107,74,128,0.18)',
    },
    cardTop: { marginBottom: 6 },
    cardBrand: {
        color: '#A0627A',
        fontSize: 12,
        fontFamily: FontFamily.heading,
        letterSpacing: 1.5,
        fontWeight: '600',
    },
    collageWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBottom: { marginTop: 6 },
    cardName: {
        color: '#FFFFFF',
        fontSize: 20,
        fontFamily: FontFamily.heading,
        fontStyle: 'italic',
        fontWeight: '700',
    },
    cardDate: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontFamily: FontFamily.body,
        letterSpacing: 0.5,
        marginTop: 2,
    },
    sheet: {
        paddingTop: 24,
        paddingHorizontal: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    sheetLabel: {
        fontSize: 10,
        fontFamily: FontFamily.bodySemiBold,
        fontWeight: '600',
        letterSpacing: 1.5,
        marginBottom: 20,
    },
    platformRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    platformBtn: {
        alignItems: 'center',
        gap: 8,
    },
    platformIcon: {
        width: 62, height: 62, borderRadius: 31,
        alignItems: 'center', justifyContent: 'center',
    },
    platformLabel: {
        fontSize: 12,
        fontFamily: FontFamily.body,
        fontWeight: '500',
    },
});
