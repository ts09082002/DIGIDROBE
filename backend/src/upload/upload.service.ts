import { Injectable, Logger } from '@nestjs/common';
import {
  BackgroundRemovalService,
  AiProcessResult,
} from './background-removal.service';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import sharp from 'sharp';
import { WardrobeService, WardrobeItem } from '../wardrobe/wardrobe.service';

export interface ProcessedImage {
  id: string;
  originalFilename: string;
  originalUrl: string;
  processedUrl: string;
  category: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface BodyPhotoResult {
  id: string;
  originalFilename: string;
  originalUrl: string;
  processedUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
  status: 'processing' | 'done' | 'failed';
  bodyBox?: {
    left: number;
    top: number;
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
  };
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly bgRemovalService: BackgroundRemovalService,
    private readonly wardrobeService: WardrobeService,
  ) { }

  /**
   * Save original image, create wardrobe item immediately, then kick off
   * background removal asynchronously to update the item when ready.
   */
  async processClothingImage(
    file: any,
    preferredCategory?: string,
    preferredSubCategory?: string,
    preferredMlLabels?: string[],
  ): Promise<WardrobeItem> {
    const id = uuidv4();
    this.logger.log(
      `Received clothing image: ${file.originalname} (${file.size} bytes)`,
    );

    // Compute original URL served via /uploads/originals
    const originalsDir = join(__dirname, '..', '..', 'uploads', 'originals');
    if (!fs.existsSync(originalsDir)) {
      fs.mkdirSync(originalsDir, { recursive: true });
    }

    const originalFilenameOnDisk =
      file.filename || `${id}${extname(file.originalname)}`;
    const originalPath = join(originalsDir, originalFilenameOnDisk);

    // Multer already stored the file at file.path (originals dir). Ensure it's in place.
    if (!fs.existsSync(originalPath) && file.path && fs.existsSync(file.path)) {
      fs.copyFileSync(file.path, originalPath);
    }

    const category =
      this.normalizePreferredCategory(preferredCategory) ||
      this.classifyClothing(file.originalname);
    const mimeType = file.mimetype;
    const size = fs.existsSync(originalPath)
      ? fs.statSync(originalPath).size
      : file.size;
    const createdAt = new Date().toISOString();

    // Create wardrobe item immediately with original image and pending status.
    // Include ML Kit labels/subCategory right away so they are stored even if bg processing fails.
    const wardrobeItem = await this.wardrobeService.create({
      id,
      originalFilename: file.originalname,
      originalUrl: `/uploads/originals/${originalFilenameOnDisk}`,
      processedUrl: '',
      category,
      name: this.buildDefaultName(category),
      brand: '',
      isFavorite: false,
      mimeType,
      size,
      createdAt,
      status: 'processing',
      subCategory: preferredSubCategory,
      mlLabels: preferredMlLabels,
    });

    // Kick off background removal asynchronously; do not block response
    this.startBackgroundProcessing(
      file,
      wardrobeItem.id,
      preferredCategory,
      preferredMlLabels,
    ).catch((err) => {
      this.logger.error(
        `Background processing failed for ${wardrobeItem.id}: ${err.message}`,
      );
    });

    return wardrobeItem;
  }

  async processBodyPhoto(file: any): Promise<BodyPhotoResult> {
    const id = uuidv4();
    this.logger.log(
      `Received body photo: ${file.originalname} (${file.size} bytes)`,
    );

    const originalsDir = join(
      __dirname,
      '..',
      '..',
      'uploads',
      'body',
      'originals',
    );
    const processedDir = join(
      __dirname,
      '..',
      '..',
      'uploads',
      'body',
      'processed',
    );
    fs.mkdirSync(originalsDir, { recursive: true });
    fs.mkdirSync(processedDir, { recursive: true });

    const originalFilenameOnDisk =
      file.filename || `${id}${extname(file.originalname)}`;
    const originalPath = join(originalsDir, originalFilenameOnDisk);
    if (!fs.existsSync(originalPath) && file.path && fs.existsSync(file.path)) {
      fs.copyFileSync(file.path, originalPath);
    }

    const processedFilename = `${id}_body.png`;
    const processedPath = join(processedDir, processedFilename);
    const createdAt = new Date().toISOString();

    try {
      await this.bgRemovalService.removeBackground(originalPath, processedPath);
      const bodyBox = await this.extractBodyBox(processedPath);
      return {
        id,
        originalFilename: file.originalname,
        originalUrl: `/uploads/body/originals/${originalFilenameOnDisk}`,
        processedUrl: `/uploads/body/processed/${processedFilename}`,
        mimeType: file.mimetype,
        size: fs.statSync(originalPath).size,
        createdAt,
        status: 'done',
        bodyBox,
      };
    } catch (error: any) {
      this.logger.error(`Body photo processing failed: ${error.message}`);
      return {
        id,
        originalFilename: file.originalname,
        originalUrl: `/uploads/body/originals/${originalFilenameOnDisk}`,
        processedUrl: '',
        mimeType: file.mimetype,
        size: fs.statSync(originalPath).size,
        createdAt,
        status: 'failed',
      };
    }
  }

