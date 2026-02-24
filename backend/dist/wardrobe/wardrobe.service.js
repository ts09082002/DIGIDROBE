"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var WardrobeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WardrobeService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path_1 = require("path");
let WardrobeService = WardrobeService_1 = class WardrobeService {
    logger = new common_1.Logger(WardrobeService_1.name);
    itemsPath = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'metadata', 'wardrobe.json');
    loadItems() {
        try {
            if (fs.existsSync(this.itemsPath)) {
                return JSON.parse(fs.readFileSync(this.itemsPath, 'utf-8'));
            }
        }
        catch (e) {
            this.logger.error('Error loading wardrobe items', e);
        }
        return [];
    }
    saveItems(items) {
        const dir = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'metadata');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.itemsPath, JSON.stringify(items, null, 2));
    }
    getAll(query) {
        let items = this.loadItems();
        const category = query?.category;
        if (category && category !== 'all') {
            items = items.filter(i => i.category.toLowerCase() === category.toLowerCase());
        }
        if (query?.search) {
            const q = query.search.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(q) ||
                i.brand.toLowerCase().includes(q) ||
                i.category.toLowerCase().includes(q));
        }
        if (query?.favorite === 'true') {
            items = items.filter(i => i.isFavorite);
        }
        return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    getById(id) {
        const items = this.loadItems();
        const item = items.find(i => i.id === id);
        if (!item)
            throw new common_1.NotFoundException(`Item ${id} not found`);
        return item;
    }
    create(data) {
        const items = this.loadItems();
        const item = {
            id: data.id || '',
            originalFilename: data.originalFilename || '',
            originalUrl: data.originalUrl || '',
            processedUrl: data.processedUrl || '',
            category: data.category || 'tops',
            name: data.name || data.originalFilename || 'Untitled',
            brand: data.brand || '',
            color: data.color || '',
            season: data.season || [],
            occasion: data.occasion || [],
            isFavorite: data.isFavorite || false,
            mimeType: data.mimeType || 'image/png',
            size: data.size || 0,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        items.push(item);
        this.saveItems(items);
        return item;
    }
    update(id, data) {
        const items = this.loadItems();
        const index = items.findIndex(i => i.id === id);
        if (index === -1)
            throw new common_1.NotFoundException(`Item ${id} not found`);
        items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
        this.saveItems(items);
        return items[index];
    }
    toggleFavorite(id) {
        const items = this.loadItems();
        const index = items.findIndex(i => i.id === id);
        if (index === -1)
            throw new common_1.NotFoundException(`Item ${id} not found`);
        items[index].isFavorite = !items[index].isFavorite;
        items[index].updatedAt = new Date().toISOString();
        this.saveItems(items);
        return items[index];
    }
    delete(id) {
        const items = this.loadItems();
        const index = items.findIndex(i => i.id === id);
        if (index === -1)
            throw new common_1.NotFoundException(`Item ${id} not found`);
        items.splice(index, 1);
        this.saveItems(items);
    }
    getStats() {
        const items = this.loadItems();
        const categories = {};
        items.forEach(i => {
            categories[i.category] = (categories[i.category] || 0) + 1;
        });
        return {
            totalItems: items.length,
            totalFavorites: items.filter(i => i.isFavorite).length,
            categories,
        };
    }
};
exports.WardrobeService = WardrobeService;
exports.WardrobeService = WardrobeService = WardrobeService_1 = __decorate([
    (0, common_1.Injectable)()
], WardrobeService);
//# sourceMappingURL=wardrobe.service.js.map