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
let UploadService = UploadService_1 = class UploadService {
    bgRemovalService;
    logger = new common_1.Logger(UploadService_1.name);
    constructor(bgRemovalService) {
        this.bgRemovalService = bgRemovalService;
    }
    async processClothingImage(file) {
        const id = (0, uuid_1.v4)();
        this.logger.log(`Processing clothing image: ${file.originalname} (${file.size} bytes)`);
        const processedDir = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'processed');
        if (!fs.existsSync(processedDir)) {
            fs.mkdirSync(processedDir, { recursive: true });
        }
        const processedFilename = `${id}_clean.png`;
        const processedPath = (0, path_1.join)(processedDir, processedFilename);
        await this.bgRemovalService.removeBackground(file.path, processedPath);
        const category = this.classifyClothing(file.originalname);
        const result = {
            id,
            originalFilename: file.originalname,
            originalUrl: `/uploads/originals/${file.filename}`,
            processedUrl: `/uploads/processed/${processedFilename}`,
            category,
            mimeType: file.mimetype,
            size: file.size,
            createdAt: new Date().toISOString(),
        };
        await this.storeMetadata(result);
        this.logger.log(`Successfully processed: ${id} → Category: ${category}`);
        return result;
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
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = UploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [background_removal_service_1.BackgroundRemovalService])
], UploadService);
//# sourceMappingURL=upload.service.js.map