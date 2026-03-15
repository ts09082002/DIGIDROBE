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
import { inferBodyPoseFromAlphaPng, type BodyPose } from '../utils/pose';
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
  pose?: BodyPose;
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
    userId: string,
    request: TryOnPreviewRequest,
  ): Promise<TryOnPreviewResult> {
    if (!request.bodyPhotoUrl) {
      throw new BadRequestException('bodyPhotoUrl is required');
    }

    const suggested = await this.packingService.getStylistSuggestion(
      userId,
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
    let pose: BodyPose | undefined;
    try {
      pose = await inferBodyPoseFromAlphaPng(bodyBuffer, bodyBox);
    } catch (e: any) {
      this.logger.warn(`Pose inference failed: ${e?.message || e}`);
    }
    const previewBuffer = await this.composePreview(
      bodyBuffer,
      bodyBox,
      pose,
      outfitItems,
    );

    const filename = `${uuid()}_preview.png`;
    const outputPath = join(this.generatedDir, filename);
    fs.writeFileSync(outputPath, previewBuffer);

    return {
      previewUrl: `/uploads/tryon/generated/${filename}`,
      bodyPhotoUrl: request.bodyPhotoUrl,
      outfitItems,
      suggestedOutfit,
      bodyBox,
      pose,
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

  private async extractBodyBox(
    imageBuffer: Buffer,
  ): Promise<NormalizedBox | undefined> {
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
    pose: BodyPose | undefined,
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
    for (const region of this.getSuppressionRegions(
      normalizedBox,
      width,
      height,
    )) {
      working = await this.eraseAndNeutralizeRegion(working, region);
    }

    const placements = await this.buildGarmentPlacements(
      normalizedBox,
      pose,
      width,
      height,
      outfitItems,
    );

    return sharp(working).composite(placements).png().toBuffer();
  }

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
    pose: BodyPose | undefined,
    imageWidth: number,
    imageHeight: number,
    outfitItems: WardrobeItem[],
  ): Promise<Array<{ input: Buffer; left: number; top: number }>> {
    const grouped = this.groupOutfitItems(outfitItems);
    const box = this.toPixels(bodyBox, imageWidth, imageHeight);
    const layout = this.buildPoseAwareLayout(
      box,
      pose,
      imageWidth,
      imageHeight,
      grouped,
    );

    const overlays: Array<{ input: Buffer; left: number; top: number }> = [];
    for (const entry of layout) {
      if (!entry.item) {
        continue;
      }

      let garmentBuffer = await this.prepareGarmentOverlay(
        entry.item,
        entry.region,
      );
      const rotateDeg = entry.rotateDeg ?? 0;
      if (Math.abs(rotateDeg) > 0.2) {
        garmentBuffer = await sharp(garmentBuffer)
          .rotate(rotateDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
      }

      const meta = await sharp(garmentBuffer).metadata();
      const gw = meta.width ?? entry.region.width;
      const gh = meta.height ?? entry.region.height;
      let left = Math.round(entry.centerX - gw / 2);
      let top = Math.round(entry.centerY - gh / 2);
      ({
        buffer: garmentBuffer,
        left,
        top,
      } = await this.cropOverlayToBounds(
        garmentBuffer,
        left,
        top,
        imageWidth,
        imageHeight,
      ));

      overlays.push({
        input: garmentBuffer,
        left,
        top,
      });
    }

    return overlays;
  }

  private buildPoseAwareLayout(
    box: PixelRegion,
    pose: BodyPose | undefined,
    imageWidth: number,
    imageHeight: number,
    grouped: {
      top?: WardrobeItem;
      bottom?: WardrobeItem;
      outerwear?: WardrobeItem;
      footwear?: WardrobeItem;
      accessories: WardrobeItem[];
    },
  ): Array<{
    item?: WardrobeItem;
    region: PixelRegion;
    centerX: number;
    centerY: number;
    rotateDeg: number;
  }> {
    // Convert pose (normalized) -> pixels. If pose is missing, fall back to box-based anchors.
    const px = (p: { x: number; y: number }) => ({
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

    const makeRegionFromCenter = (
      cx: number,
      cy: number,
      w: number,
      h: number,
    ) => {
      const width = Math.max(1, Math.round(w));
      const height = Math.max(1, Math.round(h));
      return {
        left: Math.round(cx - width / 2),
        top: Math.round(cy - height / 2),
        width,
        height,
      };
    };

    // MVP sizing heuristics (kept intentionally simple).
    const topCenter = { x: shoulderMid.x, y: shoulderMid.y + torsoH * 0.56 };
    const bottomCenter = { x: hipMid.x, y: hipMid.y + legH * 0.54 };
    const outerCenter = { x: shoulderMid.x, y: shoulderMid.y + torsoH * 0.58 };
    const shoeCenter = { x: ankleMid.x, y: ankleMid.y + legH * 0.03 };

    const topRegion = makeRegionFromCenter(
      topCenter.x,
      topCenter.y,
      shoulderW * 1.55,
      torsoH * 1.45,
    );
    const outerRegion = makeRegionFromCenter(
      outerCenter.x,
      outerCenter.y,
      shoulderW * 1.75,
      torsoH * 1.65,
    );
    const bottomRegion = makeRegionFromCenter(
      bottomCenter.x,
      bottomCenter.y,
      hipW * 1.35,
      legH * 1.12,
    );
    const footwearRegion = makeRegionFromCenter(
      shoeCenter.x,
      shoeCenter.y,
      Math.max(shoulderW * 0.7, hipW * 0.7),
      Math.max(legH * 0.2, 44),
    );

    const accSize = Math.max(28, Math.round(shoulderW * 0.35));
    const accY = shoulderMid.y + torsoH * 0.12;
    const leftAccRegion = makeRegionFromCenter(
      leftShoulder.x - shoulderW * 0.25,
      accY,
      accSize,
      accSize,
    );
    const rightAccRegion = makeRegionFromCenter(
      rightShoulder.x + shoulderW * 0.25,
      accY,
      accSize,
      accSize,
    );

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

  private async cropOverlayToBounds(
    buffer: Buffer,
    left: number,
    top: number,
    imageWidth: number,
    imageHeight: number,
  ): Promise<{ buffer: Buffer; left: number; top: number }> {
    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (!w || !h) {
      return { buffer, left: Math.max(0, left), top: Math.max(0, top) };
    }

    const right = left + w;
    const bottom = top + h;

    const needCrop =
      left < 0 || top < 0 || right > imageWidth || bottom > imageHeight;
    if (!needCrop) {
      return { buffer, left, top };
    }

    const cropLeft = Math.max(0, -left);
    const cropTop = Math.max(0, -top);
    const cropWidth = Math.max(
      1,
      Math.min(w - cropLeft, imageWidth - Math.max(0, left)),
    );
    const cropHeight = Math.max(
      1,
      Math.min(h - cropTop, imageHeight - Math.max(0, top)),
    );

    const cropped = await sharp(buffer)
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
