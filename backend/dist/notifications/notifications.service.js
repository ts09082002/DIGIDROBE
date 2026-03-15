"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const firebase_admin_1 = require("../firebase-admin");
const uuid_1 = require("uuid");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    logger = new common_1.Logger(NotificationsService_1.name);
    collection = (0, firebase_admin_1.getFirebaseAdmin)()
        .firestore()
        .collection('notifications');
    async create(input) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const doc = {
            id,
            userId: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            createdAt: now,
            read: input.read ?? false,
            metadata: input.metadata,
        };
        await this.collection.doc(id).set(doc);
        this.logger.debug(`Created notification ${id} for user ${input.userId}`);
        return doc;
    }
    async findForUser(userId) {
        if (!userId || userId === 'undefined') {
            this.logger.warn('findForUser: userId is missing or invalid');
            return [];
        }
        const snapshot = await this.collection
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        return snapshot.docs.map((d) => d.data());
    }
    async delete(id) {
        await this.collection.doc(id).delete();
        this.logger.debug(`Deleted notification ${id}`);
    }
    async claimGuestItems(userId) {
        if (!userId || userId === 'anonymous' || userId === 'undefined')
            return 0;
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
            });
        });
        await batch.commit();
        this.logger.log(`Claimed ${orphanedDocs.length} orphaned notifications for user ${userId}`);
        return orphanedDocs.length;
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)()
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map