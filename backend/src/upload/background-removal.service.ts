import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
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

            // Load file into Blob
            const inputBuffer = fs.readFileSync(inputPath);
            const blob = new Blob([inputBuffer], { type: 'image/jpeg' });

            // Run AI background removal
            const resultBlob = await removeBackground(blob, {
                debug: false,
                output: { format: 'image/png' }
            });

            const arrayBuffer = await resultBlob.arrayBuffer();
            const resultBuffer = Buffer.from(arrayBuffer);

            // Save the PNG directly
            fs.writeFileSync(outputPath, resultBuffer);

            this.logger.log(`Background removed successfully. Output: ${outputPath} (${resultBuffer.length} bytes)`);
        } catch (error) {
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
