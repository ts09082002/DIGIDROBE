"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WardrobeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WardrobeService = void 0;
const common_1 = require("@nestjs/common");
const firebase_admin_1 = require("../firebase-admin");
const uuid_1 = require("uuid");
let WardrobeService = WardrobeService_1 = class WardrobeService {
    logger = new common_1.Logger(WardrobeService_1.name);
    collection = (0, firebase_admin_1.getFirebaseAdmin)().firestore().collection('wardrobeItems');
    docToItem(id, data) {
        if (!data) {
            return null;
        }
        return {
            id,
            originalFilename: data.originalFilename ?? '',
            originalUrl: data.originalUrl ?? '',
            processedUrl: data.processedUrl ?? '',
            category: data.category ?? 'tops',
            name: data.name ?? data.originalFilename ?? 'Untitled',
            brand: data.brand ?? '',
            color: data.color ?? '',
            season: data.season ?? [],
            occasion: data.occasion ?? [],
            isFavorite: data.isFavorite ?? false,
            mimeType: data.mimeType ?? 'image/png',
            size: data.size ?? 0,
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: data.updatedAt ?? new Date().toISOString(),
            status: data.status ?? 'done',
            isLowConfidence: data.isLowConfidence ?? false,
            colorPalette: data.colorPalette ?? undefined,
        };
    }
    async getAll(query) {
        const snapshot = await this.collection.get();
        let items = snapshot.docs
            .map((doc) => this.docToItem(doc.id, doc.data()))
            .filter((i) => i !== null);
        const category = query?.category;
        if (category && category !== 'all') {
            items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
        }
        if (query?.search) {
            const q = query.search.toLowerCase();
            items = items.filter((i) => i.name.toLowerCase().includes(q) ||
                i.brand.toLowerCase().includes(q) ||
                i.category.toLowerCase().includes(q));
        }
        if (query?.favorite === 'true') {
            items = items.filter((i) => i.isFavorite);
        }
        return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async getById(id) {
        const doc = await this.collection.doc(id).get();
        const item = this.docToItem(doc.id, doc.data());
        if (!item)
            throw new common_1.NotFoundException(`Item ${id} not found`);
        return item;
    }
    async create(data) {
        const id = data.id || (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const item = {
            id,
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
            createdAt: data.createdAt || now,
            updatedAt: now,
            status: data.status || 'pending',
            isLowConfidence: data.isLowConfidence ?? false,
            colorPalette: data.colorPalette ?? undefined,
        };
        await this.collection.doc(id).set(item);
        return item;
    }
    async update(id, data) {
        const docRef = this.collection.doc(id);
        const existing = await docRef.get();
        if (!existing.exists)
            throw new common_1.NotFoundException(`Item ${id} not found`);
        const existingData = this.docToItem(existing.id, existing.data());
        if (!existingData)
            throw new common_1.NotFoundException(`Item ${id} not found`);
        const updated = {
            ...existingData,
            ...data,
            updatedAt: new Date().toISOString(),
        };
        await docRef.set(updated, { merge: true });
        return updated;
    }
    async toggleFavorite(id) {
        const docRef = this.collection.doc(id);
        const existing = await docRef.get();
        if (!existing.exists)
            throw new common_1.NotFoundException(`Item ${id} not found`);
        const data = existing.data() || {};
        const updated = {
            isFavorite: !data.isFavorite,
            updatedAt: new Date().toISOString(),
        };
        await docRef.set(updated, { merge: true });
        const finalDoc = await docRef.get();
        const item = this.docToItem(finalDoc.id, finalDoc.data());
        if (!item)
            throw new common_1.NotFoundException(`Item ${id} not found`);
        return item;
    }
    async delete(id) {
        const docRef = this.collection.doc(id);
        const existing = await docRef.get();
        if (!existing.exists)
            throw new common_1.NotFoundException(`Item ${id} not found`);
        await docRef.delete();
    }
    async getStats() {
        const snapshot = await this.collection.get();
        const items = snapshot.docs
            .map((doc) => this.docToItem(doc.id, doc.data()))
            .filter((i) => i !== null);
        const categories = {};
        items.forEach((i) => {
            categories[i.category] = (categories[i.category] || 0) + 1;
        });
        return {
            totalItems: items.length,
            totalFavorites: items.filter((i) => i.isFavorite).length,
            categories,
        };
    }
};
exports.WardrobeService = WardrobeService;
exports.WardrobeService = WardrobeService = WardrobeService_1 = __decorate([
    (0, common_1.Injectable)()
], WardrobeService);
//# sourceMappingURL=wardrobe.service.js.map