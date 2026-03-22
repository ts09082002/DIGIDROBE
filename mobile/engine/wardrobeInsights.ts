import { EngineWardrobeItem } from './types';

export type InsightSeverity = 'info' | 'warning' | 'critical';
export type InsightCategory = 'composition' | 'color_balance' | 'missing_basic' | 'seasonality' | 'usage' | 'versatility' | 'positive';

export interface WardrobeInsight {
    id: string;
    type: InsightCategory;
    icon: string; // Ionicons name
    title: string;
    message: string;
    severity: InsightSeverity;
    suggestedAction?: string;
}

export interface WardrobeOverview {
    totalItems: number;
    categoryCounts: Record<string, number>;
    colorCounts: Record<string, number>;
    topColors: { color: string; count: number }[];
    seasonBreakdown: { season: string; count: number; percentage: number }[];
    wardrobeScore: number; // 0-100
    insights: WardrobeInsight[];
}

const ESSENTIAL_BASICS: { category: string; name: string; tip: string }[] = [
    { category: 'topwear', name: 'white shirt', tip: 'A white shirt is the most versatile item — works for casual & formal.' },
    { category: 'topwear', name: 'plain black tee', tip: 'A simple black t-shirt goes with almost anything.' },
    { category: 'bottomwear', name: 'blue jeans', tip: 'Classic blue denim pairs with virtually every top.' },
    { category: 'bottomwear', name: 'neutral chinos/trousers', tip: 'A pair of neutral trousers bridges casual and smart.' },
    { category: 'outerwear', name: 'jacket or blazer', tip: 'One good jacket elevates any outfit.' },
    { category: 'footwear', name: 'white sneakers', tip: 'Clean white sneakers are an everyday staple.' },
    { category: 'footwear', name: 'formal shoes', tip: 'One pair of dress shoes covers all formal occasions.' },
];

const NEUTRAL_COLORS = ['black', 'white', 'gray', 'grey', 'beige', 'navy', 'cream', 'khaki', 'brown', 'tan', 'charcoal'];

