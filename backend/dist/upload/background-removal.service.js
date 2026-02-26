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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var BackgroundRemovalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundRemovalService = void 0;
const common_1 = require("@nestjs/common");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
let BackgroundRemovalService = BackgroundRemovalService_1 = class BackgroundRemovalService {
    logger = new common_1.Logger(BackgroundRemovalService_1.name);
    aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    async removeBackground(inputPath, outputPath) {
        this.logger.log(`Removing background from: ${inputPath} using AI`);
        try {
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const resultBuffer = await this.removeBackgroundWithAiService(inputPath);
            const resultMeta = await (0, sharp_1.default)(resultBuffer).metadata();
            if (!resultMeta.hasAlpha) {
                throw new Error('Background removal result has no alpha channel');
            }
            const trimmed = (0, sharp_1.default)(resultBuffer);
            const meta = await trimmed.metadata();
            const CANVAS_SIZE = 1024;
            const PADDING = 80;
            const fitted = await trimmed
                .resize(CANVAS_SIZE - PADDING * 2, CANVAS_SIZE - PADDING * 2, {
                fit: 'inside',
            })
                .extend({
                top: PADDING,
                bottom: PADDING,
                left: PADDING,
                right: PADDING,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
                .png()
                .toBuffer();
            fs.writeFileSync(outputPath, fitted);
            this.logger.log(`Background removed successfully. Output: ${outputPath} (${fitted.length} bytes, original ${meta.width}x${meta.height})`);
        }
        catch (error) {
            this.logger.error(`AI Background removal failed: ${error?.message ?? error}`);
            throw error;
        }
    }
    async removeBackgroundWithAiService(inputPath) {
        const inputBuffer = fs.readFileSync(inputPath);
        const filename = path.basename(inputPath);
        const mimeType = this.getMimeTypeFromPath(inputPath);
        const formData = new FormData();
        formData.append('image', new Blob([inputBuffer], { type: mimeType }), filename);
        const processRes = await fetch(`${this.aiServiceUrl}/process`, {
            method: 'POST',
            body: formData,
        });
        if (!processRes.ok) {
            const detail = await processRes.text().catch(() => '');
            throw new Error(`AI service /process failed with ${processRes.status}${detail ? `: ${detail}` : ''}`);
        }
        const payload = (await processRes.json());
        const processedPath = payload?.data?.processed_url || payload?.data?.processedUrl;
        if (!processedPath || typeof processedPath !== 'string') {
            throw new Error('AI service response missing processed image URL');
        }
        const processedUrl = processedPath.startsWith('http')
            ? processedPath
            : `${this.aiServiceUrl}${processedPath}`;
        const processedRes = await fetch(processedUrl);
        if (!processedRes.ok) {
            throw new Error(`AI service processed image fetch failed with ${processedRes.status}`);
        }
        const imageArrayBuffer = await processedRes.arrayBuffer();
        return Buffer.from(imageArrayBuffer);
    }
    getMimeTypeFromPath(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.png')
            return 'image/png';
        if (ext === '.webp')
            return 'image/webp';
        if (ext === '.heic')
            return 'image/heic';
        if (ext === '.heif')
            return 'image/heif';
        return 'image/jpeg';
    }
};
exports.BackgroundRemovalService = BackgroundRemovalService;
exports.BackgroundRemovalService = BackgroundRemovalService = BackgroundRemovalService_1 = __decorate([
    (0, common_1.Injectable)()
], BackgroundRemovalService);
//# sourceMappingURL=background-removal.service.js.map