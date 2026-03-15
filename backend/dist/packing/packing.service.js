"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PackingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackingService = void 0;
exports.categorize = categorize;
exports.buildLookNote = buildLookNote;
const common_1 = require("@nestjs/common");
const wardrobe_service_1 = require("../wardrobe/wardrobe.service");
function categorize(category) {
    if (!category)
        return 'other';
    const c = category.toLowerCase().trim();
    if ([
        'topwear',
        'top',
        'tops',
        'shirt',
        't-shirt',
        'blouse',
        'polo',
        'knitwear',
    ].some((k) => c.includes(k)))
        return 'topwear';
    if ([
        'bottomwear',
        'bottom',
        'bottoms',
        'pants',
        'jeans',
        'trousers',
        'shorts',
    ].some((k) => c.includes(k)))
        return 'bottomwear';
    if (['outerwear', 'jacket', 'coat', 'blazer', 'hoodie', 'sweater'].some((k) => c.includes(k)))
        return 'outerwear';
    if (['footwear', 'shoes', 'boots', 'sneakers', 'sandals', 'shoe'].some((k) => c.includes(k)))
        return 'footwear';
    if (['accessories', 'accessory', 'belt', 'hat', 'scarf'].some((k) => c.includes(k)))
        return 'accessories';
    if (['bags', 'bag', 'handbag'].some((k) => c.includes(k)))
        return 'bags';
    if (['dresses', 'dress', 'gown'].some((k) => c.includes(k)))
        return 'dresses';
    return 'other';
}
function selectItems(arr, n) {
    const favs = arr.filter((i) => i.isFavorite);
    const rest = arr.filter((i) => !i.isFavorite).sort(() => 0.5 - Math.random());
    const pool = [...favs, ...rest];
    return pool.slice(0, n);
}
function scoreItem(item, profile) {
    if (!profile?.stylePreference)
        return item.isFavorite ? 2 : 0;
    const haystack = `${item.name} ${item.brand} ${item.originalFilename} ${item.category} ${(item.occasion || []).join(' ')} ${(item.season || []).join(' ')}`.toLowerCase();
    const keywords = {
        Casual: ['tee', 't-shirt', 'casual', 'sneaker', 'denim', 'cotton'],
        Streetwear: ['street', 'oversized', 'cargo', 'hoodie', 'jacket', 'sneaker'],
        Formal: ['formal', 'shirt', 'trouser', 'blazer', 'coat', 'loafer'],
        Minimal: ['neutral', 'plain', 'classic', 'clean', 'white', 'black'],
    };
    let score = item.isFavorite ? 3 : 0;
    for (const keyword of keywords[profile.stylePreference]) {
        if (haystack.includes(keyword))
            score += 2;
    }
    return score;
}
function buildLookNote(profile) {
    const notes = [];
    if (profile?.stylePreference)
        notes.push(`${profile.stylePreference} priority`);
    if (profile?.bodyType === 'Slim')
        notes.push('balanced shape');
    if (profile?.bodyType === 'Athletic')
        notes.push('clean structure');
    if (profile?.bodyType === 'Heavy')
        notes.push('streamlined fit');
    if (typeof profile?.height === 'number' && profile.height >= 180)
        notes.push('long-line proportion');
    if (typeof profile?.height === 'number' && profile.height <= 168)
        notes.push('compact proportion');
    if (profile?.waistSize)
        notes.push(`waist ${profile.waistSize}`);
    return notes.join(' • ') || 'Ranked from your wardrobe';
}
let PackingService = PackingService_1 = class PackingService {
    wardrobeService;
    logger = new common_1.Logger(PackingService_1.name);
    constructor(wardrobeService) {
        this.wardrobeService = wardrobeService;
    }
    async generatePackingList(request) {
        if (!request.userId)
            throw new Error('userId is required');
        this.logger.log(`Generating packing list for ${request.destination} (${request.days} days)`);
        const allItems = await this.wardrobeService.getAll({
            userId: request.userId,
        });
        const ready = allItems.filter((i) => i.status === 'done' && i.processedUrl);
        const grouped = {};
        for (const item of ready) {
            const cat = categorize(item.category);
            if (!grouped[cat])
                grouped[cat] = [];
            grouped[cat].push(item);
        }
        const d = request.days;
        const targetTops = Math.min(d + 1, 8);
        const targetBottoms = Math.max(1, Math.round(d * 0.7));
        const targetDresses = Math.max(0, Math.round(d * 0.3));
        const targetOuterwear = Math.max(1, Math.round(d * 0.3));
        const targetShoes = Math.max(1, Math.round(d * 0.4));
        const targetAccessories = Math.max(0, Math.round(d * 0.3));
        const list = [
            ...selectItems(grouped['tops'] || [], targetTops),
            ...selectItems(grouped['bottoms'] || [], targetBottoms),
            ...selectItems(grouped['dresses'] || [], targetDresses),
            ...selectItems(grouped['outerwear'] || [], targetOuterwear),
            ...selectItems(grouped['footwear'] || [], targetShoes),
            ...selectItems(grouped['accessories'] || [], targetAccessories),
        ];
        const seen = new Set();
        return list.filter((i) => {
            if (seen.has(i.id))
                return false;
            seen.add(i.id);
            return true;
        });
    }
    async getStylistSuggestion(userId, profile, temp) {
        const allItems = await this.wardrobeService.getAll({ userId });
        let ready = allItems.filter((i) => i.status === 'done' && i.processedUrl);
        if (typeof temp === 'number') {
            let filtered = ready;
            if (temp < 18) {
                this.logger.debug(`Cool weather (${temp}°C): Prioritizing outerwear`);
            }
            else if (temp > 28) {
                this.logger.debug(`Hot weather (${temp}°C): Filtering out heavy outerwear`);
                filtered = ready.filter(i => {
                    const cat = categorize(i.category);
                    return cat !== 'outerwear' || (i.name || '').toLowerCase().includes('light');
                });
            }
            if (filtered.length >= 2) {
                ready = filtered;
            }
            else {
                this.logger.warn(`Weather filtering too strict (${filtered.length} items), falling back to all items`);
            }
        }
        const favorites = ready.filter((i) => i.isFavorite);
        const stats = await this.wardrobeService.getStats(userId);
        const grouped = {};
        for (const item of ready) {
            const cat = categorize(item.category);
            if (!grouped[cat])
                grouped[cat] = [];
            grouped[cat].push(item);
        }
        const sortedByStyle = (cat) => [...(grouped[cat] || [])].sort((a, b) => scoreItem(b, profile) - scoreItem(a, profile));
        const tops = sortedByStyle('tops');
        const bottoms = sortedByStyle('bottoms');
        const dresses = sortedByStyle('dresses');
        const outerwear = sortedByStyle('outerwear');
        const footwear = sortedByStyle('footwear');
        const accessories = sortedByStyle('accessories');
        const createLook = (index) => {
            const top = tops[index % Math.max(tops.length, 1)] || null;
            const bottom = bottoms[index % Math.max(bottoms.length, 1)] ||
                dresses[index % Math.max(dresses.length, 1)] ||
                null;
            const outer = outerwear[index % Math.max(outerwear.length, 1)] || null;
            const shoe = footwear[index % Math.max(footwear.length, 1)] || null;
            const accessory = accessories[index % Math.max(accessories.length, 1)] || null;
            const items = [top, bottom, outer, shoe, accessory].filter((item) => Boolean(item));
            const dedupedItems = items.filter((item, itemIndex, arr) => arr.findIndex((x) => x.id === item.id) === itemIndex);
            const score = dedupedItems.reduce((sum, item) => sum + scoreItem(item, profile), 0);
            return {
                id: `look-${index}-${dedupedItems.map((item) => item.id).join('-')}`,
                name: index === 0 ? 'Best For You' : `You Can Also Try ${index}`,
                note: buildLookNote(profile),
                items: dedupedItems,
                score,
            };
        };
        const alternativeOutfits = Array.from({ length: 4 }, (_, index) => createLook(index))
            .filter((look) => look.items.length >= 2)
            .filter((look, index, arr) => arr.findIndex((x) => x.id === look.id) === index)
            .sort((a, b) => b.score - a.score);
        const suggestedOutfit = alternativeOutfits[0]?.items || [];
        return {
            suggestedOutfit,
            alternativeOutfits,
            favorites: favorites.slice(0, 10),
            stats: {
                totalItems: stats.totalItems,
                totalFavorites: stats.totalFavorites,
                categories: stats.categories,
            },
        };
    }
};
exports.PackingService = PackingService;
exports.PackingService = PackingService = PackingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => wardrobe_service_1.WardrobeService))),
    __metadata("design:paramtypes", [wardrobe_service_1.WardrobeService])
], PackingService);
//# sourceMappingURL=packing.service.js.map