export function analyzeWardrobe(items: EngineWardrobeItem[]): WardrobeOverview {
    const insights: WardrobeInsight[] = [];

    // ── Basic counts ──
    const categoryCounts: Record<string, number> = {};
    const colorCounts: Record<string, number> = {};
    const seasonCounts: Record<string, number> = { spring: 0, summer: 0, autumn: 0, winter: 0 };

    for (const item of items) {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        const color = (item.primaryColor || 'Unknown').toLowerCase();
        colorCounts[color] = (colorCounts[color] || 0) + 1;
        for (const s of item.seasonality) {
            seasonCounts[s] = (seasonCounts[s] || 0) + 1;
        }
    }

    const total = items.length;
    const topColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([color, count]) => ({ color, count }));

    const seasonBreakdown = Object.entries(seasonCounts).map(([season, count]) => ({
        season,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

    // ── Empty wardrobe ──
    if (total === 0) {
        return {
            totalItems: 0,
            categoryCounts,
            colorCounts,
            topColors,
            seasonBreakdown,
            wardrobeScore: 0,
            insights: [{
                id: 'empty_wardrobe',
                type: 'composition',
                icon: 'shirt-outline',
                title: 'Empty Wardrobe',
                message: 'Your wardrobe is empty. Start by adding a few everyday basics!',
                severity: 'info',
                suggestedAction: 'Upload items from your closet to get personalised insights.',
            }],
        };
    }

    // ── Score calculation ──
    let score = 30; // base

    // +1 per item up to 20
    score += Math.min(total, 20);

    // Category diversity: +5 per category present (max 35)
    const catCount = Object.keys(categoryCounts).filter(k => k !== 'unclassified').length;
    score += Math.min(catCount * 5, 35);

    // Color diversity: +2 per unique color up to 15
    const uniqueColors = Object.keys(colorCounts).filter(k => k !== 'unknown').length;
    score += Math.min(uniqueColors * 2, 15);

    score = Math.min(Math.max(score, 0), 100);

    // ── POSITIVE INSIGHTS (what's good) ──
    if (catCount >= 4) {
        insights.push({
            id: 'good_diversity',
            type: 'positive',
            icon: 'checkmark-circle',
            title: 'Great Category Mix',
            message: `Your wardrobe covers ${catCount} categories — that's a solid, versatile collection!`,
            severity: 'info',
        });
    }
    if (uniqueColors >= 5) {
        insights.push({
            id: 'good_color_range',
            type: 'positive',
            icon: 'color-palette',
            title: 'Nice Color Variety',
            message: `You have ${uniqueColors} different colors. A diverse palette means more outfit possibilities.`,
            severity: 'info',
        });
    }
    const neutralItems = items.filter(i => NEUTRAL_COLORS.includes((i.primaryColor || '').toLowerCase()));
    if (neutralItems.length >= 3 && neutralItems.length <= total * 0.6) {
        insights.push({
            id: 'good_neutral_balance',
            type: 'positive',
            icon: 'thumbs-up',
            title: 'Balanced Neutrals',
            message: `${neutralItems.length} neutral items give your wardrobe a strong foundation without being boring.`,
            severity: 'info',
        });
    }

    // ── COLOR BALANCE ──
    const shirts = items.filter(i => i.category === 'topwear');
    const blackShirts = shirts.filter(i => (i.primaryColor || '').toLowerCase().includes('black'));
    const whiteShirts = shirts.filter(i => (i.primaryColor || '').toLowerCase().includes('white'));

    if (blackShirts.length >= 5 && whiteShirts.length <= 1) {
        insights.push({
            id: 'too_many_black_shirts',
            type: 'color_balance',
            icon: 'contrast-outline',
            title: 'Too Many Black Tops',
            message: `You have ${blackShirts.length} black tops but only ${whiteShirts.length} white one(s). This limits outfit contrast.`,
            severity: 'warning',
            suggestedAction: 'Add a crisp white shirt or tee for more versatile pairings.',
        });
    }

    // Dominant single color
    if (topColors.length > 0 && topColors[0].count > total * 0.5 && total >= 5) {
        const dominant = topColors[0];
        insights.push({
            id: 'color_dominant',
            type: 'color_balance',
            icon: 'alert-circle-outline',
            title: `Too Much ${dominant.color.charAt(0).toUpperCase() + dominant.color.slice(1)}`,
            message: `${Math.round((dominant.count / total) * 100)}% of your wardrobe is ${dominant.color}. That's quite monotone.`,
            severity: 'warning',
            suggestedAction: `Try adding complementary colors to break up the ${dominant.color}.`,
        });
    }

    // Missing colors
    const hasWarm = items.some(i => ['red', 'orange', 'yellow', 'coral', 'pink', 'burgundy', 'maroon'].includes((i.primaryColor || '').toLowerCase()));
    if (!hasWarm && total >= 5) {
        insights.push({
            id: 'no_warm_colors',
            type: 'color_balance',
            icon: 'sunny-outline',
            title: 'Missing Warm Colors',
            message: 'Your wardrobe has no warm colors (red, orange, pink). Warm tones add energy to outfits.',
            severity: 'info',
            suggestedAction: 'Consider adding a burgundy top or warm-toned accessory.',
        });
    }

    // ── MISSING BASICS ──
    for (const basic of ESSENTIAL_BASICS) {
        const found = items.some(i => {
            if (basic.category === 'outerwear' && i.category === 'outerwear') return true;
            if (i.category !== basic.category) return false;
            const nameMatch = basic.name.split(' ').some(word =>
                i.name.toLowerCase().includes(word) ||
                (i.subCategory || '').toLowerCase().includes(word) ||
                (i.primaryColor || '').toLowerCase().includes(word)
            );
            return nameMatch;
        });
        if (!found) {
            insights.push({
                id: `missing_${basic.name.replace(/\s+/g, '_')}`,
                type: 'missing_basic',
                icon: 'add-circle-outline',
                title: `Missing: ${basic.name.charAt(0).toUpperCase() + basic.name.slice(1)}`,
                message: basic.tip,
                severity: total < 10 ? 'info' : 'warning',
                suggestedAction: `Add a ${basic.name} to your wardrobe.`,
            });
        }
    }

    // ── CATEGORY GAPS ──
    if (!categoryCounts['outerwear'] && total >= 5) {
        insights.push({
            id: 'no_outerwear',
            type: 'composition',
            icon: 'cloudy-outline',
            title: 'No Outerwear',
            message: 'You have no jackets, coats, or blazers. Layering is key for versatile dressing.',
            severity: 'warning',
            suggestedAction: 'Add at least one jacket or blazer for layering options.',
        });
    }
    if (!categoryCounts['footwear'] && total >= 5) {
        insights.push({
            id: 'no_footwear',
            type: 'composition',
            icon: 'footsteps-outline',
            title: 'No Footwear Added',
            message: 'Shoes complete an outfit! Add your footwear to get better outfit suggestions.',
            severity: 'info',
            suggestedAction: 'Upload photos of your shoes.',
        });
    }
    if (!categoryCounts['accessories'] && !categoryCounts['bags'] && total >= 8) {
        insights.push({
            id: 'no_accessories',
            type: 'composition',
            icon: 'watch-outline',
            title: 'No Accessories',
            message: 'Accessories (belts, watches, scarves, bags) add personality to outfits.',
            severity: 'info',
            suggestedAction: 'Add your accessories to unlock complete outfit planning.',
        });
    }

    // Top-heavy or bottom-heavy
    const tops = categoryCounts['topwear'] || 0;
    const bottoms = categoryCounts['bottomwear'] || 0;
    if (tops > 0 && bottoms > 0 && tops / bottoms > 4) {
        insights.push({
            id: 'top_heavy',
            type: 'versatility',
            icon: 'git-compare-outline',
            title: 'Top-Heavy Wardrobe',
            message: `You have ${tops} tops but only ${bottoms} bottoms. You'll run out of bottom pairings fast.`,
            severity: 'warning',
            suggestedAction: 'Add more bottoms — each new bottom multiplies your outfit options.',
        });
    }
    if (bottoms > 0 && tops > 0 && bottoms / tops > 3) {
        insights.push({
            id: 'bottom_heavy',
            type: 'versatility',
            icon: 'git-compare-outline',
            title: 'Bottom-Heavy Wardrobe',
            message: `You have ${bottoms} bottoms but only ${tops} tops. More tops would unlock way more combos.`,
            severity: 'warning',
            suggestedAction: 'Add more tops for a balanced wardrobe.',
        });
    }

    // ── SEASONALITY ──
    if (total >= 5) {
        const summerPct = seasonCounts['summer'] / total;
        const winterPct = seasonCounts['winter'] / total;

        if (summerPct < 0.15) {
            insights.push({
                id: 'low_summer',
                type: 'seasonality',
                icon: 'sunny-outline',
                title: 'Low Summer Options',
                message: `Only ${Math.round(summerPct * 100)}% of your items are summer-suitable. You may struggle in warm weather.`,
                severity: 'warning',
                suggestedAction: 'Add lightweight, breathable pieces for hot days.',
            });
        }
        if (winterPct < 0.15) {
            insights.push({
                id: 'low_winter',
                type: 'seasonality',
                icon: 'snow-outline',
                title: 'Low Winter Options',
                message: `Only ${Math.round(winterPct * 100)}% of your items work for winter. Layer up!`,
                severity: 'warning',
                suggestedAction: 'Add warmer outerwear, sweaters, or heavier fabrics.',
            });
        }
    }

    // ── USAGE ──
    const rarelyWorn = items.filter(i => {
        const count = (i as any).wearCount as number | undefined;
        return typeof count === 'number' && count <= 1;
    });
    if (rarelyWorn.length >= 3) {
        insights.push({
            id: 'rarely_worn',
            type: 'usage',
            icon: 'archive-outline',
            title: `${rarelyWorn.length} Rarely Worn Items`,
            message: 'Several items have barely been used. They may be taking up space.',
            severity: 'info',
            suggestedAction: 'Try styling them into new outfits, or consider donating/selling.',
        });
    }

    // ── VERSATILITY SCORE ──
    // Outfit combinations estimate
    const outfitCombos = Math.max(tops, 1) * Math.max(bottoms, 1) * Math.max(categoryCounts['footwear'] || 1, 1);
    if (outfitCombos >= 50) {
        insights.push({
            id: 'combo_potential',
            type: 'positive',
            icon: 'sparkles',
            title: `${outfitCombos.toLocaleString()}+ Outfit Combos`,
            message: `With your current items, you can create roughly ${outfitCombos.toLocaleString()} unique outfit combinations!`,
            severity: 'info',
        });
    }

    return {
        totalItems: total,
        categoryCounts,
        colorCounts,
        topColors,
        seasonBreakdown,
        wardrobeScore: score,
        insights,
    };
}
