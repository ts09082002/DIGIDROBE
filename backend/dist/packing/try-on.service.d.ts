import { WardrobeItem, WardrobeService } from '../wardrobe/wardrobe.service';
import { PackingService, StyleProfileRequest } from './packing.service';
type NormalizedBox = {
    left: number;
    top: number;
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
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
export declare class TryOnService {
    private readonly wardrobeService;
    private readonly packingService;
    private readonly logger;
    private readonly uploadsRoot;
    private readonly generatedDir;
    constructor(wardrobeService: WardrobeService, packingService: PackingService);
    generatePreview(request: TryOnPreviewRequest): Promise<TryOnPreviewResult>;
    private resolveUploadPath;
    private extractBodyBox;
    private composePreview;
    private getSuppressionRegions;
    private blurAndSoftenRegion;
    private eraseAndNeutralizeRegion;
    private buildGarmentPlacements;
    private prepareGarmentOverlay;
    private groupOutfitItems;
    private toPixels;
}
export {};
