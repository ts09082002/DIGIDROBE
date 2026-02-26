export declare class BackgroundRemovalService {
    private readonly logger;
    private readonly aiServiceUrl;
    removeBackground(inputPath: string, outputPath: string): Promise<void>;
    private removeBackgroundWithAiService;
    private getMimeTypeFromPath;
}
