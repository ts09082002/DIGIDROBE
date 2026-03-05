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
export declare class UploadService {
    private readonly bgRemovalService;
    private readonly wardrobeService;
    private readonly logger;
    constructor(bgRemovalService: BackgroundRemovalService, wardrobeService: WardrobeService);
    processClothingImage(file: any): Promise<WardrobeItem>;
    private buildDefaultName;
    private classifyClothing;
    private storeMetadata;
    private startBackgroundProcessing;
}
