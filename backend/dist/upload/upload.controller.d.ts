import { UploadService } from './upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    uploadClothing(files: {
        image?: any[];
        original?: any[];
    }, category?: string, subCategory?: string, mlLabelsJson?: string, colorPaletteJson?: string): Promise<{
        success: boolean;
        data: import("../wardrobe/wardrobe.service").WardrobeItem;
    }>;
}
