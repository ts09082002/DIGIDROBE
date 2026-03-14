import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirebaseAdmin } from '../firebase-admin';
import { v4 as uuid } from 'uuid';

export class WardrobeItem {
  id: string;
  userId: string;
  originalFilename: string;
  originalUrl: string;
  processedUrl?: string;
  category: string;
  subCategory?: string;
  name?: string;
  brand?: string;
  color?: string;
  season?: string[];
  occasion?: string[];
  isFavorite: boolean;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  status: 'processing' | 'done' | 'failed' | 'pending';
  isLowConfidence?: boolean;
  colorPalette?: string;
  mlLabels?: string[];
}

export class CreateItemDto {
  userId: string;
  originalFilename: string;
  originalUrl: string;
  processedUrl?: string;
  category: string;
  subCategory?: string;
  name?: string;
  brand?: string;
  color?: string;
  season?: string[];
  occasion?: string[];
  mimeType: string;
  size: number;
  status?: 'processing' | 'done' | 'failed' | 'pending';
  isFavorite?: boolean;
  isLowConfidence?: boolean;
  colorPalette?: string;
  mlLabels?: string[];
}

@Injectable()
export class WardrobeService {
  private readonly logger = new Logger(WardrobeService.name);
  private readonly collection = getFirebaseAdmin()
    .firestore()
    .collection('wardrobeItems');
  private sanitizeForFirestore<T extends Record<string, any>>(
    data: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  private docToItem(
    id: string,
    data: FirebaseFirestore.DocumentData | undefined,
  ): WardrobeItem | null {
    if (!data) {
      return null;
    }

    return {
      id,
      userId: data.userId ?? '',
      originalFilename: data.originalFilename ?? '',
      originalUrl: data.originalUrl ?? '',
      processedUrl: data.processedUrl ?? undefined,
      category: data.category ?? 'tops',
      subCategory: data.subCategory ?? undefined,
      name: data.name ?? data.originalFilename ?? 'Untitled',
      brand: data.brand ?? undefined,
      color: data.color ?? undefined,
      season: data.season ?? undefined,
      occasion: data.occasion ?? undefined,
      isFavorite: data.isFavorite ?? false,
      mimeType: data.mimeType ?? 'image/png',
      size: data.size ?? 0,
      createdAt: data.createdAt ?? new Date().toISOString(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      status: data.status ?? 'done',
      isLowConfidence: data.isLowConfidence ?? undefined,
      colorPalette: data.colorPalette ?? undefined,
      mlLabels: data.mlLabels ?? undefined,
    };
  }

  async getAll(filters: {
    userId: string;
    category?: string;
    favorite?: boolean;
    search?: string;
  }): Promise<WardrobeItem[]> {
    let query: FirebaseFirestore.Query = this.collection.where(
      'userId',
      '==',
      filters.userId,
    );

    if (filters.category && filters.category !== 'all') {
      query = query.where('category', '==', filters.category);
    }

    if (filters.favorite === true) {
      query = query.where('isFavorite', '==', true);
    }

    const snapshot = await query.get();
    let items: WardrobeItem[] = snapshot.docs
      .map((doc) => this.docToItem(doc.id, doc.data()))
      .filter((i): i is WardrobeItem => i !== null);

    // The original code had a misplaced closing brace here, which was syntactically incorrect.
    // The following filtering logic was outside the method. It has been moved inside.

    if (filters?.search) {
      // Changed from `query?.search` to `filters?.search`
      const q = filters.search.toLowerCase(); // Changed from `query.search` to `filters.search`
      items = items.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) || // Added optional chaining for safety
          i.brand?.toLowerCase().includes(q) || // Added optional chaining for safety
          i.category?.toLowerCase().includes(q), // Added optional chaining for safety
      );
    }

    if (filters?.favorite === true) {
      items = items.filter((i) => i.isFavorite);
    }

    return items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
      userId: data.userId || 'anonymous',
      originalFilename: data.originalFilename || '',
      originalUrl: data.originalUrl || '',
      processedUrl: data.processedUrl || '',
      category: data.category || 'tops',
      subCategory: data.subCategory || '',
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
      mlLabels: data.mlLabels ?? [],
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

  async getStats(userId: string): Promise<{
    totalItems: number;
    totalFavorites: number;
    categories: Record<string, number>;
  }> {
    if (!userId) {
      throw new Error('userId is required for getStats');
    }
    const snapshot = await this.collection.where('userId', '==', userId).get();
    const items: WardrobeItem[] = snapshot.docs
      .map((doc) => this.docToItem(doc.id, doc.data()))
      .filter((i): i is WardrobeItem => i !== null);

    const categories: Record<string, number> = {};
    items.forEach((i) => {
      // Don't filter out 'other' or unclassified - count everything
      const cat = i.category || 'unclassified';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    return {
      totalItems: items.length,
      totalFavorites: items.filter((i) => i.isFavorite).length,
      categories,
    };
  }
}
