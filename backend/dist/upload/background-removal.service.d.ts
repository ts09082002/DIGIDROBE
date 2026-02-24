export declare class BackgroundRemovalService {
    private readonly logger;
    removeBackground(inputPath: string, outputPath: string): Promise<void>;
    private fallbackRemoval;
}
