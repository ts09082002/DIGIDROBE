import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirebaseAdmin } from '../firebase-admin';
import { v4 as uuid } from 'uuid';

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
    status: string;
    /** True when AI classification confidence was below 0.4 — prompts user to manually tag. */
    isLowConfidence?: boolean;
    /** JSON string of top-3 color palette from AI: [{hex, name}, ...] */
    colorPalette?: string;
}

@Injectable()
export class WardrobeService {
    private readonly logger = new Logger(WardrobeService.name);
    private readonly collection = getFirebaseAdmin().firestore().collection('wardrobeItems');
    private sanitizeForFirestore<T extends Record<string, any>>(data: T): Partial<T> {
        return Object.fromEntries(
            Object.entries(data).filter(([, value]) => value !== undefined),
        ) as Partial<T>;
    }

    private docToItem(id: string, data: FirebaseFirestore.DocumentData | undefined): WardrobeItem | null {
        if (!data) {
            return null;
        }

        return {
            id,
            originalFilename: data.originalFilename ?? '',
            originalUrl: data.originalUrl ?? '',
            processedUrl: data.processedUrl ?? '',
            category: data.category ?? 'tops',
            name: data.name ?? data.originalFilename ?? 'Untitled',
            brand: data.brand ?? '',
            color: data.color ?? '',
            season: data.season ?? [],
            occasion: data.occasion ?? [],
            isFavorite: data.isFavorite ?? false,
            mimeType: data.mimeType ?? 'image/png',
            size: data.size ?? 0,
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: data.updatedAt ?? new Date().toISOString(),
            status: data.status ?? 'done',
            isLowConfidence: data.isLowConfidence ?? false,
            colorPalette: data.colorPalette ?? undefined,
        };
    }

    async getAll(query?: { category?: string; search?: string; favorite?: string }): Promise<WardrobeItem[]> {
        const snapshot = await this.collection.get();
        let items: WardrobeItem[] = snapshot.docs
            .map((doc) => this.docToItem(doc.id, doc.data()))
            .filter((i): i is WardrobeItem => i !== null);

        const category = query?.category;
        if (category && category !== 'all') {
            items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
        }

        if (query?.search) {
            const q = query.search.toLowerCase();
            items = items.filter((i) =>
                i.name.toLowerCase().includes(q) ||
                i.brand.toLowerCase().includes(q) ||
                i.category.toLowerCase().includes(q),
            );
        }

        if (query?.favorite === 'true') {
            items = items.filter((i) => i.isFavorite);
        }

        return items.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }

    async getById(id: string): Promise<WardrobeItem> {
        const doc = await this.collection.doc(id).get();
        const item = this.docToItem(doc.id, doc.data());
        if (!item) throw new NotFoundException(`Item ${id} not found`);
        return item;
    }

    async create(data: Partial<WardrobeItem>): Promise<WardrobeItem> {
        const id = data.id || uuid();
        const now = new Date().toISOString();

        const item: WardrobeItem = {
            id,
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
            createdAt: data.createdAt || now,
            updatedAt: now,
            status: data.status || 'pending',
            isLowConfidence: data.isLowConfidence ?? false,
            colorPalette: data.colorPalette ?? undefined,
        };

        await this.collection.doc(id).set(this.sanitizeForFirestore(item));
        return item;
    }

    async update(id: string, data: Partial<WardrobeItem>): Promise<WardrobeItem> {
        const docRef = this.collection.doc(id);
        const existing = await docRef.get();
        if (!existing.exists) throw new NotFoundException(`Item ${id} not found`);

        const existingData = this.docToItem(existing.id, existing.data());
        if (!existingData) throw new NotFoundException(`Item ${id} not found`);

        const updated: WardrobeItem = {
            ...existingData,
            ...data,
            updatedAt: new Date().toISOString(),
        };

        await docRef.set(this.sanitizeForFirestore(updated), { merge: true });
        return updated;
    }

    async toggleFavorite(id: string): Promise<WardrobeItem> {
        const docRef = this.collection.doc(id);
        const existing = await docRef.get();
        if (!existing.exists) throw new NotFoundException(`Item ${id} not found`);

        const data = existing.data() || {};
        const updated: Partial<WardrobeItem> = {
            isFavorite: !data.isFavorite,
            updatedAt: new Date().toISOString(),
        };

        await docRef.set(this.sanitizeForFirestore(updated), { merge: true });
        const finalDoc = await docRef.get();
        const item = this.docToItem(finalDoc.id, finalDoc.data());
        if (!item) throw new NotFoundException(`Item ${id} not found`);
        return item;
    }

    async delete(id: string): Promise<void> {
        const docRef = this.collection.doc(id);
        const existing = await docRef.get();
        if (!existing.exists) throw new NotFoundException(`Item ${id} not found`);
        await docRef.delete();
    }

    async getStats(): Promise<{ totalItems: number; totalFavorites: number; categories: Record<string, number> }> {
        const snapshot = await this.collection.get();
        const items: WardrobeItem[] = snapshot.docs
            .map((doc) => this.docToItem(doc.id, doc.data()))
            .filter((i): i is WardrobeItem => i !== null);

        const categories: Record<string, number> = {};
        items.forEach((i) => {
            categories[i.category] = (categories[i.category] || 0) + 1;
        });

        return {
            totalItems: items.length,
            totalFavorites: items.filter((i) => i.isFavorite).length,
            categories,
        };
    }
}

