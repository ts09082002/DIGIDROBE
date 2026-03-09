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
exports.PackingController = void 0;
const common_1 = require("@nestjs/common");
const packing_service_1 = require("./packing.service");
const try_on_service_1 = require("./try-on.service");
let PackingController = class PackingController {
    packingService;
    tryOnService;
    constructor(packingService, tryOnService) {
        this.packingService = packingService;
        this.tryOnService = tryOnService;
    }
    async generate(body) {
        if (!body.destination || !body.days) {
            return { success: false, message: 'Missing destination or days' };
        }
        const data = await this.packingService.generatePackingList(body);
        return { success: true, data };
    }
    async getStylistSuggestion() {
        const data = await this.packingService.getStylistSuggestion();
        return { success: true, data };
    }
    async getPersonalizedStylistSuggestion(body) {
        const data = await this.packingService.getStylistSuggestion(body);
        return { success: true, data };
    }
    async generateTryOnPreview(body) {
        const data = await this.tryOnService.generatePreview(body);
        return { success: true, data };
    }
};
exports.PackingController = PackingController;
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PackingController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)('stylist'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PackingController.prototype, "getStylistSuggestion", null);
__decorate([
    (0, common_1.Post)('stylist'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PackingController.prototype, "getPersonalizedStylistSuggestion", null);
__decorate([
    (0, common_1.Post)('try-on/preview'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PackingController.prototype, "generateTryOnPreview", null);
exports.PackingController = PackingController = __decorate([
    (0, common_1.Controller)('api/packing'),
    __metadata("design:paramtypes", [packing_service_1.PackingService,
        try_on_service_1.TryOnService])
], PackingController);
//# sourceMappingURL=packing.controller.js.map