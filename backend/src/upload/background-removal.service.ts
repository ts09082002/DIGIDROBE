import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

const AI_TIMEOUT_MS = 10000; // 10s timeout per attempt
const AI_MAX_RETRIES = 0; // no retries by default

export interface AiProcessResult {
  /** Buffer of the processed (background-removed) PNG image */
  imageBuffer: Buffer;
  /** Classification info from the AI service */
  classification?: {
    category: string;
    sub_category: string;
    confidence: number;
    is_low_confidence: boolean;
  };
  /** Dominant color hex */
  dominantColor?: string;
  /** Human-readable color name */
  colorName?: string;
  /** Top-3 color palette [{hex, name}] */
  palette?: { hex: string; name: string }[];
}

@Injectable()
export class BackgroundRemovalService {
  private readonly logger = new Logger(BackgroundRemovalService.name);
  // Default to local AI service; can be overridden via AI_SERVICE_URL
  private readonly aiServiceUrl =
    process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

  async removeBackground(
    inputPath: string,
    outputPath: string,
  ): Promise<AiProcessResult> {
    this.logger.log(
      `Removing background from: ${inputPath} via AI service (u2netp)`,
    );

    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Send image to Python AI service with timeout + retry
      const aiResult = await this.callAIServiceWithRetry(inputPath);

      // Minimal post-process: trim transparent border, extend to square canvas
      // No resize, no recompression — mobile already did the heavy lifting
      const fitted = await sharp(aiResult.imageBuffer)
        .trim() // auto-trim fully transparent edges
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

      this.logger.log(
        `Background removed successfully. Output: ${outputPath} (${fitted.length} bytes)`,
      );

      return {
        imageBuffer: fitted,
        classification: aiResult.classification,
        dominantColor: aiResult.dominantColor,
        colorName: aiResult.colorName,
        palette: aiResult.palette,
      };
    } catch (error: any) {
      console.error('Background removal error:', error);
      this.logger.error(
        `AI service background removal failed: ${error.message}`,
      );
      // Fallback: copy original image so UX stays alive
      await this.fallbackRemoval(inputPath, outputPath);
      const fallbackBuffer = fs.readFileSync(outputPath);
      return { imageBuffer: fallbackBuffer };
    }
  }

  /**
   * Call AI service with timeout + 1 retry.
   * Returns the processed image buffer AND any AI metadata (classification, palette).
   */
  private async callAIServiceWithRetry(
    inputPath: string,
  ): Promise<AiProcessResult> {
    const inputBuffer = fs.readFileSync(inputPath);

    for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.warn(
            `Retrying AI service call (attempt ${attempt + 1})...`,
          );
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
          throw new Error(
            `AI service returned ${response.status}: ${response.statusText}`,
          );
        }

        const contentType = response.headers.get('content-type') || '';

        // FastAPI service returns JSON with processed_url + classification + attributes.
        if (contentType.includes('application/json')) {
          const json = await response.json();
          const processedUrl: string | undefined = json?.data?.processed_url;
          if (!processedUrl) {
            throw new Error(
              'AI service JSON response missing data.processed_url',
            );
          }

          const imageResponse = await fetch(
            `${this.aiServiceUrl}${processedUrl}`,
            { method: 'GET' },
          );

          if (!imageResponse.ok) {
            throw new Error(
              `AI image fetch failed: ${imageResponse.status} ${imageResponse.statusText}`,
            );
          }

          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

          // Extract metadata returned by the AI service
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

        // Fallback: assume the response body is already raw image bytes (no metadata)
        return { imageBuffer: Buffer.from(await response.arrayBuffer()) };
      } catch (error: any) {
        if (attempt === AI_MAX_RETRIES) {
          throw error; // final attempt failed, let outer catch handle fallback
        }
        this.logger.warn(
          `AI service attempt ${attempt + 1} failed: ${error.message}`,
        );
      }
    }

    throw new Error('AI service call exhausted all retries');
  }

  /**
   * Fallback: Copy original image when AI service is unavailable
   */
  private async fallbackRemoval(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    this.logger.log(
      'AI service unavailable, using fallback (copy original)...',
    );

    try {
      fs.copyFileSync(inputPath, outputPath);
      this.logger.log('Fallback copy completed');
    } catch (error: any) {
      this.logger.error(`Fallback also failed: ${error.message}`);
    }
  }
}
