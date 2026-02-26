import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

@Injectable()
export class BackgroundRemovalService {
    private readonly logger = new Logger(BackgroundRemovalService.name);
    private readonly aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

    async removeBackground(inputPath: string, outputPath: string): Promise<void> {
        this.logger.log(`Removing background from: ${inputPath} using AI`);

        try {
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const resultBuffer = await this.removeBackgroundWithAiService(inputPath);
            const resultMeta = await sharp(resultBuffer).metadata();

            // Guard against accidental non-alpha outputs.
            if (!resultMeta.hasAlpha) {
                throw new Error('Background removal result has no alpha channel');
            }

            // Step 1: trim away fully transparent border so we get a tight bbox
            const trimmed = sharp(resultBuffer);
            const meta = await trimmed.metadata();

            // Step 2: place the trimmed garment on a square canvas so all
            // wardrobe thumbnails look consistent and centered.
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
                    // keep transparent so the card background from the app shows through
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .png()
                .toBuffer();

            fs.writeFileSync(outputPath, fitted);

            this.logger.log(
                `Background removed successfully. Output: ${outputPath} (${fitted.length} bytes, original ${meta.width}x${meta.height})`,
            );
        } catch (error: any) {
            this.logger.error(`AI Background removal failed: ${error?.message ?? error}`);
            // Do not silently copy the original image; propagate failure so client can retry.
            throw error;
        }
    }

    private async removeBackgroundWithAiService(inputPath: string): Promise<Buffer> {
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

        const payload = (await processRes.json()) as any;
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

    private getMimeTypeFromPath(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.png') return 'image/png';
        if (ext === '.webp') return 'image/webp';
        if (ext === '.heic') return 'image/heic';
        if (ext === '.heif') return 'image/heif';
        return 'image/jpeg';
    }
}
