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
var PackingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackingService = void 0;
const common_1 = require("@nestjs/common");
const wardrobe_service_1 = require("../wardrobe/wardrobe.service");
function categorize(category) {
    const c = category.toLowerCase().trim();
    if (['tops', 'topwear', 'shirt', 't-shirt', 'blouse', 'top', 'knitwear', 'polo'].some(k => c.includes(k)))
        return 'tops';
    if (['bottoms', 'bottomwear', 'pants', 'jeans', 'trousers', 'skirt', 'shorts', 'leggings'].some(k => c.includes(k)))
        return 'bottoms';
    if (['dress', 'dresses', 'jumpsuit', 'romper', 'gown'].some(k => c.includes(k)))
        return 'dresses';
    if (['outerwear', 'jacket', 'coat', 'blazer', 'hoodie', 'sweater', 'cardigan'].some(k => c.includes(k)))
        return 'outerwear';
    if (['footwear', 'shoes', 'boots', 'sneakers', 'sandals', 'heels', 'loafers'].some(k => c.includes(k)))
        return 'footwear';
    if (['accessories', 'accessory', 'bag', 'belt', 'hat', 'scarf', 'watch', 'jewel'].some(k => c.includes(k)))
        return 'accessories';
    return 'other';
}
function selectItems(arr, n) {
    const favs = arr.filter(i => i.isFavorite);
    const rest = arr.filter(i => !i.isFavorite).sort(() => 0.5 - Math.random());
    const pool = [...favs, ...rest];
    return pool.slice(0, n);
}
let PackingService = PackingService_1 = class PackingService {
    wardrobeService;
    logger = new common_1.Logger(PackingService_1.name);
    constructor(wardrobeService) {
        this.wardrobeService = wardrobeService;
    }
    async generatePackingList(request) {
        this.logger.log(`Generating packing list for ${request.destination} (${request.days} days)`);
        const allItems = await this.wardrobeService.getAll({});
        const ready = allItems.filter(i => i.status === 'done' && i.processedUrl);
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
        return list.filter(i => {
            if (seen.has(i.id))
                return false;
            seen.add(i.id);
            return true;
        });
    }
    async getStylistSuggestion() {
        const allItems = await this.wardrobeService.getAll({});
        const ready = allItems.filter(i => i.status === 'done' && i.processedUrl);
        const favorites = ready.filter(i => i.isFavorite);
        const stats = await this.wardrobeService.getStats();
        const grouped = {};
        for (const item of ready) {
            const cat = categorize(item.category);
            if (!grouped[cat])
                grouped[cat] = [];
            grouped[cat].push(item);
        }
        const pick = (cat) => {
            const arr = grouped[cat] || [];
            const favFirst = [...arr.filter(i => i.isFavorite), ...arr.filter(i => !i.isFavorite)];
            return favFirst[0] || null;
        };
        const suggestedOutfit = [
            pick('tops'),
            pick('bottoms') || pick('dresses'),
            pick('outerwear'),
            pick('footwear'),
        ].filter((i) => i !== null);
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
};
exports.PackingService = PackingService;
exports.PackingService = PackingService = PackingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [wardrobe_service_1.WardrobeService])
], PackingService);
//# sourceMappingURL=packing.service.js.map