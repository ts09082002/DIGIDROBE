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
import { addNotification } from './notifications';

const itemsCollection = database.get<WardrobeItemModel>('wardrobe_items');

/**
 * FEATURE: BATCH INGESTION CONTROLLER FOR MAGIC WARDROBE EXTRACTOR
 * Iterates through processed on-body segments and logs them cleanly into WatermelonDB.
 * Uses existing saveProcessedImage pipeline to bypass TS asset compilation mismatches.
 */
export async function addMagicExtractedItemsToWardrobe(
    extractedItems: OnDeviceProcessingResult[],
    originalFullBodyPath: string
): Promise<void> {
    console.log(`[BatchIngestion] Initiating db injection for ${extractedItems.length} elements.`);

    await database.write(async () => {
        const itemsToCreate = await Promise.all(
            extractedItems.map(async (item, index) => {
                // Generate a temporary execution pseudo-ID for file alignment rules
                const pseudoId = `magic_${Date.now()}_${index}`;
                
                // Existing saveProcessedImage framework converts string cache references to stable app storage paths
                const permanentlyStoredUri = await saveProcessedImage(
                    item.processedImageUri, 
                    pseudoId
                );

                // Prepare schema model bindings matched strictly to your active Watermelon DB fields
                return itemsCollection.prepareCreate((record) => {
                    record.originalImagePath = originalFullBodyPath; 
                    record.processedImagePath = permanentlyStoredUri;
                    record.thumbnailPath = ''; 
                    record.category = item.classification.category || 'unclassified';
                    record.subCategory = item.classification.subCategory || '';
                    record.name = `${item.classification.subCategory || 'Clothing'} (${item.colors.dominantName})`;
                    record.brand = 'Extracted Look';
                    record.color = item.colors.dominantName;
                    record.seasonJson = JSON.stringify([]);
                    record.occasionJson = JSON.stringify([]);
                    record.isFavorite = false;
                    record.mimeType = 'image/png';
                    record.fileSize = 0; 
                    record.status = 'processed';
                    record.isLowConfidence = item.classification.isLowConfidence || false;
                    record.colorPaletteJson = item.colors.palette ? JSON.stringify(item.colors.palette) : '';
                    record.mlLabelsJson = item.classification.mlLabels ? JSON.stringify(item.classification.mlLabels) : '';
                });
            })
        );

        // SQLite processing atomic batch injection sequence
        await database.batch(...itemsToCreate);
        console.log(`[BatchIngestion] Successfully committed ${itemsToCreate.length} records to local database.`);
    });
}

/**
 * Add a new clothing item: save images locally, insert into WatermelonDB.
 */
export async function addClothingItem(
    processedResult: OnDeviceProcessingResult,
    originalUri: string,
    filename: string,
    preferredCategory?: string,
): Promise<WardrobeItem> {
    const record = await database.write(async () => {
        const newRecord = await itemsCollection.create((item) => {
            item.originalImagePath = '';
            item.processedImagePath = '';
            item.category = preferredCategory || processedResult.classification.category;
            item.subCategory = processedResult.classification.subCategory || '';
            item.name = filename.replace(/\.[^.]+$/, '');
            item.brand = '';
            item.color = processedResult.colors.dominantName;
            item.seasonJson = JSON.stringify([]);
            item.occasionJson = JSON.stringify([]);
            item.isFavorite = false;
            item.mimeType = 'image/png';
            item.fileSize = 0;
            item.status = 'done';
            item.isLowConfidence = processedResult.classification.isLowConfidence || false;
            item.colorPaletteJson = processedResult.colors.palette ? JSON.stringify(processedResult.colors.palette) : '';
            item.mlLabelsJson = processedResult.classification.mlLabels ? JSON.stringify(processedResult.classification.mlLabels) : '';
        });
        return newRecord;
    });

    const [originalPath, processedPath] = await Promise.all([
        saveOriginalImage(originalUri, record.id),
        saveProcessedImage(processedResult.processedImageUri, record.id),
    ]);

    let thumbnailPath = '';
    try {
        thumbnailPath = await generateThumbnail(processedPath, record.id);
    } catch {
        // Non-critical — skip thumbnail
    }

    const fileSize = await getLocalFileSize(processedPath);

    await database.write(async () => {
        await record.update((item) => {
            item.originalImagePath = originalPath;
            item.processedImagePath = processedPath;
            item.thumbnailPath = thumbnailPath;
            item.fileSize = fileSize;
        });
    });

    await addNotification({
        type: 'upload',
        title: 'New Item Added',
        message: `Your new ${record.category} has been added to your digital closet!`,
        imageUri: processedPath
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
        conditions.push(Q.where('category', params.category));
    }
    if (params?.favorite === 'true') {
        conditions.push(Q.where('is_favorite', true));
    }

    // Sort by created_at descending directly in SQLite
    conditions.push(Q.sortBy('created_at', Q.desc));

    let records = await itemsCollection.query(...conditions).fetch();

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

    await database.write(async () => {
        await record.markAsDeleted();
    });

    await deleteImages(id);

    await addNotification({
        type: 'delete',
        title: 'Item Removed',
        message: 'An item has been successfully removed from your closet.',
    });
}

/**
 * Create a wardrobe item manually (e.g. from a suggestion with a remote image URL).
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