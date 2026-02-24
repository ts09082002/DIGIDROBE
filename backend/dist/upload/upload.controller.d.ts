import { UploadService } from './upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    uploadClothing(file: any): Promise<{
        success: boolean;
        data: import("./upload.service").ProcessedImage;
    }>;
    getProcessedImage(filename: string, res: any): Promise<void>;
}
