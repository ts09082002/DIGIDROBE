import { PackingService } from './packing.service';
import { TryOnService } from './try-on.service';
import type { PackingListRequest, StyleProfileRequest } from './packing.service';
import type { TryOnPreviewRequest } from './try-on.service';
export declare class PackingController {
    private readonly packingService;
    private readonly tryOnService;
    constructor(packingService: PackingService, tryOnService: TryOnService);
    generate(userId: string, body: PackingListRequest): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: import("../app.module").WardrobeItem[];
        message?: undefined;
    }>;
    getStylistSuggestion(userId: string): Promise<{
        success: boolean;
        data: import("./packing.service").StylistSuggestion;
    }>;
    getPersonalizedStylistSuggestion(userId: string, body: StyleProfileRequest): Promise<{
        success: boolean;
        data: import("./packing.service").StylistSuggestion;
    }>;
    generateTryOnPreview(userId: string, body: TryOnPreviewRequest): Promise<{
        success: boolean;
        data: import("./try-on.service").TryOnPreviewResult;
    }>;
}
