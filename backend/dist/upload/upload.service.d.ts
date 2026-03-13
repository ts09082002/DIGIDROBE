import { BackgroundRemovalService } from './background-removal.service';
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
export declare class UploadService {
    private readonly bgRemovalService;
    private readonly wardrobeService;
    private readonly logger;
    constructor(bgRemovalService: BackgroundRemovalService, wardrobeService: WardrobeService);
    processClothingImage(file: any, preferredCategory?: string, preferredSubCategory?: string, preferredMlLabels?: string[]): Promise<WardrobeItem>;
    processBodyPhoto(file: any): Promise<BodyPhotoResult>;
    private extractBodyBox;
    private buildDefaultName;
    private classifyClothing;
    private normalizePreferredCategory;
    private storeMetadata;
    private startBackgroundProcessing;
}
