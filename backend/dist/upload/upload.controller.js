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
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const uuid_1 = require("uuid");
const upload_service_1 = require("./upload.service");
const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
];
const MAX_SIZE = 20 * 1024 * 1024;
const clothingStorage = (0, multer_1.diskStorage)({
    destination: (0, path_1.join)(__dirname, '..', '..', 'uploads', 'originals'),
    filename: (_req, file, cb) => {
        const uniqueName = `${(0, uuid_1.v4)()}${(0, path_1.extname)(file.originalname)}`;
        cb(null, uniqueName);
    },
});
const clothingFileFilter = (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
        cb(new common_1.BadRequestException('Only JPEG, PNG, WebP, and HEIC images are allowed'), false);
        return;
    }
    cb(null, true);
};
let UploadController = class UploadController {
    uploadService;
    constructor(uploadService) {
        this.uploadService = uploadService;
    }
    async uploadClothing(files, category, subCategory, mlLabelsJson, colorPaletteJson, processedOnDevice) {
        const imageFile = files?.image?.[0];
        if (!imageFile) {
            throw new common_1.BadRequestException('No image file provided');
        }
        let mlLabels;
        if (mlLabelsJson) {
            try {
                mlLabels = JSON.parse(mlLabelsJson);
            }
            catch {
                mlLabels = undefined;
            }
        }
        if (processedOnDevice === 'true') {
            const result = await this.uploadService.storeProcessedClothingImage(imageFile, files?.original?.[0], category, subCategory, mlLabels, colorPaletteJson);
            return { success: true, data: result };
        }
        const result = await this.uploadService.processClothingImage(imageFile, category, subCategory, mlLabels);
        return {
            success: true,
            data: result,
        };
    }
    async uploadBodyPhoto(file) {
        if (!file) {
            throw new common_1.BadRequestException('No image file provided');
        }
        const result = await this.uploadService.processBodyPhoto(file);
        return {
            success: true,
            data: result,
        };
    }
    async getProcessedImage(filename, res) {
        const filePath = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'processed', filename);
        res.sendFile(filePath);
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('clothing'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'image', maxCount: 1 },
        { name: 'original', maxCount: 1 },
    ], {
        storage: clothingStorage,
        limits: { fileSize: MAX_SIZE },
        fileFilter: clothingFileFilter,
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)('category')),
    __param(2, (0, common_1.Body)('subCategory')),
    __param(3, (0, common_1.Body)('mlLabels')),
    __param(4, (0, common_1.Body)('colorPalette')),
    __param(5, (0, common_1.Body)('processedOnDevice')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadClothing", null);
__decorate([
    (0, common_1.Post)('body-photo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', {
        storage: (0, multer_1.diskStorage)({
            destination: (0, path_1.join)(__dirname, '..', '..', 'uploads', 'body', 'originals'),
            filename: (_req, file, cb) => {
                const uniqueName = `${(0, uuid_1.v4)()}${(0, path_1.extname)(file.originalname)}`;
                cb(null, uniqueName);
            },
        }),
        limits: { fileSize: MAX_SIZE },
        fileFilter: (_req, file, cb) => {
            if (!ALLOWED_TYPES.includes(file.mimetype)) {
                cb(new common_1.BadRequestException('Only JPEG, PNG, WebP, and HEIC images are allowed'), false);
                return;
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadBodyPhoto", null);
__decorate([
    (0, common_1.Get)('processed/:filename'),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "getProcessedImage", null);
exports.UploadController = UploadController = __decorate([
    (0, common_1.Controller)('api/upload'),
    __metadata("design:paramtypes", [upload_service_1.UploadService])
], UploadController);
//# sourceMappingURL=upload.controller.js.map