"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CalendarService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const firebase_admin_1 = require("../firebase-admin");
const uuid_1 = require("uuid");
let CalendarService = CalendarService_1 = class CalendarService {
    logger = new common_1.Logger(CalendarService_1.name);
    collection = (0, firebase_admin_1.getFirebaseAdmin)()
        .firestore()
        .collection('outfits_calendar');
    docToOOTD(id, data) {
        if (!data)
            return null;
        return {
            id,
            date: data.date ?? new Date().toISOString().split('T')[0],
            itemIds: data.itemIds ?? [],
            notes: data.notes ?? '',
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: data.updatedAt ?? new Date().toISOString(),
        };
    }
    async getOOTDByMonth(year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
        const snapshot = await this.collection
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get();
        return snapshot.docs
            .map((doc) => this.docToOOTD(doc.id, doc.data()))
            .filter((i) => i !== null)
            .sort((a, b) => a.date.localeCompare(b.date));
    }
    async saveOOTD(date, itemIds, notes = '') {
        const snapshot = await this.collection
            .where('date', '==', date)
            .limit(1)
            .get();
        let id = (0, uuid_1.v4)();
        let createdAt = new Date().toISOString();
        if (!snapshot.empty) {
            id = snapshot.docs[0].id;
            createdAt = snapshot.docs[0].data().createdAt || createdAt;
        }
        const updatedAt = new Date().toISOString();
        const item = {
            id,
            date,
            itemIds,
            notes,
            createdAt,
            updatedAt,
        };
        await this.collection.doc(id).set(item);
        return item;
    }
    async getStats(days = 30) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        const dateString = dateLimit.toISOString().split('T')[0];
        const snapshot = await this.collection
            .where('date', '>=', dateString)
            .get();
        const itemCounts = {};
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const items = data.itemIds || [];
            items.forEach((itemId) => {
                itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
            });
        });
        const sortedItems = Object.entries(itemCounts)
            .map(([itemId, count]) => ({ itemId, count }))
            .sort((a, b) => b.count - a.count);
        return {
            mostWorn: sortedItems.slice(0, 5),
            leastWorn: sortedItems.slice().reverse().slice(0, 5),
        };
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = CalendarService_1 = __decorate([
    (0, common_1.Injectable)()
], CalendarService);
//# sourceMappingURL=calendar.service.js.map