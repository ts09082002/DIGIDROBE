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
const AI_TIMEOUT_MS = 10000;
const AI_MAX_RETRIES = 0;
let BackgroundRemovalService = BackgroundRemovalService_1 = class BackgroundRemovalService {
    logger = new common_1.Logger(BackgroundRemovalService_1.name);
    aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    async removeBackground(inputPath, outputPath) {
        this.logger.log(`Removing background from: ${inputPath} via AI service (u2netp)`);
        try {
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const aiResult = await this.callAIServiceWithRetry(inputPath);
            const fitted = await (0, sharp_1.default)(aiResult.imageBuffer)
                .trim()
                .extend({
                top: 40,
                bottom: 40,
                left: 40,
                right: 40,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
                .png()
                .toBuffer();
            fs.writeFileSync(outputPath, fitted);
            this.logger.log(`Background removed successfully. Output: ${outputPath} (${fitted.length} bytes)`);
            return {
                imageBuffer: fitted,
                classification: aiResult.classification,
                dominantColor: aiResult.dominantColor,
                colorName: aiResult.colorName,
                palette: aiResult.palette,
            };
        }
        catch (error) {
            console.error('Background removal error:', error);
            this.logger.error(`AI service background removal failed: ${error.message}`);
            await this.fallbackRemoval(inputPath, outputPath);
            const fallbackBuffer = fs.readFileSync(outputPath);
            return { imageBuffer: fallbackBuffer };
        }
    }
    async callAIServiceWithRetry(inputPath) {
        const inputBuffer = fs.readFileSync(inputPath);
        for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    this.logger.warn(`Retrying AI service call (attempt ${attempt + 1})...`);
                }
                const blob = new Blob([inputBuffer], { type: 'image/jpeg' });
                const formData = new FormData();
                formData.append('image', blob, 'clothing.jpg');
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
                const response = await fetch(`${this.aiServiceUrl}/process`, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                if (!response.ok) {
                    throw new Error(`AI service returned ${response.status}: ${response.statusText}`);
                }
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const json = await response.json();
                    const processedUrl = json?.data?.processed_url;
                    if (!processedUrl) {
                        throw new Error('AI service JSON response missing data.processed_url');
                    }
                    const imageResponse = await fetch(`${this.aiServiceUrl}${processedUrl}`, { method: 'GET' });
                    if (!imageResponse.ok) {
                        throw new Error(`AI image fetch failed: ${imageResponse.status} ${imageResponse.statusText}`);
                    }
                    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
                    const classification = json?.data?.classification;
                    const attributes = json?.data?.attributes;
                    return {
                        imageBuffer,
                        classification: classification ?? undefined,
                        dominantColor: attributes?.dominant_color ?? undefined,
                        colorName: attributes?.color_name ?? undefined,
                        palette: attributes?.palette ?? undefined,
                    };
                }
                return { imageBuffer: Buffer.from(await response.arrayBuffer()) };
            }
            catch (error) {
                if (attempt === AI_MAX_RETRIES) {
                    throw error;
                }
                this.logger.warn(`AI service attempt ${attempt + 1} failed: ${error.message}`);
            }
        }
        throw new Error('AI service call exhausted all retries');
    }
    async fallbackRemoval(inputPath, outputPath) {
        this.logger.log('AI service unavailable, using fallback (copy original)...');
        try {
            fs.copyFileSync(inputPath, outputPath);
            this.logger.log('Fallback copy completed');
        }
        catch (error) {
            this.logger.error(`Fallback also failed: ${error.message}`);
        }
    }
};
exports.BackgroundRemovalService = BackgroundRemovalService;
exports.BackgroundRemovalService = BackgroundRemovalService = BackgroundRemovalService_1 = __decorate([
    (0, common_1.Injectable)()
], BackgroundRemovalService);
//# sourceMappingURL=background-removal.service.js.map