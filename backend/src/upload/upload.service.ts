import { Injectable, Logger } from '@nestjs/common';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
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

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly wardrobeService: WardrobeService,
  ) { }

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

  private buildDefaultName(category: string): string {
    const pretty =
      category && category.length > 0
        ? category.charAt(0).toUpperCase() + category.slice(1)
        : 'Clothing';
    return `${pretty} item`;
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
}
