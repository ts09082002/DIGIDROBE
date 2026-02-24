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
let WardrobeController = class WardrobeController {
    wardrobeService;
    constructor(wardrobeService) {
        this.wardrobeService = wardrobeService;
    }
    getAll(category, search, favorite) {
        return {
            success: true,
            data: this.wardrobeService.getAll({ category, search, favorite }),
        };
    }
    getStats() {
        return {
            success: true,
            data: this.wardrobeService.getStats(),
        };
    }
    getById(id) {
        return {
            success: true,
            data: this.wardrobeService.getById(id),
        };
    }
    create(body) {
        return {
            success: true,
            data: this.wardrobeService.create(body),
        };
    }
    update(id, body) {
        return {
            success: true,
            data: this.wardrobeService.update(id, body),
        };
    }
    toggleFavorite(id) {
        return {
            success: true,
            data: this.wardrobeService.toggleFavorite(id),
        };
    }
    delete(id) {
        this.wardrobeService.delete(id);
        return { success: true, message: 'Item deleted' };
    }
};
exports.WardrobeController = WardrobeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('favorite')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], WardrobeController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WardrobeController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WardrobeController.prototype, "getById", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WardrobeController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WardrobeController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/favorite'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WardrobeController.prototype, "toggleFavorite", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WardrobeController.prototype, "delete", null);
exports.WardrobeController = WardrobeController = __decorate([
    (0, common_1.Controller)('api/wardrobe'),
    __metadata("design:paramtypes", [wardrobe_service_1.WardrobeService])
], WardrobeController);
//# sourceMappingURL=wardrobe.controller.js.map