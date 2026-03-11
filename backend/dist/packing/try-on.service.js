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
var TryOnService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TryOnService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path_1 = require("path");
const sharp_1 = __importDefault(require("sharp"));
const uuid_1 = require("uuid");
const replicate_1 = __importDefault(require("replicate"));
const wardrobe_service_1 = require("../wardrobe/wardrobe.service");
const packing_service_1 = require("./packing.service");
let TryOnService = TryOnService_1 = class TryOnService {
    wardrobeService;
    packingService;
    logger = new common_1.Logger(TryOnService_1.name);
    uploadsRoot = (0, path_1.join)(__dirname, '..', '..', 'uploads');
    generatedDir = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'tryon', 'generated');
    replicate = null;
    constructor(wardrobeService, packingService) {
        this.wardrobeService = wardrobeService;
        this.packingService = packingService;
        const token = process.env.REPLICATE_API_TOKEN;
        if (token) {
            this.replicate = new replicate_1.default({ auth: token });
            this.logger.log('Replicate client initialized for IDM-VTON');
        }
        else {
            this.logger.warn('REPLICATE_API_TOKEN not set — IDM-VTON try-on will be unavailable');
        }
    }
    async generatePreview(request) {
        if (!request.bodyPhotoUrl) {
            throw new common_1.BadRequestException('bodyPhotoUrl is required');
        }
        const suggested = await this.packingService.getStylistSuggestion(request.profile);
        const suggestedOutfit = suggested.suggestedOutfit.filter((item) => item.status === 'done' && item.processedUrl);
        const outfitItems = request.itemIds && request.itemIds.length > 0
            ? (await Promise.all(request.itemIds.map((id) => this.wardrobeService.getById(id)))).filter((item) => item.status === 'done' && item.processedUrl)
            : suggestedOutfit;
        if (outfitItems.length === 0) {
            throw new common_1.BadRequestException('No ready outfit items were found for try-on preview');
        }
        const bodyPhotoPath = this.resolveUploadPath(request.bodyPhotoUrl);
        if (!fs.existsSync(bodyPhotoPath)) {
            throw new common_1.NotFoundException(`Body photo not found for ${request.bodyPhotoUrl}`);
        }
        fs.mkdirSync(this.generatedDir, { recursive: true });
        const garment = this.pickPrimaryGarment(outfitItems);
        const garmentPath = this.resolveUploadPath(garment.processedUrl || garment.originalUrl);
        if (!fs.existsSync(garmentPath)) {
            throw new common_1.NotFoundException(`Garment image not found for ${garment.originalFilename}`);
        }
        let previewUrl;
        let mode = 'idm-vton';
        try {
            previewUrl = await this.runIdmVton(bodyPhotoPath, garmentPath, garment);
            this.logger.log('IDM-VTON succeeded!');
        }
        catch (error) {
            this.logger.error(`IDM-VTON failed: ${error?.message || error}`, error?.stack);
            mode = 'local-compose';
            try {
                previewUrl = await this.localComposeFallback(bodyPhotoPath, outfitItems);
            }
            catch (fallbackError) {
                this.logger.error(`Local compose fallback also failed: ${fallbackError?.message || fallbackError}`);
                const filename = `${(0, uuid_1.v4)()}_bodyphoto.png`;
                const outputPath = (0, path_1.join)(this.generatedDir, filename);
                fs.copyFileSync(bodyPhotoPath, outputPath);
                previewUrl = `/uploads/tryon/generated/${filename}`;
            }
        }
        return {
            previewUrl,
            bodyPhotoUrl: request.bodyPhotoUrl,
            outfitItems,
            suggestedOutfit,
            note: `${(0, packing_service_1.buildLookNote)(request.profile)} | ${mode} preview`,
            mode,
        };
    }
    async runIdmVton(bodyPhotoPath, garmentPath, garment) {
        if (!this.replicate) {
            throw new Error('Replicate client not initialized — REPLICATE_API_TOKEN missing');
        }
        const bodyBuffer = fs.readFileSync(bodyPhotoPath);
        const garmentBuffer = fs.readFileSync(garmentPath);
        const bodyJpeg = await (0, sharp_1.default)(bodyBuffer)
            .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 90 })
            .toBuffer();
        const garmentJpeg = await (0, sharp_1.default)(garmentBuffer)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .resize({ width: 768, height: 1024, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 90 })
            .toBuffer();
        const bodyBase64 = `data:image/jpeg;base64,${bodyJpeg.toString('base64')}`;
        const garmentBase64 = `data:image/jpeg;base64,${garmentJpeg.toString('base64')}`;
        const cat = (0, packing_service_1.categorize)(garment.category);
        let vtonCategory = 'upper_body';
        if (cat === 'bottoms' || cat === 'dresses') {
            vtonCategory = 'lower_body';
        }
        if (cat === 'dresses') {
            vtonCategory = 'dresses';
        }
        this.logger.log(`Calling IDM-VTON on Replicate — category: ${vtonCategory}, garment: ${garment.originalFilename}`);
        const output = await this.replicate.run('cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985', {
            input: {
                human_img: bodyBase64,
                garm_img: garmentBase64,
                garment_des: garment.name || 'A clothing garment',
                category: vtonCategory,
                auto_mask: true,
                auto_crop: true,
                seed: 42,
                num_inference_steps: 30,
            },
        });
        this.logger.log(`IDM-VTON raw output type: ${typeof output}, isArray: ${Array.isArray(output)}, value preview: ${String(output).substring(0, 200)}`);
        const resultUrl = this.extractResultUrl(output);
        const filename = `${(0, uuid_1.v4)()}_idmvton.png`;
        const outputPath = (0, path_1.join)(this.generatedDir, filename);
        if (resultUrl.startsWith('http')) {
            this.logger.log(`Downloading IDM-VTON result from: ${resultUrl.substring(0, 100)}...`);
            const response = await fetch(resultUrl);
            if (!response.ok) {
                throw new Error(`Failed to download IDM-VTON result: ${response.status} ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
        }
        else if (resultUrl.startsWith('data:')) {
            const base64Data = resultUrl.split(',')[1];
            fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
        }
        else {
            throw new Error(`Unexpected IDM-VTON output format: ${resultUrl.substring(0, 100)}`);
        }
        this.logger.log(`IDM-VTON result saved to ${outputPath}`);
        return `/uploads/tryon/generated/${filename}`;
    }
    extractResultUrl(output) {
        if (typeof output === 'string' && output.length > 0) {
            return output;
        }
        if (Array.isArray(output) && output.length > 0) {
            const first = output[0];
            if (typeof first === 'string')
                return first;
            if (first && typeof first === 'object') {
                if ('url' in first && typeof first.url === 'function') {
                    return first.url();
                }
                if ('url' in first && typeof first.url === 'string') {
                    return first.url;
                }
                if ('href' in first && typeof first.href === 'string') {
                    return first.href;
                }
                const str = String(first);
                if (str.startsWith('http') || str.startsWith('data:'))
                    return str;
            }
        }
        if (output && typeof output === 'object' && !Array.isArray(output)) {
            const obj = output;
            if ('url' in obj && typeof obj.url === 'function')
                return obj.url();
            if ('url' in obj && typeof obj.url === 'string')
                return obj.url;
            if ('href' in obj && typeof obj.href === 'string')
                return obj.href;
            const str = String(obj);
            if (str.startsWith('http') || str.startsWith('data:'))
                return str;
        }
        throw new Error(`Could not extract URL from IDM-VTON output. Type: ${typeof output}, value: ${String(output).substring(0, 300)}`);
    }
    pickPrimaryGarment(outfitItems) {
        const priority = ['tops', 'dresses', 'outerwear', 'bottoms'];
        for (const cat of priority) {
            const item = outfitItems.find((i) => (0, packing_service_1.categorize)(i.category) === cat);
            if (item)
                return item;
        }
        return outfitItems[0];
    }
    async localComposeFallback(bodyPhotoPath, outfitItems) {
        const bodyBuffer = fs.readFileSync(bodyPhotoPath);
        const bodyMeta = await (0, sharp_1.default)(bodyBuffer).metadata();
        const width = bodyMeta.width ?? 0;
        const height = bodyMeta.height ?? 0;
        if (!width || !height) {
            throw new common_1.BadRequestException('Body image is invalid');
        }
        const bodyBox = await this.extractBodyBox(bodyBuffer);
        const normalizedBox = bodyBox ?? {
            left: 0.2,
            top: 0.06,
            width: 0.6,
            height: 0.88,
            imageWidth: width,
            imageHeight: height,
        };
        let working = await (0, sharp_1.default)(bodyBuffer).ensureAlpha().png().toBuffer();
        for (const region of this.getSuppressionRegions(normalizedBox, width, height)) {
            const clamped = this.clampRegion(region, width, height);
            if (clamped.width > 0 && clamped.height > 0) {
                working = await this.eraseAndNeutralizeRegion(working, clamped);
            }
        }
        const placements = await this.buildGarmentPlacements(normalizedBox, width, height, outfitItems);
        const previewBuffer = await (0, sharp_1.default)(working)
            .composite(placements)
            .png()
            .toBuffer();
        const filename = `${(0, uuid_1.v4)()}_fallback.png`;
        const outputPath = (0, path_1.join)(this.generatedDir, filename);
        fs.writeFileSync(outputPath, previewBuffer);
        return `/uploads/tryon/generated/${filename}`;
    }
    clampRegion(region, imageWidth, imageHeight) {
        const left = Math.max(0, Math.min(region.left, imageWidth - 1));
        const top = Math.max(0, Math.min(region.top, imageHeight - 1));
        const right = Math.min(imageWidth, left + region.width);
        const bottom = Math.min(imageHeight, top + region.height);
        return {
            left,
            top,
            width: Math.max(1, right - left),
            height: Math.max(1, bottom - top),
        };
    }
    async extractBodyBox(imageBuffer) {
        const image = (0, sharp_1.default)(imageBuffer).ensureAlpha();
        const metadata = await image.metadata();
        const width = metadata.width ?? 0;
        const height = metadata.height ?? 0;
        if (!width || !height)
            return undefined;
        const { data, info } = await image
            .raw()
            .toBuffer({ resolveWithObject: true });
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        let found = false;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * info.channels;
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
                top: 0.06,
                width: 0.6,
                height: 0.88,
                imageWidth: width,
                imageHeight: height,
            };
        }
        return {
            left: minX / width,
            top: minY / height,
            width: (maxX - minX) / width,
            height: (maxY - minY) / height,
            imageWidth: width,
            imageHeight: height,
        };
    }
    getSuppressionRegions(bodyBox, imageWidth, imageHeight) {
        const box = this.toPixels(bodyBox, imageWidth, imageHeight);
        return [
            {
                left: Math.round(box.left + box.width * 0.1),
                top: Math.round(box.top + box.height * 0.09),
                width: Math.round(box.width * 0.8),
                height: Math.round(box.height * 0.34),
            },
            {
                left: Math.round(box.left + box.width * 0.18),
                top: Math.round(box.top + box.height * 0.38),
                width: Math.round(box.width * 0.64),
                height: Math.round(box.height * 0.42),
            },
        ];
    }
    async eraseAndNeutralizeRegion(sourceBuffer, region) {
        const safeRegion = {
            left: Math.max(0, region.left),
            top: Math.max(0, region.top),
            width: Math.max(1, region.width),
            height: Math.max(1, region.height),
        };
        const neutralizedRegion = await (0, sharp_1.default)(sourceBuffer)
            .extract(safeRegion)
            .blur(18)
            .modulate({ brightness: 1.06, saturation: 0.12 })
            .composite([
            {
                input: Buffer.from(`<svg width="${safeRegion.width}" height="${safeRegion.height}" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="fade" cx="50%" cy="45%" r="75%">
                  <stop offset="0%" stop-color="rgba(255,255,255,0.14)" />
                  <stop offset="100%" stop-color="rgba(255,255,255,0.02)" />
                </radialGradient>
              </defs>
              <ellipse cx="50%" cy="50%" rx="46%" ry="50%" fill="url(#fade)" />
            </svg>`),
                blend: 'screen',
            },
        ])
            .png()
            .toBuffer();
        return (0, sharp_1.default)(sourceBuffer)
            .composite([
            {
                input: neutralizedRegion,
                left: safeRegion.left,
                top: safeRegion.top,
            },
        ])
            .png()
            .toBuffer();
    }
    async buildGarmentPlacements(bodyBox, imageWidth, imageHeight, outfitItems) {
        const grouped = this.groupOutfitItems(outfitItems);
        const box = this.toPixels(bodyBox, imageWidth, imageHeight);
        const layout = [
            {
                item: grouped.bottom,
                region: this.clampRegion({
                    left: Math.round(box.left + box.width * 0.14),
                    top: Math.round(box.top + box.height * 0.32),
                    width: Math.round(box.width * 0.72),
                    height: Math.round(box.height * 0.54),
                }, imageWidth, imageHeight),
            },
            {
                item: grouped.top,
                region: this.clampRegion({
                    left: Math.round(box.left + box.width * 0.04),
                    top: Math.round(box.top + box.height * 0.06),
                    width: Math.round(box.width * 0.92),
                    height: Math.round(box.height * 0.38),
                }, imageWidth, imageHeight),
            },
            {
                item: grouped.outerwear,
                region: this.clampRegion({
                    left: Math.round(box.left + box.width * 0.02),
                    top: Math.round(box.top + box.height * 0.04),
                    width: Math.round(box.width * 0.96),
                    height: Math.round(box.height * 0.46),
                }, imageWidth, imageHeight),
            },
            {
                item: grouped.footwear,
                region: this.clampRegion({
                    left: Math.round(box.left + box.width * 0.18),
                    top: Math.round(box.top + box.height * 0.84),
                    width: Math.round(box.width * 0.64),
                    height: Math.round(box.height * 0.13),
                }, imageWidth, imageHeight),
            },
        ].filter((entry) => Boolean(entry.item));
        const overlays = [];
        for (const entry of layout) {
            if (!entry.item)
                continue;
            const garmentBuffer = await this.prepareGarmentOverlay(entry.item, entry.region);
            overlays.push({
                input: garmentBuffer,
                left: entry.region.left,
                top: entry.region.top,
            });
        }
        return overlays;
    }
    async prepareGarmentOverlay(item, region) {
        const path = this.resolveUploadPath(item.processedUrl || item.originalUrl);
        const inputBuffer = fs.readFileSync(path);
        const category = (0, packing_service_1.categorize)(item.category);
        const targetWidth = Math.max(1, region.width);
        const targetHeight = Math.max(1, region.height);
        const resizedWidth = Math.max(1, Math.round(targetWidth *
            (category === 'tops'
                ? 1.08
                : category === 'outerwear'
                    ? 1.1
                    : category === 'bottoms' || category === 'dresses'
                        ? 1.04
                        : category === 'footwear'
                            ? 1.12
                            : 1)));
        const resizedHeight = Math.max(1, Math.round(targetHeight *
            (category === 'bottoms' || category === 'dresses'
                ? 1.08
                : category === 'footwear'
                    ? 0.96
                    : 1)));
        const garment = await (0, sharp_1.default)(inputBuffer)
            .ensureAlpha()
            .trim()
            .resize({
            width: resizedWidth,
            height: resizedHeight,
            fit: 'inside',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
            .modulate({
            brightness: category === 'footwear' ? 0.98 : 1.02,
            saturation: 1.05,
        })
            .png()
            .toBuffer();
        const garmentMeta = await (0, sharp_1.default)(garment).metadata();
        const garmentWidth = garmentMeta.width ?? targetWidth;
        const garmentHeight = garmentMeta.height ?? targetHeight;
        const left = Math.max(0, Math.round((targetWidth - garmentWidth) / 2));
        const top = Math.max(0, Math.round((targetHeight - garmentHeight) / 2));
        return (0, sharp_1.default)({
            create: {
                width: targetWidth,
                height: targetHeight,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
        })
            .composite([
            { input: garment, left, top },
            {
                input: Buffer.from(`<svg width="${targetWidth}" height="${targetHeight}" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="rgba(255,255,255,0.03)" />
            </svg>`),
                blend: 'screen',
            },
        ])
            .png()
            .toBuffer();
    }
    groupOutfitItems(outfitItems) {
        const top = outfitItems.find((item) => (0, packing_service_1.categorize)(item.category) === 'tops');
        const bottom = outfitItems.find((item) => ['bottoms', 'dresses'].includes((0, packing_service_1.categorize)(item.category)));
        const outerwear = outfitItems.find((item) => (0, packing_service_1.categorize)(item.category) === 'outerwear');
        const footwear = outfitItems.find((item) => (0, packing_service_1.categorize)(item.category) === 'footwear');
        const accessories = outfitItems.filter((item) => (0, packing_service_1.categorize)(item.category) === 'accessories');
        return { top, bottom, outerwear, footwear, accessories };
    }
    toPixels(bodyBox, imageWidth, imageHeight) {
        return {
            left: Math.max(0, Math.round(bodyBox.left * imageWidth)),
            top: Math.max(0, Math.round(bodyBox.top * imageHeight)),
            width: Math.max(1, Math.round(bodyBox.width * imageWidth)),
            height: Math.max(1, Math.round(bodyBox.height * imageHeight)),
        };
    }
    resolveUploadPath(urlOrPath) {
        const raw = (urlOrPath || '').trim();
        if (!raw) {
            throw new common_1.BadRequestException('Missing upload path');
        }
        let pathname = raw;
        if (raw.startsWith('http://') || raw.startsWith('https://')) {
            pathname = new URL(raw).pathname;
        }
        const uploadPrefix = '/uploads/';
        const index = pathname.indexOf(uploadPrefix);
        if (index === -1) {
            throw new common_1.BadRequestException(`Unsupported upload path: ${urlOrPath}`);
        }
        const relativePath = pathname.slice(index + uploadPrefix.length);
        const resolved = (0, path_1.normalize)((0, path_1.join)(this.uploadsRoot, relativePath));
        const normalizedRoot = (0, path_1.normalize)(this.uploadsRoot);
        if (!resolved.startsWith(normalizedRoot)) {
            throw new common_1.BadRequestException('Invalid upload path');
        }
        return resolved;
    }
};
exports.TryOnService = TryOnService;
exports.TryOnService = TryOnService = TryOnService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [wardrobe_service_1.WardrobeService,
        packing_service_1.PackingService])
], TryOnService);
//# sourceMappingURL=try-on.service.js.map