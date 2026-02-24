import { Injectable, Logger } from '@nestjs/common';
import { BackgroundRemovalService } from './background-removal.service';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

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

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);

    constructor(private readonly bgRemovalService: BackgroundRemovalService) { }

    async processClothingImage(file: any): Promise<ProcessedImage> {
        const id = uuidv4();
        this.logger.log(`Processing clothing image: ${file.originalname} (${file.size} bytes)`);

        // Step 1: Remove background using sharp
        const processedDir = join(__dirname, '..', '..', 'uploads', 'processed');
        if (!fs.existsSync(processedDir)) {
            fs.mkdirSync(processedDir, { recursive: true });
        }

        const processedFilename = `${id}_clean.png`;
        const processedPath = join(processedDir, processedFilename);

        await this.bgRemovalService.removeBackground(file.path, processedPath);

        // Step 2: Classify clothing type based on filename/basic heuristics
        const category = this.classifyClothing(file.originalname);

        const result: ProcessedImage = {
            id,
            originalFilename: file.originalname,
            originalUrl: `/uploads/originals/${file.filename}`,
            processedUrl: `/uploads/processed/${processedFilename}`,
            category,
            mimeType: file.mimetype,
            size: file.size,
            createdAt: new Date().toISOString(),
        };

        // Step 3: Store metadata
        await this.storeMetadata(result);

        this.logger.log(`Successfully processed: ${id} → Category: ${category}`);
        return result;
    }

    private classifyClothing(filename: string): string {
        const name = filename.toLowerCase();

        const categories: Record<string, string[]> = {
            'tops': ['shirt', 'tshirt', 't-shirt', 'blouse', 'top', 'polo', 'tank', 'sweater', 'hoodie', 'pullover', 'cami', 'vest'],
            'bottoms': ['pants', 'jeans', 'shorts', 'skirt', 'trousers', 'leggings', 'chinos', 'joggers'],
            'outerwear': ['jacket', 'coat', 'blazer', 'cardigan', 'windbreaker', 'parka', 'trench', 'bomber'],
            'shoes': ['shoes', 'sneakers', 'boots', 'sandals', 'heels', 'loafers', 'flats', 'slippers'],
            'accessories': ['hat', 'cap', 'scarf', 'belt', 'tie', 'watch', 'bag', 'purse', 'glasses', 'sunglasses', 'jewelry', 'necklace', 'bracelet', 'ring', 'earring'],
            'dresses': ['dress', 'gown', 'romper', 'jumpsuit'],
        };

        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(kw => name.includes(kw))) {
                return category;
            }
        }

        return 'tops'; // Default category
    }

    private async storeMetadata(data: ProcessedImage): Promise<void> {
        const metaDir = join(__dirname, '..', '..', 'uploads', 'metadata');
        if (!fs.existsSync(metaDir)) {
            fs.mkdirSync(metaDir, { recursive: true });
        }

        // Append to items JSON file (simple flat-file storage for now)
        const itemsFile = join(metaDir, 'items.json');
        let items: ProcessedImage[] = [];

        if (fs.existsSync(itemsFile)) {
            const raw = fs.readFileSync(itemsFile, 'utf-8');
            items = JSON.parse(raw);
        }

        items.push(data);
        fs.writeFileSync(itemsFile, JSON.stringify(items, null, 2));
    }
}
