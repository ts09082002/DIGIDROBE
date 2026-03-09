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
import { WardrobeItem, WardrobeService } from '../wardrobe/wardrobe.service';
import {
  buildLookNote,
  categorize,
  PackingService,
  StyleProfileRequest,
} from './packing.service';

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
  bodyBox?: NormalizedBox;
  note: string;
  mode: 'local-compose';
}

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

  constructor(
    private readonly wardrobeService: WardrobeService,
    private readonly packingService: PackingService,
  ) {}

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

    const bodyBuffer = fs.readFileSync(bodyPhotoPath);
    const bodyBox = await this.extractBodyBox(bodyBuffer);
    const previewBuffer = await this.composePreview(bodyBuffer, bodyBox, outfitItems);

    const filename = `${uuid()}_preview.png`;
    const outputPath = join(this.generatedDir, filename);
    fs.writeFileSync(outputPath, previewBuffer);

    return {
      previewUrl: `/uploads/tryon/generated/${filename}`,
      bodyPhotoUrl: request.bodyPhotoUrl,
      outfitItems,
      suggestedOutfit,
      bodyBox,
      note: `${buildLookNote(request.profile)} | server-composed preview`,
      mode: 'local-compose',
    };
  }

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

  private async extractBodyBox(imageBuffer: Buffer): Promise<NormalizedBox | undefined> {
    const image = sharp(imageBuffer).ensureAlpha();
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

  private async composePreview(
    bodyBuffer: Buffer,
    bodyBox: NormalizedBox | undefined,
    outfitItems: WardrobeItem[],
  ): Promise<Buffer> {
    const bodyMeta = await sharp(bodyBuffer).metadata();
    const width = bodyMeta.width ?? 0;
    const height = bodyMeta.height ?? 0;

    if (!width || !height) {
      throw new BadRequestException('Body image is invalid');
    }

    const normalizedBox = bodyBox ?? {
      left: 0.2,
      top: 0.06,
      width: 0.6,
      height: 0.88,
      imageWidth: width,
      imageHeight: height,
    };

    let working = await sharp(bodyBuffer).ensureAlpha().png().toBuffer();
    for (const region of this.getSuppressionRegions(normalizedBox, width, height)) {
      working = await this.eraseAndNeutralizeRegion(working, region);
    }

    const placements = await this.buildGarmentPlacements(
      normalizedBox,
      width,
      height,
      outfitItems,
    );

    return sharp(working)
      .composite(placements)
      .png()
      .toBuffer();
  }

  private getSuppressionRegions(
    bodyBox: NormalizedBox,
    imageWidth: number,
    imageHeight: number,
  ): PixelRegion[] {
    const box = this.toPixels(bodyBox, imageWidth, imageHeight);
    return [
      {
        left: Math.round(box.left + box.width * 0.10),
        top: Math.round(box.top + box.height * 0.09),
        width: Math.round(box.width * 0.80),
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

  private async blurAndSoftenRegion(
    sourceBuffer: Buffer,
    region: PixelRegion,
  ): Promise<Buffer> {
    return this.eraseAndNeutralizeRegion(sourceBuffer, region);
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
        region: {
          left: Math.round(box.left + box.width * 0.14),
          top: Math.round(box.top + box.height * 0.32),
          width: Math.round(box.width * 0.72),
          height: Math.round(box.height * 0.54),
        },
      },
      {
        item: grouped.top,
        region: {
          left: Math.round(box.left + box.width * 0.04),
          top: Math.round(box.top + box.height * 0.06),
          width: Math.round(box.width * 0.92),
          height: Math.round(box.height * 0.38),
        },
      },
      {
        item: grouped.outerwear,
        region: {
          left: Math.round(box.left + box.width * 0.02),
          top: Math.round(box.top + box.height * 0.04),
          width: Math.round(box.width * 0.96),
          height: Math.round(box.height * 0.46),
        },
      },
      {
        item: grouped.footwear,
        region: {
          left: Math.round(box.left + box.width * 0.18),
          top: Math.round(box.top + box.height * 0.84),
          width: Math.round(box.width * 0.64),
          height: Math.round(box.height * 0.13),
        },
      },
      {
        item: grouped.accessories[0],
        region: {
          left: Math.round(box.left + box.width * 0.06),
          top: Math.round(box.top + box.height * 0.22),
          width: Math.round(box.width * 0.20),
          height: Math.round(box.height * 0.16),
        },
      },
      {
        item: grouped.accessories[1],
        region: {
          left: Math.round(box.left + box.width * 0.74),
          top: Math.round(box.top + box.height * 0.22),
          width: Math.round(box.width * 0.20),
          height: Math.round(box.height * 0.16),
        },
      },
    ].filter((entry) => Boolean(entry.item));

    const overlays: Array<{ input: Buffer; left: number; top: number }> = [];
    for (const entry of layout) {
      if (!entry.item) {
        continue;
      }

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
        {
          input: garment,
          left,
          top,
        },
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

}
