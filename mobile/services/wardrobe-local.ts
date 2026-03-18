/**
 * Local wardrobe data access layer.
 *
 * Replaces backend API calls with WatermelonDB operations.
 * Every method returns the same WardrobeItem interface from api.ts
 * so existing UI code and the recommendation engine work unchanged.
 */

import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import { WardrobeItemModel } from '../db/models/WardrobeItemModel';
import type { WardrobeItem, WardrobeStats } from './api';
import type { OnDeviceProcessingResult } from './image-processor';
import { normalizeCategory } from '../constants/categories';
import {
    saveOriginalImage,
    saveProcessedImage,
    generateThumbnail,
    deleteImages,
    getLocalFileSize,
} from './local-image-storage';

const itemsCollection = database.get<WardrobeItemModel>('wardrobe_items');

/**
 * Add a new clothing item: save images locally, insert into WatermelonDB.
 */
export async function addClothingItem(
    processedResult: OnDeviceProcessingResult,
    originalUri: string,
    filename: string,
    preferredCategory?: string,
): Promise<WardrobeItem> {
    // Generate a temporary ID to use for file naming (WatermelonDB will assign the real one)
    const record = await database.write(async () => {
        const newRecord = await itemsCollection.create((item) => {
            // These will be overwritten after file save, but we set placeholders
            item.originalImagePath = '';
            item.processedImagePath = '';
            item.category = preferredCategory || processedResult.classification.category;
            item.subCategory = processedResult.classification.subCategory || '';
            item.name = filename.replace(/\.[^.]+$/, ''); // Strip extension
            item.brand = '';
            item.color = processedResult.colors.dominantName;
            item.seasonJson = JSON.stringify([]);
            item.occasionJson = JSON.stringify([]);
            item.isFavorite = false;
            item.mimeType = 'image/png';
            item.fileSize = 0;
            item.status = 'done';
            item.isLowConfidence = processedResult.classification.isLowConfidence || false;
            item.colorPaletteJson = processedResult.colors.palette
                ? JSON.stringify(processedResult.colors.palette)
                : '';
            item.mlLabelsJson = processedResult.classification.mlLabels
                ? JSON.stringify(processedResult.classification.mlLabels)
                : '';
        });
        return newRecord;
    });

    // Save images using the WatermelonDB record ID
    const [originalPath, processedPath] = await Promise.all([
        saveOriginalImage(originalUri, record.id),
        saveProcessedImage(processedResult.processedImageUri, record.id),
    ]);

    // Generate thumbnail for potential cloud sync
    let thumbnailPath = '';
    try {
        thumbnailPath = await generateThumbnail(processedPath, record.id);
    } catch {
        // Non-critical — skip thumbnail
    }

    // Get file size
    const fileSize = await getLocalFileSize(processedPath);

    // Update record with final paths
    await database.write(async () => {
        await record.update((item) => {
            item.originalImagePath = originalPath;
            item.processedImagePath = processedPath;
            item.thumbnailPath = thumbnailPath;
            item.fileSize = fileSize;
        });
    });

    return record.toApiShape();
}

/**
 * Get all wardrobe items, with optional filtering.
 */
export async function getAllItems(params?: {
    category?: string;
    search?: string;
    favorite?: string;
}): Promise<WardrobeItem[]> {
    const conditions: Q.Clause[] = [];

    if (params?.category && params.category !== 'all') {
        // Backend uses 'tops', 'bottoms' etc. — match both backend and canonical forms
        conditions.push(Q.where('category', params.category));
    }
    if (params?.favorite === 'true') {
        conditions.push(Q.where('is_favorite', true));
    }

    let records = await itemsCollection.query(...conditions).fetch();

    // Client-side text search (WatermelonDB SQLite LIKE is limited)
    if (params?.search) {
        const searchLower = params.search.toLowerCase();
        records = records.filter(
            (r) =>
                r.name.toLowerCase().includes(searchLower) ||
                r.brand.toLowerCase().includes(searchLower) ||
                r.color.toLowerCase().includes(searchLower) ||
                r.category.toLowerCase().includes(searchLower),
        );
    }

    // Sort by created_at descending (newest first)
    records.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

    return records.map((r) => r.toApiShape());
}

/**
 * Get a single item by ID.
 */
export async function getItemById(id: string): Promise<WardrobeItem> {
    const record = await itemsCollection.find(id);
    return record.toApiShape();
}

/**
 * Update a wardrobe item's metadata.
 */
export async function updateItem(
    id: string,
    data: Partial<WardrobeItem>,
): Promise<WardrobeItem> {
    const record = await itemsCollection.find(id);

    await database.write(async () => {
        await record.update((item) => {
            if (data.name !== undefined) item.name = data.name;
            if (data.brand !== undefined) item.brand = data.brand;
            if (data.category !== undefined) item.category = data.category;
            if (data.subCategory !== undefined) item.subCategory = data.subCategory || '';
            if (data.color !== undefined) item.color = data.color;
            if (data.season !== undefined) item.seasonJson = JSON.stringify(data.season);
            if (data.occasion !== undefined) item.occasionJson = JSON.stringify(data.occasion);
            if (data.isFavorite !== undefined) item.isFavorite = data.isFavorite;
        });
    });

    return record.toApiShape();
}

/**
 * Toggle the favorite status of an item.
 */
export async function toggleFavorite(id: string): Promise<WardrobeItem> {
    const record = await itemsCollection.find(id);

    await database.write(async () => {
        await record.update((item) => {
            item.isFavorite = !item.isFavorite;
        });
    });

    return record.toApiShape();
}

/**
 * Delete a wardrobe item and its associated image files.
 */
export async function deleteItem(id: string): Promise<void> {
    const record = await itemsCollection.find(id);

    // Delete image files first
    await deleteImages(id);

    // Then remove the database record
    await database.write(async () => {
        await record.markAsDeleted();
    });
}

/**
 * Create a wardrobe item manually (e.g. from a suggestion with a remote image URL).
 * Images stay as external URLs — not downloaded to local storage.
 */
export async function createItemManual(
    data: Partial<import('./api').WardrobeItem>,
): Promise<WardrobeItem> {
    const record = await database.write(async () => {
        return itemsCollection.create((item) => {
            item.originalImagePath = data.originalUrl || '';
            item.processedImagePath = data.processedUrl || '';
            item.category = data.category || 'unclassified';
            item.subCategory = data.subCategory || '';
            item.name = data.name || 'Untitled';
            item.brand = data.brand || '';
            item.color = data.color || '';
            item.seasonJson = JSON.stringify(data.season || []);
            item.occasionJson = JSON.stringify(data.occasion || []);
            item.isFavorite = data.isFavorite || false;
            item.mimeType = data.mimeType || 'image/png';
            item.fileSize = data.size || 0;
            item.status = data.status || 'done';
            item.isLowConfidence = data.isLowConfidence || false;
            item.colorPaletteJson = data.colorPalette || '';
            item.mlLabelsJson = data.mlLabels ? JSON.stringify(data.mlLabels) : '';
        });
    });

    return record.toApiShape();
}

/**
 * Get aggregate wardrobe statistics.
 */
export async function getStats(): Promise<WardrobeStats> {
    const allItems = await itemsCollection.query().fetch();

    const categoryCounts: Record<string, number> = {};
    const colorCounts: Record<string, number> = {};

    for (const item of allItems) {
        const cat = normalizeCategory(item.category);
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        const color = item.color || 'Unknown';
        colorCounts[color] = (colorCounts[color] || 0) + 1;
    }

    return {
        totalItems: allItems.length,
        categoryCounts,
        colorCounts,
    };
}
