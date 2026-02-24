import { BackgroundRemovalService } from './background-removal.service';
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
    private readonly logger;
    constructor(bgRemovalService: BackgroundRemovalService);
    processClothingImage(file: any): Promise<ProcessedImage>;
    private classifyClothing;
    private storeMetadata;
}
