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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WardrobeController = void 0;
const common_1 = require("@nestjs/common");
const wardrobe_service_1 = require("./wardrobe.service");
const calendar_service_1 = require("../calendar/calendar.service");
const notifications_service_1 = require("../notifications/notifications.service");
let WardrobeController = class WardrobeController {
    wardrobeService;
    calendarService;
    notificationsService;
    constructor(wardrobeService, calendarService, notificationsService) {
        this.wardrobeService = wardrobeService;
        this.calendarService = calendarService;
        this.notificationsService = notificationsService;
    }
    async getAll(userId, category, favorite, search) {
        const data = await this.wardrobeService.getAll({
            userId,
            category,
            favorite: favorite === 'true',
            search,
        });
        return { success: true, data };
    }
    async getStats(userId) {
        const data = await this.wardrobeService.getStats(userId);
        return { success: true, data };
    }
    async claim(userId) {
        const wardrobeCount = await this.wardrobeService.claimGuestItems(userId);
        const calendarCount = await this.calendarService.claimGuestItems(userId);
        const notificationsCount = await this.notificationsService.claimGuestItems(userId);
        return {
            success: true,
            data: {
                count: wardrobeCount + calendarCount + notificationsCount,
                details: {
                    wardrobe: wardrobeCount,
                    calendar: calendarCount,
                    notifications: notificationsCount,
                },
            },
        };
    }
    async getById(id) {
        const data = await this.wardrobeService.getById(id);
        return {
            success: true,
            data,
        };
    }
    async create(userId, createItemDto) {
        if (!userId || userId === 'undefined' || userId === 'anonymous') {
            throw new common_1.BadRequestException('Valid User ID required');
        }
        const data = await this.wardrobeService.create({ ...createItemDto, userId });
        return { success: true, data };
    }
    async update(id, body) {
        const data = await this.wardrobeService.update(id, body);
        return {
            success: true,
            data,
        };
    }
    async toggleFavorite(id) {
        const data = await this.wardrobeService.toggleFavorite(id);
        return {
            success: true,
            data,
        };
    }
    async delete(id) {
        await this.wardrobeService.delete(id);
        return { success: true, message: 'Item deleted' };
    }
};
exports.WardrobeController = WardrobeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('favorite')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], WardrobeController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WardrobeController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)('claim'),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WardrobeController.prototype, "claim", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WardrobeController.prototype, "getById", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, wardrobe_service_1.CreateItemDto]),
    __metadata("design:returntype", Promise)
], WardrobeController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WardrobeController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/favorite'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WardrobeController.prototype, "toggleFavorite", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WardrobeController.prototype, "delete", null);
exports.WardrobeController = WardrobeController = __decorate([
    (0, common_1.Controller)('api/wardrobe'),
    __metadata("design:paramtypes", [wardrobe_service_1.WardrobeService,
        calendar_service_1.CalendarService,
        notifications_service_1.NotificationsService])
], WardrobeController);
//# sourceMappingURL=wardrobe.controller.js.map