  private async extractBodyBox(
    imagePath: string,
  ): Promise<BodyPhotoResult['bodyBox']> {
    const image = sharp(imagePath).ensureAlpha();
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (!width || !height) {
      return undefined;
    }

    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
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
        top: 0.05,
        width: 0.6,
        height: 0.9,
        imageWidth: width,
        imageHeight: height,
      };
    }

    const paddingX = Math.round((maxX - minX) * 0.05);
    const paddingY = Math.round((maxY - minY) * 0.04);

    minX = Math.max(0, minX - paddingX);
    minY = Math.max(0, minY - paddingY);
    maxX = Math.min(width, maxX + paddingX);
    maxY = Math.min(height, maxY + paddingY);

    return {
      left: minX / width,
      top: minY / height,
      width: (maxX - minX) / width,
      height: (maxY - minY) / height,
      imageWidth: width,
      imageHeight: height,
    };
  }

  private buildDefaultName(category: string): string {
    const pretty =
      category && category.length > 0
        ? category.charAt(0).toUpperCase() + category.slice(1)
        : 'Clothing';
    return `${pretty} item`;
  }

  private classifyClothing(filename: string): string {
    const name = filename.toLowerCase();

    const categories: Record<string, string[]> = {
      tops: [
        'shirt',
        'tshirt',
        't-shirt',
        'blouse',
        'top',
        'polo',
        'tank',
        'sweater',
        'hoodie',
        'pullover',
        'cami',
        'vest',
      ],
      bottoms: [
        'pants',
        'jeans',
        'shorts',
        'skirt',
        'trousers',
        'leggings',
        'chinos',
        'joggers',
        'lower',
        'lowers',
        'sweatpants',
        'trackpants',
      ],
      outerwear: [
        'jacket',
        'coat',
        'blazer',
        'cardigan',
        'windbreaker',
        'parka',
        'trench',
        'bomber',
      ],
      shoes: [
        'shoes',
        'sneakers',
        'boots',
        'sandals',
        'heels',
        'loafers',
        'flats',
        'slippers',
      ],
      accessories: [
        'hat',
        'cap',
        'scarf',
        'belt',
        'tie',
        'watch',
        'bag',
        'purse',
        'glasses',
        'sunglasses',
        'jewelry',
        'necklace',
        'bracelet',
        'ring',
        'earring',
      ],
      dresses: ['dress', 'gown', 'romper', 'jumpsuit'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((kw) => name.includes(kw))) {
        return category;
      }
    }

    return 'unclassified'; // Default category
  }

  private normalizePreferredCategory(category?: string): string | undefined {
    if (!category) return undefined;
    const c = category.toLowerCase().trim();

    // Mapping for common variations (singular/plural mismatch)
    const MAPPING: Record<string, string> = {
      shoes: 'footwear',
      shoe: 'footwear',
      top: 'tops',
      bottom: 'bottoms',
      bag: 'bags',
      handbag: 'bags',
      accessory: 'accessories',
      dress: 'dresses',
    };

    const finalCategory = MAPPING[c] || c;

    const allowed = new Set([
      'tops',
      'bottoms',
      'outerwear',
      'footwear',
      'bags',
      'accessories',
      'dresses',
      'unclassified',
    ]);
    return allowed.has(finalCategory) ? finalCategory : undefined;
  }

  private async storeMetadata(data: ProcessedImage): Promise<void> {
    const metaDir = join(__dirname, '..', '..', 'uploads', 'metadata');
    if (!fs.existsSync(metaDir)) {
      fs.mkdirSync(metaDir, { recursive: true });
    }

    // Append to items JSON file (simple flat-file storage for now)
    const itemsFile = join(metaDir, 'items.json');
    let items: ProcessedImage[] = [];

    if (fs.existsSync(itemsFile)) {
      const raw = fs.readFileSync(itemsFile, 'utf-8');
      items = JSON.parse(raw);
    }

    items.push(data);
    fs.writeFileSync(itemsFile, JSON.stringify(items, null, 2));
  }

  /**
   * Store a clothing image that was already processed on-device.
   * No AI service call needed — mobile already did bg removal + color extraction.
   */
  async storeProcessedClothingImage(
    processedFile: any,
    originalFile: any | undefined,
    preferredCategory?: string,
    preferredSubCategory?: string,
    mlLabels?: string[],
    colorPaletteJson?: string,
  ): Promise<WardrobeItem> {
    const id = uuidv4();
    this.logger.log(
      `Storing on-device processed image: ${processedFile.originalname} (${processedFile.size} bytes)`,
    );

    // Store original if provided
    let originalUrl = '';
    if (originalFile) {
      const originalsDir = join(__dirname, '..', '..', 'uploads', 'originals');
      if (!fs.existsSync(originalsDir)) {
        fs.mkdirSync(originalsDir, { recursive: true });
      }
      const originalFilename = originalFile.filename || `${id}_orig${extname(originalFile.originalname)}`;
      const originalPath = join(originalsDir, originalFilename);
      if (!fs.existsSync(originalPath) && originalFile.path && fs.existsSync(originalFile.path)) {
        fs.copyFileSync(originalFile.path, originalPath);
      }
      originalUrl = `/uploads/originals/${originalFilename}`;
    }

    // Store processed image (already background-removed)
    const processedDir = join(__dirname, '..', '..', 'uploads', 'processed');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }
    const processedFilename = `${id}_clean.png`;
    const processedPath = join(processedDir, processedFilename);
    fs.copyFileSync(processedFile.path, processedPath);

    const category =
      this.normalizePreferredCategory(preferredCategory) || 'unclassified';
    const size = fs.statSync(processedPath).size;

    const wardrobeItem = await this.wardrobeService.create({
      id,
      originalFilename: originalFile?.originalname || processedFile.originalname,
      originalUrl,
      processedUrl: `/uploads/processed/${processedFilename}`,
      category,
      subCategory: preferredSubCategory,
      name: this.buildDefaultName(category),
      brand: '',
      isFavorite: false,
      mlLabels,
      colorPalette: colorPaletteJson,
      mimeType: 'image/png',
      size,
      createdAt: new Date().toISOString(),
      status: 'done', // Already fully processed on-device
    });

    this.logger.log(
      `On-device processed item stored: ${wardrobeItem.id} (category: ${category})`,
    );

    // Clean up temp files
    try {
      if (processedFile.path && fs.existsSync(processedFile.path)) {
        fs.unlinkSync(processedFile.path);
      }
      if (originalFile?.path && fs.existsSync(originalFile.path)) {
        fs.unlinkSync(originalFile.path);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to clean up temp files: ${err.message}`);
    }

    return wardrobeItem;
  }

  /**
   * Perform background removal and update the existing wardrobe item.
   */
  private async startBackgroundProcessing(
    file: any,
    wardrobeItemId: string,
    preferredCategory?: string,
    mobileMlLabels?: string[],
  ): Promise<void> {
    try {
      const processedDir = join(__dirname, '..', '..', 'uploads', 'processed');
      if (!fs.existsSync(processedDir)) {
        fs.mkdirSync(processedDir, { recursive: true });
      }

      const processedFilename = `${wardrobeItemId}_clean.png`;
      const processedPath = join(processedDir, processedFilename);

      const aiResult: AiProcessResult =
        await this.bgRemovalService.removeBackground(file.path, processedPath);

      // Clean up original disk file used for processing (not the one served via /uploads/originals)
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (err: any) {
        this.logger.warn(
          `Failed to delete temp original image ${file.path}: ${err.message}`,
        );
      }

      const processedStat = fs.statSync(processedPath);

      // Persist processed image URL and any AI-generated metadata
      const updatePayload: Partial<WardrobeItem> = {
        processedUrl: `/uploads/processed/${processedFilename}`,
        size: processedStat.size,
        mimeType: file.mimetype,
        status: 'done',
      };

      if (aiResult.classification) {
        updatePayload.isLowConfidence =
          aiResult.classification.is_low_confidence;
        // Map AI categories to frontend categories
        const aiCategory = aiResult.classification.category;
        const categoryMap: Record<string, string> = {
          topwear: 'tops',
          bottomwear: 'bottoms',
          outerwear: 'outerwear',
          footwear: 'shoes',
          accessories: 'accessories',
          dresses: 'dresses',
        };

        const hasUserPreferredCategory =
          !!this.normalizePreferredCategory(preferredCategory);
        if (
          !hasUserPreferredCategory &&
          aiCategory &&
          aiCategory !== 'unclassified' &&
          categoryMap[aiCategory]
        ) {
          updatePayload.category = categoryMap[aiCategory];
          updatePayload.name = this.buildDefaultName(updatePayload.category);
        }

        // Store sub-category from Vision API (e.g. 'jeans', 't_shirt', 'sneakers')
        if (aiResult.classification.sub_category) {
          updatePayload.subCategory = aiResult.classification.sub_category;
        }
      }

      // Store raw ML labels — prefer server-side AI, fall back to mobile ML Kit labels
      const finalMlLabels =
        aiResult.mlLabels && aiResult.mlLabels.length > 0
          ? aiResult.mlLabels
          : mobileMlLabels;
      if (finalMlLabels && finalMlLabels.length > 0) {
        updatePayload.mlLabels = finalMlLabels;
      }

      if (aiResult.palette && aiResult.palette.length > 0) {
        updatePayload.colorPalette = JSON.stringify(aiResult.palette);
      }

      await this.wardrobeService.update(wardrobeItemId, updatePayload);

      this.logger.log(
        `Background processing completed for wardrobe item ${wardrobeItemId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Background processing error for ${wardrobeItemId}: ${error.message}`,
      );
      // Mark item as failed but keep original image
      await this.wardrobeService.update(wardrobeItemId, {
        status: 'failed',
      });
    }
  }
}
