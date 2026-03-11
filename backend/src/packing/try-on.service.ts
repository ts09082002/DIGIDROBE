import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import { join, normalize } from 'path';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import Replicate from 'replicate';
import { WardrobeItem, WardrobeService } from '../wardrobe/wardrobe.service';
import {
  buildLookNote,
  categorize,
  PackingService,
  StyleProfileRequest,
} from './packing.service';

export interface TryOnPreviewRequest {
  bodyPhotoUrl: string;
  itemIds?: string[];
  profile?: StyleProfileRequest;
}

export interface TryOnPreviewResult {
  previewUrl: string;
  bodyPhotoUrl: string;
  outfitItems: WardrobeItem[];
  suggestedOutfit: WardrobeItem[];
  note: string;
  mode: 'idm-vton' | 'local-compose';
}

type NormalizedBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
};

type PixelRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

@Injectable()
export class TryOnService {
  private readonly logger = new Logger(TryOnService.name);
  private readonly uploadsRoot = join(__dirname, '..', '..', 'uploads');
  private readonly generatedDir = join(
    __dirname,
    '..',
    '..',
    'uploads',
    'tryon',
    'generated',
  );
  private replicate: Replicate | null = null;

  constructor(
    private readonly wardrobeService: WardrobeService,
    private readonly packingService: PackingService,
  ) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (token) {
      this.replicate = new Replicate({ auth: token });
      this.logger.log('Replicate client initialized for IDM-VTON');
    } else {
      this.logger.warn(
        'REPLICATE_API_TOKEN not set — IDM-VTON try-on will be unavailable',
      );
    }
  }

  async generatePreview(
    request: TryOnPreviewRequest,
  ): Promise<TryOnPreviewResult> {
    if (!request.bodyPhotoUrl) {
      throw new BadRequestException('bodyPhotoUrl is required');
    }

    const suggested = await this.packingService.getStylistSuggestion(
      request.profile,
    );
    const suggestedOutfit = suggested.suggestedOutfit.filter(
      (item) => item.status === 'done' && item.processedUrl,
    );

    const outfitItems =
      request.itemIds && request.itemIds.length > 0
        ? (
            await Promise.all(
              request.itemIds.map((id) => this.wardrobeService.getById(id)),
            )
          ).filter((item) => item.status === 'done' && item.processedUrl)
        : suggestedOutfit;

    if (outfitItems.length === 0) {
      throw new BadRequestException(
        'No ready outfit items were found for try-on preview',
      );
    }

    const bodyPhotoPath = this.resolveUploadPath(request.bodyPhotoUrl);
    if (!fs.existsSync(bodyPhotoPath)) {
      throw new NotFoundException(
        `Body photo not found for ${request.bodyPhotoUrl}`,
      );
    }

    fs.mkdirSync(this.generatedDir, { recursive: true });

    // Pick the best garment for IDM-VTON (prioritize topwear / dresses)
    const garment = this.pickPrimaryGarment(outfitItems);
    const garmentPath = this.resolveUploadPath(
      garment.processedUrl || garment.originalUrl,
    );

    if (!fs.existsSync(garmentPath)) {
      throw new NotFoundException(
        `Garment image not found for ${garment.originalFilename}`,
      );
    }

    // Try IDM-VTON via Replicate first, fall back to local compose
    let previewUrl: string;
    let mode: 'idm-vton' | 'local-compose' = 'idm-vton';

    try {
      previewUrl = await this.runIdmVton(bodyPhotoPath, garmentPath, garment);
      this.logger.log('IDM-VTON succeeded!');
    } catch (error: any) {
      this.logger.error(
        `IDM-VTON failed: ${error?.message || error}`,
        error?.stack,
      );
      mode = 'local-compose';
      // Fall back to the old overlay-based compose
      try {
        previewUrl = await this.localComposeFallback(
          bodyPhotoPath,
          outfitItems,
        );
      } catch (fallbackError: any) {
        this.logger.error(
          `Local compose fallback also failed: ${fallbackError?.message || fallbackError}`,
        );
        // Last resort: just return the body photo directly
        const filename = `${uuid()}_bodyphoto.png`;
        const outputPath = join(this.generatedDir, filename);
        fs.copyFileSync(bodyPhotoPath, outputPath);
        previewUrl = `/uploads/tryon/generated/${filename}`;
      }
    }

    return {
      previewUrl,
      bodyPhotoUrl: request.bodyPhotoUrl,
      outfitItems,
      suggestedOutfit,
      note: `${buildLookNote(request.profile)} | ${mode} preview`,
      mode,
    };
  }

  // ─── IDM-VTON via Replicate ────────────────────────────────────

  private async runIdmVton(
    bodyPhotoPath: string,
    garmentPath: string,
    garment: WardrobeItem,
  ): Promise<string> {
    if (!this.replicate) {
      throw new Error('Replicate client not initialized — REPLICATE_API_TOKEN missing');
    }

    // Read and convert images to JPEG base64 to keep payload small
    const bodyBuffer = fs.readFileSync(bodyPhotoPath);
    const garmentBuffer = fs.readFileSync(garmentPath);

    // Resize images to max 1024px to avoid massive payloads
    const bodyJpeg = await sharp(bodyBuffer)
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    const garmentJpeg = await sharp(garmentBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // Replace transparency with white
      .resize({ width: 768, height: 1024, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    const bodyBase64 = `data:image/jpeg;base64,${bodyJpeg.toString('base64')}`;
    const garmentBase64 = `data:image/jpeg;base64,${garmentJpeg.toString('base64')}`;

    // Determine category based on garment type
    const cat = categorize(garment.category);
    let vtonCategory = 'upper_body';
    if (cat === 'bottoms' || cat === 'dresses') {
      vtonCategory = 'lower_body';
    }
    if (cat === 'dresses') {
      vtonCategory = 'dresses';
    }

    this.logger.log(
      `Calling IDM-VTON on Replicate — category: ${vtonCategory}, garment: ${garment.originalFilename}`,
    );

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

    this.logger.log(
      `IDM-VTON raw output type: ${typeof output}, isArray: ${Array.isArray(output)}, value preview: ${String(output).substring(0, 200)}`,
    );

    // Extract the result URL from the output
    const resultUrl = this.extractResultUrl(output);

    // Download the result image and save it locally
    const filename = `${uuid()}_idmvton.png`;
    const outputPath = join(this.generatedDir, filename);

    if (resultUrl.startsWith('http')) {
      this.logger.log(`Downloading IDM-VTON result from: ${resultUrl.substring(0, 100)}...`);
      const response = await fetch(resultUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to download IDM-VTON result: ${response.status} ${response.statusText}`,
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
    } else if (resultUrl.startsWith('data:')) {
      const base64Data = resultUrl.split(',')[1];
      fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
    } else {
      throw new Error(`Unexpected IDM-VTON output format: ${resultUrl.substring(0, 100)}`);
    }

    this.logger.log(`IDM-VTON result saved to ${outputPath}`);
    return `/uploads/tryon/generated/${filename}`;
  }

  private extractResultUrl(output: unknown): string {
    // Case 1: Direct string URL
    if (typeof output === 'string' && output.length > 0) {
      return output;
    }

    // Case 2: Array of URLs (common Replicate pattern)
    if (Array.isArray(output) && output.length > 0) {
      const first = output[0];
      if (typeof first === 'string') return first;
      // FileOutput objects have a url() method or are URL-like
      if (first && typeof first === 'object') {
        if ('url' in first && typeof (first as any).url === 'function') {
          return (first as any).url();
        }
        if ('url' in first && typeof (first as any).url === 'string') {
          return (first as any).url;
        }
        if ('href' in first && typeof (first as any).href === 'string') {
          return (first as any).href;
        }
        // Try toString
        const str = String(first);
        if (str.startsWith('http') || str.startsWith('data:')) return str;
      }
    }

    // Case 3: Single object with url property
    if (output && typeof output === 'object' && !Array.isArray(output)) {
      const obj = output as any;
      if ('url' in obj && typeof obj.url === 'function') return obj.url();
      if ('url' in obj && typeof obj.url === 'string') return obj.url;
      if ('href' in obj && typeof obj.href === 'string') return obj.href;
      // FileOutput from Replicate SDK - try toString
      const str = String(obj);
      if (str.startsWith('http') || str.startsWith('data:')) return str;
    }

    // Case 4: ReadableStream — we can't easily handle this, throw
    throw new Error(
      `Could not extract URL from IDM-VTON output. Type: ${typeof output}, value: ${String(output).substring(0, 300)}`,
    );
  }

  // ─── Garment Selection ─────────────────────────────────────────

  private pickPrimaryGarment(outfitItems: WardrobeItem[]): WardrobeItem {
    const priority = ['tops', 'dresses', 'outerwear', 'bottoms'];
    for (const cat of priority) {
      const item = outfitItems.find(
        (i) => categorize(i.category) === cat,
      );
      if (item) return item;
    }
    return outfitItems[0];
  }

  // ─── Fallback: old overlay-based compose ───────────────────────

  private async localComposeFallback(
    bodyPhotoPath: string,
    outfitItems: WardrobeItem[],
  ): Promise<string> {
    const bodyBuffer = fs.readFileSync(bodyPhotoPath);
    const bodyMeta = await sharp(bodyBuffer).metadata();
    const width = bodyMeta.width ?? 0;
    const height = bodyMeta.height ?? 0;

    if (!width || !height) {
      throw new BadRequestException('Body image is invalid');
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

    // Suppress body regions first
    let working = await sharp(bodyBuffer).ensureAlpha().png().toBuffer();
    for (const region of this.getSuppressionRegions(normalizedBox, width, height)) {
      const clamped = this.clampRegion(region, width, height);
      if (clamped.width > 0 && clamped.height > 0) {
        working = await this.eraseAndNeutralizeRegion(working, clamped);
      }
    }

    // Build garment placements
    const placements = await this.buildGarmentPlacements(
      normalizedBox,
      width,
      height,
      outfitItems,
    );

    const previewBuffer = await sharp(working)
      .composite(placements)
      .png()
      .toBuffer();

    const filename = `${uuid()}_fallback.png`;
    const outputPath = join(this.generatedDir, filename);
    fs.writeFileSync(outputPath, previewBuffer);

    return `/uploads/tryon/generated/${filename}`;
  }

  /** Clamp a pixel region so it stays within the image bounds */
  private clampRegion(
    region: PixelRegion,
    imageWidth: number,
    imageHeight: number,
  ): PixelRegion {
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

  // ─── Body Detection ────────────────────────────────────────────

  private async extractBodyBox(
    imageBuffer: Buffer,
  ): Promise<NormalizedBox | undefined> {
    const image = sharp(imageBuffer).ensureAlpha();
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (!width || !height) return undefined;

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
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
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

  // ─── Overlay compose helpers ───────────────────────────────────

  private getSuppressionRegions(
    bodyBox: NormalizedBox,
    imageWidth: number,
    imageHeight: number,
  ): PixelRegion[] {
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

  private async eraseAndNeutralizeRegion(
    sourceBuffer: Buffer,
    region: PixelRegion,
  ): Promise<Buffer> {
    const safeRegion = {
      left: Math.max(0, region.left),
      top: Math.max(0, region.top),
      width: Math.max(1, region.width),
      height: Math.max(1, region.height),
    };

    const neutralizedRegion = await sharp(sourceBuffer)
      .extract(safeRegion)
      .blur(18)
      .modulate({ brightness: 1.06, saturation: 0.12 })
      .composite([
        {
          input: Buffer.from(
            `<svg width="${safeRegion.width}" height="${safeRegion.height}" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="fade" cx="50%" cy="45%" r="75%">
                  <stop offset="0%" stop-color="rgba(255,255,255,0.14)" />
                  <stop offset="100%" stop-color="rgba(255,255,255,0.02)" />
                </radialGradient>
              </defs>
              <ellipse cx="50%" cy="50%" rx="46%" ry="50%" fill="url(#fade)" />
            </svg>`,
          ),
          blend: 'screen',
        },
      ])
      .png()
      .toBuffer();

    return sharp(sourceBuffer)
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

  private async buildGarmentPlacements(
    bodyBox: NormalizedBox,
    imageWidth: number,
    imageHeight: number,
    outfitItems: WardrobeItem[],
  ): Promise<Array<{ input: Buffer; left: number; top: number }>> {
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

    const overlays: Array<{ input: Buffer; left: number; top: number }> = [];
    for (const entry of layout) {
      if (!entry.item) continue;
      const garmentBuffer = await this.prepareGarmentOverlay(
        entry.item,
        entry.region,
      );
      overlays.push({
        input: garmentBuffer,
        left: entry.region.left,
        top: entry.region.top,
      });
    }

    return overlays;
  }

  private async prepareGarmentOverlay(
    item: WardrobeItem,
    region: PixelRegion,
  ): Promise<Buffer> {
    const path = this.resolveUploadPath(item.processedUrl || item.originalUrl);
    const inputBuffer = fs.readFileSync(path);
    const category = categorize(item.category);
    const targetWidth = Math.max(1, region.width);
    const targetHeight = Math.max(1, region.height);
    const resizedWidth = Math.max(
      1,
      Math.round(
        targetWidth *
          (category === 'tops'
            ? 1.08
            : category === 'outerwear'
              ? 1.1
              : category === 'bottoms' || category === 'dresses'
                ? 1.04
                : category === 'footwear'
                  ? 1.12
                  : 1),
      ),
    );
    const resizedHeight = Math.max(
      1,
      Math.round(
        targetHeight *
          (category === 'bottoms' || category === 'dresses'
            ? 1.08
            : category === 'footwear'
              ? 0.96
              : 1),
      ),
    );

    const garment = await sharp(inputBuffer)
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

    const garmentMeta = await sharp(garment).metadata();
    const garmentWidth = garmentMeta.width ?? targetWidth;
    const garmentHeight = garmentMeta.height ?? targetHeight;
    const left = Math.max(0, Math.round((targetWidth - garmentWidth) / 2));
    const top = Math.max(0, Math.round((targetHeight - garmentHeight) / 2));

    return sharp({
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
          input: Buffer.from(
            `<svg width="${targetWidth}" height="${targetHeight}" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="rgba(255,255,255,0.03)" />
            </svg>`,
          ),
          blend: 'screen',
        },
      ])
      .png()
      .toBuffer();
  }

  private groupOutfitItems(outfitItems: WardrobeItem[]): {
    top?: WardrobeItem;
    bottom?: WardrobeItem;
    outerwear?: WardrobeItem;
    footwear?: WardrobeItem;
    accessories: WardrobeItem[];
  } {
    const top = outfitItems.find(
      (item) => categorize(item.category) === 'tops',
    );
    const bottom = outfitItems.find((item) =>
      ['bottoms', 'dresses'].includes(categorize(item.category)),
    );
    const outerwear = outfitItems.find(
      (item) => categorize(item.category) === 'outerwear',
    );
    const footwear = outfitItems.find(
      (item) => categorize(item.category) === 'footwear',
    );
    const accessories = outfitItems.filter(
      (item) => categorize(item.category) === 'accessories',
    );

    return { top, bottom, outerwear, footwear, accessories };
  }

  private toPixels(
    bodyBox: NormalizedBox,
    imageWidth: number,
    imageHeight: number,
  ): PixelRegion {
    return {
      left: Math.max(0, Math.round(bodyBox.left * imageWidth)),
      top: Math.max(0, Math.round(bodyBox.top * imageHeight)),
      width: Math.max(1, Math.round(bodyBox.width * imageWidth)),
      height: Math.max(1, Math.round(bodyBox.height * imageHeight)),
    };
  }

  // ─── Path helpers ──────────────────────────────────────────────

  private resolveUploadPath(urlOrPath: string): string {
    const raw = (urlOrPath || '').trim();
    if (!raw) {
      throw new BadRequestException('Missing upload path');
    }

    let pathname = raw;
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      pathname = new URL(raw).pathname;
    }

    const uploadPrefix = '/uploads/';
    const index = pathname.indexOf(uploadPrefix);
    if (index === -1) {
      throw new BadRequestException(`Unsupported upload path: ${urlOrPath}`);
    }

    const relativePath = pathname.slice(index + uploadPrefix.length);
    const resolved = normalize(join(this.uploadsRoot, relativePath));
    const normalizedRoot = normalize(this.uploadsRoot);
    if (!resolved.startsWith(normalizedRoot)) {
      throw new BadRequestException('Invalid upload path');
    }

    return resolved;
  }
}
