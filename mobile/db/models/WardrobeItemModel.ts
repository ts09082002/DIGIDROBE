/**
 * WatermelonDB model for wardrobe items.
 *
 * Provides a `toApiShape()` method that returns the same WardrobeItem
 * interface used by the rest of the app (api.ts), so existing UI code
 * and the recommendation engine work without changes.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, json, date, readonly } from '@nozbe/watermelondb/decorators';
import type { WardrobeItem } from '../../services/api';

const sanitizeStringArray = (raw: any): string[] => {
    if (Array.isArray(raw)) return raw;
    return [];
};

export class WardrobeItemModel extends Model {
    static table = 'wardrobe_items';

    @text('original_image_path') declare originalImagePath: string;
    @text('processed_image_path') declare processedImagePath: string;
    @text('thumbnail_path') declare thumbnailPath: string;
    @text('category') declare category: string;
    @text('sub_category') declare subCategory: string;
    @text('name') declare name: string;
    @text('brand') declare brand: string;
    @text('color') declare color: string;
    @text('season_json') declare seasonJson: string;
    @text('occasion_json') declare occasionJson: string;
    @field('is_favorite') declare isFavorite: boolean;
    @text('mime_type') declare mimeType: string;
    @field('file_size') declare fileSize: number;
    @text('status') declare status: string;
    @field('is_low_confidence') declare isLowConfidence: boolean;
    @text('color_palette_json') declare colorPaletteJson: string;
    @text('ml_labels_json') declare mlLabelsJson: string;
    @readonly @date('created_at') declare createdAt: Date;
    @readonly @date('updated_at') declare updatedAt: Date;

    /** Parsed season array */
    get season(): string[] {
        try { return JSON.parse(this.seasonJson || '[]'); } catch { return []; }
    }

    /** Parsed occasion array */
    get occasion(): string[] {
        try { return JSON.parse(this.occasionJson || '[]'); } catch { return []; }
    }

    /** Parsed color palette */
    get colorPalette(): Array<{ hex: string; name: string }> | undefined {
        if (!this.colorPaletteJson) return undefined;
        try { return JSON.parse(this.colorPaletteJson); } catch { return undefined; }
    }

    /** Parsed ML labels */
    get mlLabels(): string[] | undefined {
        if (!this.mlLabelsJson) return undefined;
        try { return JSON.parse(this.mlLabelsJson); } catch { return undefined; }
    }

    /**
     * Convert to the same WardrobeItem shape used by api.ts.
     * This allows existing UI code and the recommendation engine
     * to work without any interface changes.
     */
    toApiShape(): WardrobeItem {
        return {
            id: this.id,
            originalFilename: this.name,
            originalUrl: this.originalImagePath,
            processedUrl: this.processedImagePath,
            category: this.category,
            subCategory: this.subCategory || undefined,
            name: this.name,
            brand: this.brand || '',
            color: this.color,
            season: this.season,
            occasion: this.occasion,
            isFavorite: this.isFavorite,
            mimeType: this.mimeType,
            size: this.fileSize,
            createdAt: this.createdAt?.toISOString() ?? new Date().toISOString(),
            updatedAt: this.updatedAt?.toISOString() ?? new Date().toISOString(),
            status: this.status,
            isLowConfidence: this.isLowConfidence || undefined,
            colorPalette: this.colorPaletteJson || undefined,
            mlLabels: this.mlLabels,
        };
    }
}
