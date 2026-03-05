import { PackingService } from './packing.service';
import type { PackingListRequest } from './packing.service';
export declare class PackingController {
    private readonly packingService;
    constructor(packingService: PackingService);
    generate(body: PackingListRequest): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: import("../wardrobe/wardrobe.service").WardrobeItem[];
        message?: undefined;
    }>;
    getStylistSuggestion(): Promise<{
        success: boolean;
        data: import("./packing.service").StylistSuggestion;
    }>;
}
