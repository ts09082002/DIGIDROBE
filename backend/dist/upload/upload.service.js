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
var UploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const background_removal_service_1 = require("./background-removal.service");
const path_1 = require("path");
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const wardrobe_service_1 = require("../wardrobe/wardrobe.service");
let UploadService = UploadService_1 = class UploadService {
    bgRemovalService;
    wardrobeService;
    logger = new common_1.Logger(UploadService_1.name);
    constructor(bgRemovalService, wardrobeService) {
        this.bgRemovalService = bgRemovalService;
        this.wardrobeService = wardrobeService;
    }
    async processClothingImage(file) {
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
        const category = this.classifyClothing(file.originalname);
        const mimeType = file.mimetype;
        const size = fs.existsSync(originalPath) ? fs.statSync(originalPath).size : file.size;
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
        this.startBackgroundProcessing(file, wardrobeItem.id).catch((err) => {
            this.logger.error(`Background processing failed for ${wardrobeItem.id}: ${err.message}`);
        });
        return wardrobeItem;
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
            'tops': ['shirt', 'tshirt', 't-shirt', 'blouse', 'top', 'polo', 'tank', 'sweater', 'hoodie', 'pullover', 'cami', 'vest'],
            'bottoms': ['pants', 'jeans', 'shorts', 'skirt', 'trousers', 'leggings', 'chinos', 'joggers'],
            'outerwear': ['jacket', 'coat', 'blazer', 'cardigan', 'windbreaker', 'parka', 'trench', 'bomber'],
            'shoes': ['shoes', 'sneakers', 'boots', 'sandals', 'heels', 'loafers', 'flats', 'slippers'],
            'accessories': ['hat', 'cap', 'scarf', 'belt', 'tie', 'watch', 'bag', 'purse', 'glasses', 'sunglasses', 'jewelry', 'necklace', 'bracelet', 'ring', 'earring'],
            'dresses': ['dress', 'gown', 'romper', 'jumpsuit'],
        };
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(kw => name.includes(kw))) {
                return category;
            }
        }
        return 'tops';
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
    async startBackgroundProcessing(file, wardrobeItemId) {
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
                updatePayload.isLowConfidence = aiResult.classification.is_low_confidence;
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