import { WardrobeItem, WardrobeService } from '../wardrobe/wardrobe.service';
import { PackingService, StyleProfileRequest } from './packing.service';
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
export declare class TryOnService {
    private readonly wardrobeService;
    private readonly packingService;
    private readonly logger;
    private readonly uploadsRoot;
    private readonly generatedDir;
    private replicate;
    constructor(wardrobeService: WardrobeService, packingService: PackingService);
    generatePreview(request: TryOnPreviewRequest): Promise<TryOnPreviewResult>;
    private runIdmVton;
    private extractResultUrl;
    private pickPrimaryGarment;
    private localComposeFallback;
    private clampRegion;
    private extractBodyBox;
    private getSuppressionRegions;
    private eraseAndNeutralizeRegion;
    private buildGarmentPlacements;
    private prepareGarmentOverlay;
    private groupOutfitItems;
    private toPixels;
    private resolveUploadPath;
}
