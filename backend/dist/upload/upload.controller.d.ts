import { UploadService } from './upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    uploadClothing(file: any, category?: string): Promise<{
        success: boolean;
        data: import("../wardrobe/wardrobe.service").WardrobeItem;
    }>;
    getProcessedImage(filename: string, res: any): Promise<void>;
}
