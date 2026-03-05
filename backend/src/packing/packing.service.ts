import { Injectable, Logger } from '@nestjs/common';
import { WardrobeService, WardrobeItem } from '../wardrobe/wardrobe.service';

export interface PackingListRequest {
    destination: string;
    days: number;
    userId?: string;
}

export interface StylistSuggestion {
    suggestedOutfit: WardrobeItem[];
    favorites: WardrobeItem[];
    stats: {
        totalItems: number;
        totalFavorites: number;
        categories: Record<string, number>;
    };
}

/** Normalize AI category strings to canonical groups */
function categorize(category: string): string {
    const c = category.toLowerCase().trim();
    if (['tops', 'topwear', 'shirt', 't-shirt', 'blouse', 'top', 'knitwear', 'polo'].some(k => c.includes(k))) return 'tops';
    if (['bottoms', 'bottomwear', 'pants', 'jeans', 'trousers', 'skirt', 'shorts', 'leggings'].some(k => c.includes(k))) return 'bottoms';
    if (['dress', 'dresses', 'jumpsuit', 'romper', 'gown'].some(k => c.includes(k))) return 'dresses';
    if (['outerwear', 'jacket', 'coat', 'blazer', 'hoodie', 'sweater', 'cardigan'].some(k => c.includes(k))) return 'outerwear';
    if (['footwear', 'shoes', 'boots', 'sneakers', 'sandals', 'heels', 'loafers'].some(k => c.includes(k))) return 'footwear';
    if (['accessories', 'accessory', 'bag', 'belt', 'hat', 'scarf', 'watch', 'jewel'].some(k => c.includes(k))) return 'accessories';
    return 'other';
}

function selectItems(arr: WardrobeItem[], n: number): WardrobeItem[] {
    // Prefer favorites
    const favs = arr.filter(i => i.isFavorite);
    const rest = arr.filter(i => !i.isFavorite).sort(() => 0.5 - Math.random());
    const pool = [...favs, ...rest];
    return pool.slice(0, n);
}

@Injectable()
export class PackingService {
    private readonly logger = new Logger(PackingService.name);

    constructor(private readonly wardrobeService: WardrobeService) { }

    async generatePackingList(request: PackingListRequest): Promise<WardrobeItem[]> {
        this.logger.log(`Generating packing list for ${request.destination} (${request.days} days)`);

        const allItems = await this.wardrobeService.getAll({});
        const ready = allItems.filter(i => i.status === 'done' && i.processedUrl);

        // Group by canonical category
        const grouped: Record<string, WardrobeItem[]> = {};
        for (const item of ready) {
            const cat = categorize(item.category);
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        }

        const d = request.days;
        const targetTops = Math.min(d + 1, 8);
        const targetBottoms = Math.max(1, Math.round(d * 0.7));
        const targetDresses = Math.max(0, Math.round(d * 0.3));
        const targetOuterwear = Math.max(1, Math.round(d * 0.3));
        const targetShoes = Math.max(1, Math.round(d * 0.4));
        const targetAccessories = Math.max(0, Math.round(d * 0.3));

        const list: WardrobeItem[] = [
            ...selectItems(grouped['tops'] || [], targetTops),
            ...selectItems(grouped['bottoms'] || [], targetBottoms),
            ...selectItems(grouped['dresses'] || [], targetDresses),
            ...selectItems(grouped['outerwear'] || [], targetOuterwear),
            ...selectItems(grouped['footwear'] || [], targetShoes),
            ...selectItems(grouped['accessories'] || [], targetAccessories),
        ];

        // Deduplicate by id
        const seen = new Set<string>();
        return list.filter(i => {
            if (seen.has(i.id)) return false;
            seen.add(i.id);
            return true;
        });
    }

    async getStylistSuggestion(): Promise<StylistSuggestion> {
        const allItems = await this.wardrobeService.getAll({});
        const ready = allItems.filter(i => i.status === 'done' && i.processedUrl);

        const favorites = ready.filter(i => i.isFavorite);
        const stats = await this.wardrobeService.getStats();

        // Build a suggested outfit: 1 top + 1 bottom (or dress) + 1 outerwear + 1 shoe
        const grouped: Record<string, WardrobeItem[]> = {};
        for (const item of ready) {
            const cat = categorize(item.category);
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        }

        const pick = (cat: string) => {
            const arr = grouped[cat] || [];
            const favFirst = [...arr.filter(i => i.isFavorite), ...arr.filter(i => !i.isFavorite)];
            return favFirst[0] || null;
        };

        const suggestedOutfit: WardrobeItem[] = [
            pick('tops'),
            pick('bottoms') || pick('dresses'),
            pick('outerwear'),
            pick('footwear'),
        ].filter((i): i is WardrobeItem => i !== null);

        return {
            suggestedOutfit,
            favorites: favorites.slice(0, 10),
            stats: {
                totalItems: stats.totalItems,
                totalFavorites: stats.totalFavorites,
                categories: stats.categories,
            },
        };
    }
}
