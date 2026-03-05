export interface AiProcessResult {
    imageBuffer: Buffer;
    classification?: {
        category: string;
        sub_category: string;
        confidence: number;
        is_low_confidence: boolean;
    };
    dominantColor?: string;
    colorName?: string;
    palette?: {
        hex: string;
        name: string;
    }[];
}
export declare class BackgroundRemovalService {
    private readonly logger;
    private readonly aiServiceUrl;
    removeBackground(inputPath: string, outputPath: string): Promise<AiProcessResult>;
    private callAIServiceWithRetry;
    private fallbackRemoval;
}
