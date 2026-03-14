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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var UploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const background_removal_service_1 = require("./background-removal.service");
const path_1 = require("path");
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
const wardrobe_service_1 = require("../wardrobe/wardrobe.service");
const pose_1 = require("../utils/pose");
let UploadService = UploadService_1 = class UploadService {
    bgRemovalService;
    wardrobeService;
    logger = new common_1.Logger(UploadService_1.name);
    constructor(bgRemovalService, wardrobeService) {
        this.bgRemovalService = bgRemovalService;
        this.wardrobeService = wardrobeService;
    }
    async processClothingImage(file, preferredCategory) {
        const id = (0, uuid_1.v4)();
        this.logger.log(`Received clothing image: ${file.originalname} (${file.size} bytes)`);
        const originalsDir = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'originals');
        if (!fs.existsSync(originalsDir)) {
            fs.mkdirSync(originalsDir, { recursive: true });
        }
        const originalFilenameOnDisk = file.filename || `${id}${(0, path_1.extname)(file.originalname)}`;
        const originalPath = (0, path_1.join)(originalsDir, originalFilenameOnDisk);
        if (!fs.existsSync(originalPath) && file.path && fs.existsSync(file.path)) {
            fs.copyFileSync(file.path, originalPath);
        }
        const category = this.normalizePreferredCategory(preferredCategory) ||
            this.classifyClothing(file.originalname);
        const mimeType = file.mimetype;
        const size = fs.existsSync(originalPath)
            ? fs.statSync(originalPath).size
            : file.size;
        const createdAt = new Date().toISOString();
        const wardrobeItem = await this.wardrobeService.create({
            id,
            originalFilename: file.originalname,
            originalUrl: `/uploads/originals/${originalFilenameOnDisk}`,
            processedUrl: '',
            category,
            name: this.buildDefaultName(category),
            brand: '',
            isFavorite: false,
            mimeType,
            size,
            createdAt,
            status: 'processing',
        });
        this.startBackgroundProcessing(file, wardrobeItem.id, preferredCategory).catch((err) => {
            this.logger.error(`Background processing failed for ${wardrobeItem.id}: ${err.message}`);
        });
        return wardrobeItem;
    }
    async processBodyPhoto(file) {
        const id = (0, uuid_1.v4)();
        this.logger.log(`Received body photo: ${file.originalname} (${file.size} bytes)`);
        const originalsDir = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'body', 'originals');
        const processedDir = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'body', 'processed');
        fs.mkdirSync(originalsDir, { recursive: true });
        fs.mkdirSync(processedDir, { recursive: true });
        const originalFilenameOnDisk = file.filename || `${id}${(0, path_1.extname)(file.originalname)}`;
        const originalPath = (0, path_1.join)(originalsDir, originalFilenameOnDisk);
        if (!fs.existsSync(originalPath) && file.path && fs.existsSync(file.path)) {
            fs.copyFileSync(file.path, originalPath);
        }
        const processedFilename = `${id}_body.png`;
        const processedPath = (0, path_1.join)(processedDir, processedFilename);
        const createdAt = new Date().toISOString();
        try {
            await this.bgRemovalService.removeBackground(originalPath, processedPath);
            const bodyBox = await this.extractBodyBox(processedPath);
            let pose;
            try {
                pose = await (0, pose_1.inferBodyPoseFromAlphaPng)(fs.readFileSync(processedPath), bodyBox);
            }
            catch (e) {
                this.logger.warn(`Pose inference failed: ${e?.message || e}`);
            }
            return {
                id,
                originalFilename: file.originalname,
                originalUrl: `/uploads/body/originals/${originalFilenameOnDisk}`,
                processedUrl: `/uploads/body/processed/${processedFilename}`,
                mimeType: file.mimetype,
                size: fs.statSync(originalPath).size,
                createdAt,
                status: 'done',
                bodyBox,
                pose,
            };
        }
        catch (error) {
            this.logger.error(`Body photo processing failed: ${error.message}`);
            return {
                id,
                originalFilename: file.originalname,
                originalUrl: `/uploads/body/originals/${originalFilenameOnDisk}`,
                processedUrl: '',
                mimeType: file.mimetype,
                size: fs.statSync(originalPath).size,
                createdAt,
                status: 'failed',
            };
        }
    }
    async extractBodyBox(imagePath) {
        const image = (0, sharp_1.default)(imagePath).ensureAlpha();
        const metadata = await image.metadata();
        const width = metadata.width ?? 0;
        const height = metadata.height ?? 0;
        if (!width || !height) {
            return undefined;
        }
        const { data, info } = await image
            .raw()
            .toBuffer({ resolveWithObject: true });
        const channels = info.channels;
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        let found = false;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * channels;
                const alpha = data[idx + 3];
                if (alpha > 12) {
                    found = true;
                    if (x < minX)
                        minX = x;
                    if (y < minY)
                        minY = y;
                    if (x > maxX)
                        maxX = x;
                    if (y > maxY)
                        maxY = y;
                }
            }
        }
        if (!found) {
            return {
                left: 0.2,
                top: 0.05,
                width: 0.6,
                height: 0.9,
                imageWidth: width,
                imageHeight: height,
            };
        }
        const paddingX = Math.round((maxX - minX) * 0.05);
        const paddingY = Math.round((maxY - minY) * 0.04);
        minX = Math.max(0, minX - paddingX);
        minY = Math.max(0, minY - paddingY);
        maxX = Math.min(width, maxX + paddingX);
        maxY = Math.min(height, maxY + paddingY);
        return {
            left: minX / width,
            top: minY / height,
            width: (maxX - minX) / width,
            height: (maxY - minY) / height,
            imageWidth: width,
            imageHeight: height,
        };
    }
    buildDefaultName(category) {
        const pretty = category && category.length > 0
            ? category.charAt(0).toUpperCase() + category.slice(1)
            : 'Clothing';
        return `${pretty} item`;
    }
    classifyClothing(filename) {
        const name = filename.toLowerCase();
        const categories = {
            tops: [
                'shirt',
                'tshirt',
                't-shirt',
                'blouse',
                'top',
                'polo',
                'tank',
                'sweater',
                'hoodie',
                'pullover',
                'cami',
                'vest',
            ],
            bottoms: [
                'pants',
                'jeans',
                'shorts',
                'skirt',
                'trousers',
                'leggings',
                'chinos',
                'joggers',
            ],
            outerwear: [
                'jacket',
                'coat',
                'blazer',
                'cardigan',
                'windbreaker',
                'parka',
                'trench',
                'bomber',
            ],
            shoes: [
                'shoes',
                'sneakers',
                'boots',
                'sandals',
                'heels',
                'loafers',
                'flats',
                'slippers',
            ],
            accessories: [
                'hat',
                'cap',
                'scarf',
                'belt',
                'tie',
                'watch',
                'bag',
                'purse',
                'glasses',
                'sunglasses',
                'jewelry',
                'necklace',
                'bracelet',
                'ring',
                'earring',
            ],
            dresses: ['dress', 'gown', 'romper', 'jumpsuit'],
        };
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some((kw) => name.includes(kw))) {
                return category;
            }
        }
        return 'tops';
    }
    normalizePreferredCategory(category) {
        if (!category)
            return undefined;
        const c = category.toLowerCase().trim();
        const allowed = new Set([
            'tops',
            'bottoms',
            'outerwear',
            'shoes',
            'accessories',
            'dresses',
            'unclassified',
        ]);
        return allowed.has(c) ? c : undefined;
    }
    async storeMetadata(data) {
        const metaDir = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'metadata');
        if (!fs.existsSync(metaDir)) {
            fs.mkdirSync(metaDir, { recursive: true });
        }
        const itemsFile = (0, path_1.join)(metaDir, 'items.json');
        let items = [];
        if (fs.existsSync(itemsFile)) {
            const raw = fs.readFileSync(itemsFile, 'utf-8');
            items = JSON.parse(raw);
        }
        items.push(data);
        fs.writeFileSync(itemsFile, JSON.stringify(items, null, 2));
    }
    async startBackgroundProcessing(file, wardrobeItemId, preferredCategory) {
        try {
            const processedDir = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'processed');
            if (!fs.existsSync(processedDir)) {
                fs.mkdirSync(processedDir, { recursive: true });
            }
            const processedFilename = `${wardrobeItemId}_clean.png`;
            const processedPath = (0, path_1.join)(processedDir, processedFilename);
            const aiResult = await this.bgRemovalService.removeBackground(file.path, processedPath);
            try {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
            catch (err) {
                this.logger.warn(`Failed to delete temp original image ${file.path}: ${err.message}`);
            }
            const processedStat = fs.statSync(processedPath);
            const updatePayload = {
                processedUrl: `/uploads/processed/${processedFilename}`,
                size: processedStat.size,
                mimeType: file.mimetype,
                status: 'done',
            };
            if (aiResult.classification) {
                updatePayload.isLowConfidence =
                    aiResult.classification.is_low_confidence;
                const aiCategory = aiResult.classification.category;
                const categoryMap = {
                    topwear: 'tops',
                    bottomwear: 'bottoms',
                    outerwear: 'outerwear',
                    footwear: 'shoes',
                    accessories: 'accessories',
                    dresses: 'dresses',
                };
                const hasUserPreferredCategory = !!this.normalizePreferredCategory(preferredCategory);
                if (!hasUserPreferredCategory &&
                    aiCategory &&
                    aiCategory !== 'unclassified' &&
                    categoryMap[aiCategory]) {
                    updatePayload.category = categoryMap[aiCategory];
                    updatePayload.name = this.buildDefaultName(updatePayload.category);
                }
            }
            if (aiResult.palette && aiResult.palette.length > 0) {
                updatePayload.colorPalette = JSON.stringify(aiResult.palette);
            }
            await this.wardrobeService.update(wardrobeItemId, updatePayload);
            this.logger.log(`Background processing completed for wardrobe item ${wardrobeItemId}`);
        }
        catch (error) {
            this.logger.error(`Background processing error for ${wardrobeItemId}: ${error.message}`);
            await this.wardrobeService.update(wardrobeItemId, {
                status: 'failed',
            });
        }
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = UploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [background_removal_service_1.BackgroundRemovalService,
        wardrobe_service_1.WardrobeService])
], UploadService);
//# sourceMappingURL=upload.service.js.map