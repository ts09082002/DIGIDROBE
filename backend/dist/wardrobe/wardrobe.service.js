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
var WardrobeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WardrobeService = exports.CreateItemDto = exports.WardrobeItem = void 0;
const common_1 = require("@nestjs/common");
const firebase_admin_1 = require("../firebase-admin");
const uuid_1 = require("uuid");
const notifications_service_1 = require("../notifications/notifications.service");
class WardrobeItem {
    id;
    userId;
    originalFilename;
    originalUrl;
    processedUrl;
    category;
    subCategory;
    name;
    brand;
    color;
    season;
    occasion;
    isFavorite;
    mimeType;
    size;
    createdAt;
    updatedAt;
    status;
    isLowConfidence;
    colorPalette;
    mlLabels;
}
exports.WardrobeItem = WardrobeItem;
class CreateItemDto {
    userId;
    originalFilename;
    originalUrl;
    processedUrl;
    category;
    subCategory;
    name;
    brand;
    color;
    season;
    occasion;
    mimeType;
    size;
    status;
    isFavorite;
    isLowConfidence;
    colorPalette;
    mlLabels;
}
exports.CreateItemDto = CreateItemDto;
let WardrobeService = WardrobeService_1 = class WardrobeService {
    notifications;
    logger = new common_1.Logger(WardrobeService_1.name);
    collection = (0, firebase_admin_1.getFirebaseAdmin)()
        .firestore()
        .collection('wardrobeItems');
    constructor(notifications) {
        this.notifications = notifications;
    }
    sanitizeForFirestore(data) {
        return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    }
    docToItem(id, data) {
        if (!data) {
            return null;
        }
        return {
            id,
            userId: data.userId ?? '',
            originalFilename: data.originalFilename ?? '',
            originalUrl: data.originalUrl ?? '',
            processedUrl: data.processedUrl ?? undefined,
            category: data.category ?? 'tops',
            subCategory: data.subCategory ?? undefined,
            name: data.name ?? data.originalFilename ?? 'Untitled',
            brand: data.brand ?? undefined,
            color: data.color ?? undefined,
            season: data.season ?? undefined,
            occasion: data.occasion ?? undefined,
            isFavorite: data.isFavorite ?? false,
            mimeType: data.mimeType ?? 'image/png',
            size: data.size ?? 0,
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: data.updatedAt ?? new Date().toISOString(),
            status: data.status ?? 'done',
            isLowConfidence: data.isLowConfidence ?? undefined,
            colorPalette: data.colorPalette ?? undefined,
            mlLabels: data.mlLabels ?? undefined,
        };
    }
    async getAll(filters) {
        if (!filters.userId) {
            this.logger.warn('getAll: userId is missing');
            return [];
        }
        let query = this.collection.where('userId', '==', filters.userId);
        if (filters.category && filters.category !== 'all') {
            query = query.where('category', '==', filters.category);
        }
        if (filters.favorite === true) {
            query = query.where('isFavorite', '==', true);
        }
        const snapshot = await query.get();
        let items = snapshot.docs
            .map((doc) => this.docToItem(doc.id, doc.data()))
            .filter((i) => i !== null);
        if (filters?.search) {
            const q = filters.search.toLowerCase();
            items = items.filter((i) => i.name?.toLowerCase().includes(q) ||
                i.brand?.toLowerCase().includes(q) ||
                i.category?.toLowerCase().includes(q));
        }
        if (filters?.favorite === true) {
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
            userId: data.userId || 'anonymous',
            originalFilename: data.originalFilename || '',
            originalUrl: data.originalUrl || '',
            processedUrl: data.processedUrl || '',
            category: data.category || 'tops',
            subCategory: data.subCategory || '',
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
            mlLabels: data.mlLabels ?? [],
        };
        await this.collection.doc(id).set(this.sanitizeForFirestore(item));
        if (item.userId && item.userId !== 'anonymous') {
            try {
                await this.notifications.create({
                    userId: item.userId,
                    type: 'upload',
                    title: 'New item added',
                    message: `We’ve added “${item.name || item.category}” to your wardrobe.`,
                    metadata: { outfitItemIds: [item.id] },
                });
            }
            catch (err) {
                this.logger.warn(`Failed to create upload notification for user ${item.userId}: ${err}`);
            }
        }
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
        await docRef.set(this.sanitizeForFirestore(updated), { merge: true });
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
        await docRef.set(this.sanitizeForFirestore(updated), { merge: true });
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
    async getStats(userId) {
        if (!userId) {
            throw new Error('userId is required for getStats');
        }
        const snapshot = await this.collection.where('userId', '==', userId).get();
        const items = snapshot.docs
            .map((doc) => this.docToItem(doc.id, doc.data()))
            .filter((i) => i !== null);
        const categories = {};
        items.forEach((i) => {
            const cat = i.category || 'unclassified';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        return {
            totalItems: items.length,
            totalFavorites: items.filter((i) => i.isFavorite).length,
            categories,
        };
    }
    async claimGuestItems(userId) {
        if (!userId || userId === 'anonymous' || userId === 'undefined')
            return 0;
        const anonSnapshot = await this.collection
            .where('userId', '==', 'anonymous')
            .get();
        const allSnapshot = await this.collection.get();
        const orphanedDocs = allSnapshot.docs.filter(doc => {
            const d = doc.data();
            return !d.userId || d.userId === 'anonymous' || d.userId === 'undefined';
        });
        if (orphanedDocs.length === 0)
            return 0;
        const batch = (0, firebase_admin_1.getFirebaseAdmin)().firestore().batch();
        orphanedDocs.forEach((doc) => {
            batch.update(doc.ref, {
                userId,
                updatedAt: new Date().toISOString(),
            });
        });
        await batch.commit();
        this.logger.log(`Claimed ${orphanedDocs.length} orphaned/anonymous items for user ${userId}`);
        return orphanedDocs.length;
    }
};
exports.WardrobeService = WardrobeService;
exports.WardrobeService = WardrobeService = WardrobeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_service_1.NotificationsService))),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], WardrobeService);
//# sourceMappingURL=wardrobe.service.js.map