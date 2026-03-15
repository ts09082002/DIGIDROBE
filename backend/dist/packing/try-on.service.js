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
const wardrobe_service_1 = require("../wardrobe/wardrobe.service");
const pose_1 = require("../utils/pose");
const packing_service_1 = require("./packing.service");
let TryOnService = TryOnService_1 = class TryOnService {
    wardrobeService;
    packingService;
    logger = new common_1.Logger(TryOnService_1.name);
    uploadsRoot = (0, path_1.join)(__dirname, '..', '..', 'uploads');
    generatedDir = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'tryon', 'generated');
    constructor(wardrobeService, packingService) {
        this.wardrobeService = wardrobeService;
        this.packingService = packingService;
    }
    async generatePreview(userId, request) {
        if (!request.bodyPhotoUrl) {
            throw new common_1.BadRequestException('bodyPhotoUrl is required');
        }
        const suggested = await this.packingService.getStylistSuggestion(userId, request.profile);
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
        const bodyBuffer = fs.readFileSync(bodyPhotoPath);
        const bodyBox = await this.extractBodyBox(bodyBuffer);
        let pose;
        try {
            pose = await (0, pose_1.inferBodyPoseFromAlphaPng)(bodyBuffer, bodyBox);
        }
        catch (e) {
            this.logger.warn(`Pose inference failed: ${e?.message || e}`);
        }
        const previewBuffer = await this.composePreview(bodyBuffer, bodyBox, pose, outfitItems);
        const filename = `${(0, uuid_1.v4)()}_preview.png`;
        const outputPath = (0, path_1.join)(this.generatedDir, filename);
        fs.writeFileSync(outputPath, previewBuffer);
        return {
            previewUrl: `/uploads/tryon/generated/${filename}`,
            bodyPhotoUrl: request.bodyPhotoUrl,
            outfitItems,
            suggestedOutfit,
            bodyBox,
            pose,
            note: `${(0, packing_service_1.buildLookNote)(request.profile)} | server-composed preview`,
            mode: 'local-compose',
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
    async extractBodyBox(imageBuffer) {
        const image = (0, sharp_1.default)(imageBuffer).ensureAlpha();
        const metadata = await image.metadata();
        const width = metadata.width ?? 0;
        const height = metadata.height ?? 0;
        if (!width || !height) {
            return undefined;
        }
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
    async composePreview(bodyBuffer, bodyBox, pose, outfitItems) {
        const bodyMeta = await (0, sharp_1.default)(bodyBuffer).metadata();
        const width = bodyMeta.width ?? 0;
        const height = bodyMeta.height ?? 0;
        if (!width || !height) {
            throw new common_1.BadRequestException('Body image is invalid');
        }
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
            working = await this.eraseAndNeutralizeRegion(working, region);
        }
        const placements = await this.buildGarmentPlacements(normalizedBox, pose, width, height, outfitItems);
        return (0, sharp_1.default)(working).composite(placements).png().toBuffer();
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
    async blurAndSoftenRegion(sourceBuffer, region) {
        return this.eraseAndNeutralizeRegion(sourceBuffer, region);
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
    async buildGarmentPlacements(bodyBox, pose, imageWidth, imageHeight, outfitItems) {
        const grouped = this.groupOutfitItems(outfitItems);
        const box = this.toPixels(bodyBox, imageWidth, imageHeight);
        const layout = this.buildPoseAwareLayout(box, pose, imageWidth, imageHeight, grouped);
        const overlays = [];
        for (const entry of layout) {
            if (!entry.item) {
                continue;
            }
            let garmentBuffer = await this.prepareGarmentOverlay(entry.item, entry.region);
            const rotateDeg = entry.rotateDeg ?? 0;
            if (Math.abs(rotateDeg) > 0.2) {
                garmentBuffer = await (0, sharp_1.default)(garmentBuffer)
                    .rotate(rotateDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .png()
                    .toBuffer();
            }
            const meta = await (0, sharp_1.default)(garmentBuffer).metadata();
            const gw = meta.width ?? entry.region.width;
            const gh = meta.height ?? entry.region.height;
            let left = Math.round(entry.centerX - gw / 2);
            let top = Math.round(entry.centerY - gh / 2);
            ({
                buffer: garmentBuffer,
                left,
                top,
            } = await this.cropOverlayToBounds(garmentBuffer, left, top, imageWidth, imageHeight));
            overlays.push({
                input: garmentBuffer,
                left,
                top,
            });
        }
        return overlays;
    }
    buildPoseAwareLayout(box, pose, imageWidth, imageHeight, grouped) {
        const px = (p) => ({
            x: Math.round(p.x * imageWidth),
            y: Math.round(p.y * imageHeight),
        });
        const leftShoulder = pose
            ? px(pose.leftShoulder)
            : { x: box.left + box.width * 0.28, y: box.top + box.height * 0.2 };
        const rightShoulder = pose
            ? px(pose.rightShoulder)
            : { x: box.left + box.width * 0.72, y: box.top + box.height * 0.2 };
        const leftHip = pose
            ? px(pose.leftHip)
            : { x: box.left + box.width * 0.34, y: box.top + box.height * 0.54 };
        const rightHip = pose
            ? px(pose.rightHip)
            : { x: box.left + box.width * 0.66, y: box.top + box.height * 0.54 };
        const leftAnkle = pose
            ? px(pose.leftAnkle)
            : { x: box.left + box.width * 0.38, y: box.top + box.height * 0.93 };
        const rightAnkle = pose
            ? px(pose.rightAnkle)
            : { x: box.left + box.width * 0.62, y: box.top + box.height * 0.93 };
        const shoulderMid = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2,
        };
        const hipMid = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2,
        };
        const ankleMid = {
            x: (leftAnkle.x + rightAnkle.x) / 2,
            y: (leftAnkle.y + rightAnkle.y) / 2,
        };
        const shoulderW = Math.max(1, Math.abs(rightShoulder.x - leftShoulder.x));
        const hipW = Math.max(1, Math.abs(rightHip.x - leftHip.x));
        const legH = Math.max(1, Math.abs(ankleMid.y - hipMid.y));
        const torsoH = Math.max(1, Math.abs(hipMid.y - shoulderMid.y));
        const rotateDeg = pose?.torsoAngleDeg ?? 0;
        const makeRegionFromCenter = (cx, cy, w, h) => {
            const width = Math.max(1, Math.round(w));
            const height = Math.max(1, Math.round(h));
            return {
                left: Math.round(cx - width / 2),
                top: Math.round(cy - height / 2),
                width,
                height,
            };
        };
        const topCenter = { x: shoulderMid.x, y: shoulderMid.y + torsoH * 0.56 };
        const bottomCenter = { x: hipMid.x, y: hipMid.y + legH * 0.54 };
        const outerCenter = { x: shoulderMid.x, y: shoulderMid.y + torsoH * 0.58 };
        const shoeCenter = { x: ankleMid.x, y: ankleMid.y + legH * 0.03 };
        const topRegion = makeRegionFromCenter(topCenter.x, topCenter.y, shoulderW * 1.55, torsoH * 1.45);
        const outerRegion = makeRegionFromCenter(outerCenter.x, outerCenter.y, shoulderW * 1.75, torsoH * 1.65);
        const bottomRegion = makeRegionFromCenter(bottomCenter.x, bottomCenter.y, hipW * 1.35, legH * 1.12);
        const footwearRegion = makeRegionFromCenter(shoeCenter.x, shoeCenter.y, Math.max(shoulderW * 0.7, hipW * 0.7), Math.max(legH * 0.2, 44));
        const accSize = Math.max(28, Math.round(shoulderW * 0.35));
        const accY = shoulderMid.y + torsoH * 0.12;
        const leftAccRegion = makeRegionFromCenter(leftShoulder.x - shoulderW * 0.25, accY, accSize, accSize);
        const rightAccRegion = makeRegionFromCenter(rightShoulder.x + shoulderW * 0.25, accY, accSize, accSize);
        return [
            {
                item: grouped.bottom,
                region: bottomRegion,
                centerX: bottomCenter.x,
                centerY: bottomCenter.y,
                rotateDeg,
            },
            {
                item: grouped.top,
                region: topRegion,
                centerX: topCenter.x,
                centerY: topCenter.y,
                rotateDeg,
            },
            {
                item: grouped.outerwear,
                region: outerRegion,
                centerX: outerCenter.x,
                centerY: outerCenter.y,
                rotateDeg,
            },
            {
                item: grouped.footwear,
                region: footwearRegion,
                centerX: shoeCenter.x,
                centerY: shoeCenter.y,
                rotateDeg: rotateDeg * 0.6,
            },
            {
                item: grouped.accessories[0],
                region: leftAccRegion,
                centerX: leftAccRegion.left + leftAccRegion.width / 2,
                centerY: leftAccRegion.top + leftAccRegion.height / 2,
                rotateDeg,
            },
            {
                item: grouped.accessories[1],
                region: rightAccRegion,
                centerX: rightAccRegion.left + rightAccRegion.width / 2,
                centerY: rightAccRegion.top + rightAccRegion.height / 2,
                rotateDeg,
            },
        ];
    }
    async cropOverlayToBounds(buffer, left, top, imageWidth, imageHeight) {
        const meta = await (0, sharp_1.default)(buffer).metadata();
        const w = meta.width ?? 0;
        const h = meta.height ?? 0;
        if (!w || !h) {
            return { buffer, left: Math.max(0, left), top: Math.max(0, top) };
        }
        const right = left + w;
        const bottom = top + h;
        const needCrop = left < 0 || top < 0 || right > imageWidth || bottom > imageHeight;
        if (!needCrop) {
            return { buffer, left, top };
        }
        const cropLeft = Math.max(0, -left);
        const cropTop = Math.max(0, -top);
        const cropWidth = Math.max(1, Math.min(w - cropLeft, imageWidth - Math.max(0, left)));
        const cropHeight = Math.max(1, Math.min(h - cropTop, imageHeight - Math.max(0, top)));
        const cropped = await (0, sharp_1.default)(buffer)
            .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight,
        })
            .png()
            .toBuffer();
        return { buffer: cropped, left: Math.max(0, left), top: Math.max(0, top) };
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
            {
                input: garment,
                left,
                top,
            },
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
};
exports.TryOnService = TryOnService;
exports.TryOnService = TryOnService = TryOnService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [wardrobe_service_1.WardrobeService,
        packing_service_1.PackingService])
], TryOnService);
//# sourceMappingURL=try-on.service.js.map