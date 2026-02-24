import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';

export interface WardrobeItem {
    id: string;
    originalFilename: string;
    originalUrl: string;
    processedUrl: string;
    category: string;
    name: string;
    brand: string;
    color: string;
    season: string[];
    occasion: string[];
    isFavorite: boolean;
    mimeType: string;
    size: number;
    createdAt: string;
    updatedAt: string;
}

@Injectable()
export class WardrobeService {
    private readonly logger = new Logger(WardrobeService.name);
    private readonly itemsPath = join(__dirname, '..', '..', 'uploads', 'metadata', 'wardrobe.json');

    private loadItems(): WardrobeItem[] {
        try {
            if (fs.existsSync(this.itemsPath)) {
                return JSON.parse(fs.readFileSync(this.itemsPath, 'utf-8'));
            }
        } catch (e) {
            this.logger.error('Error loading wardrobe items', e);
        }
        return [];
    }

    private saveItems(items: WardrobeItem[]): void {
        const dir = join(__dirname, '..', '..', 'uploads', 'metadata');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.itemsPath, JSON.stringify(items, null, 2));
    }

    getAll(query?: { category?: string; search?: string; favorite?: string }): WardrobeItem[] {
        let items = this.loadItems();

        const category = query?.category;
        if (category && category !== 'all') {
            items = items.filter(i => i.category.toLowerCase() === category.toLowerCase());
        }

        if (query?.search) {
            const q = query.search.toLowerCase();
            items = items.filter(i =>
                i.name.toLowerCase().includes(q) ||
                i.brand.toLowerCase().includes(q) ||
                i.category.toLowerCase().includes(q)
            );
        }

        if (query?.favorite === 'true') {
            items = items.filter(i => i.isFavorite);
        }

        return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    getById(id: string): WardrobeItem {
        const items = this.loadItems();
        const item = items.find(i => i.id === id);
        if (!item) throw new NotFoundException(`Item ${id} not found`);
        return item;
    }

    create(data: Partial<WardrobeItem>): WardrobeItem {
        const items = this.loadItems();
        const item: WardrobeItem = {
            id: data.id || '',
            originalFilename: data.originalFilename || '',
            originalUrl: data.originalUrl || '',
            processedUrl: data.processedUrl || '',
            category: data.category || 'tops',
            name: data.name || data.originalFilename || 'Untitled',
            brand: data.brand || '',
            color: data.color || '',
            season: data.season || [],
            occasion: data.occasion || [],
            isFavorite: data.isFavorite || false,
            mimeType: data.mimeType || 'image/png',
            size: data.size || 0,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        items.push(item);
        this.saveItems(items);
        return item;
    }

    update(id: string, data: Partial<WardrobeItem>): WardrobeItem {
        const items = this.loadItems();
        const index = items.findIndex(i => i.id === id);
        if (index === -1) throw new NotFoundException(`Item ${id} not found`);

        items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
        this.saveItems(items);
        return items[index];
    }

    toggleFavorite(id: string): WardrobeItem {
        const items = this.loadItems();
        const index = items.findIndex(i => i.id === id);
        if (index === -1) throw new NotFoundException(`Item ${id} not found`);

        items[index].isFavorite = !items[index].isFavorite;
        items[index].updatedAt = new Date().toISOString();
        this.saveItems(items);
        return items[index];
    }

    delete(id: string): void {
        const items = this.loadItems();
        const index = items.findIndex(i => i.id === id);
        if (index === -1) throw new NotFoundException(`Item ${id} not found`);
        items.splice(index, 1);
        this.saveItems(items);
    }

    getStats(): { totalItems: number; totalFavorites: number; categories: Record<string, number> } {
        const items = this.loadItems();
        const categories: Record<string, number> = {};
        items.forEach(i => {
            categories[i.category] = (categories[i.category] || 0) + 1;
        });
        return {
            totalItems: items.length,
            totalFavorites: items.filter(i => i.isFavorite).length,
            categories,
        };
    }
}
