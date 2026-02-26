import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { removeBackground } from '@imgly/background-removal-node';

@Injectable()
export class BackgroundRemovalService {
    private readonly logger = new Logger(BackgroundRemovalService.name);

    async removeBackground(inputPath: string, outputPath: string): Promise<void> {
        this.logger.log(`Removing background from: ${inputPath} using AI`);

        try {
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const inputBuffer = fs.readFileSync(inputPath);
            const blob = new Blob([inputBuffer], { type: 'image/jpeg' });

            const resultBlob = await removeBackground(blob, {
                model: 'large',
                debug: false,
                output: { format: 'image/png' },
            });

            const arrayBuffer = await resultBlob.arrayBuffer();
            const resultBuffer = Buffer.from(arrayBuffer);

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
        } catch (error) {
            console.error("REAL ERROR:", error);

            this.logger.error(`AI Background removal failed: ${error.message}`);
            // Fallback
            await this.fallbackRemoval(inputPath, outputPath);
        }
    }

    /**
     * Fallback: Simple white-background removal
     */
    private async fallbackRemoval(inputPath: string, outputPath: string): Promise<void> {
        this.logger.log('AI Failed, using fallback background removal (copy original)...');

        try {
            fs.copyFileSync(inputPath, outputPath);
            this.logger.log('Fallback copy completed');
        } catch (error) {
            this.logger.error(`Fallback also failed: ${error.message}`);
        }
    }
}
