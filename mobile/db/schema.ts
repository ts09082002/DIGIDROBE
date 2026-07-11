/**
 * WatermelonDB schema for local-first storage.
 *
 * All wardrobe metadata lives here. Images are stored on the local
 * filesystem — only their paths are recorded in the database.
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
    version: 2,
    tables: [
        tableSchema({
            name: 'wardrobe_items',
            columns: [
                { name: 'original_image_path', type: 'string' },
                { name: 'processed_image_path', type: 'string' },
                { name: 'thumbnail_path', type: 'string', isOptional: true },
                { name: 'category', type: 'string', isIndexed: true },
                { name: 'sub_category', type: 'string', isOptional: true },
                { name: 'name', type: 'string' },
                { name: 'brand', type: 'string' },
                { name: 'color', type: 'string' },
                { name: 'season_json', type: 'string' },
                { name: 'occasion_json', type: 'string' },
                { name: 'is_favorite', type: 'boolean', isIndexed: true },
                { name: 'mime_type', type: 'string' },
                { name: 'file_size', type: 'number' },
                { name: 'status', type: 'string' },
                { name: 'is_low_confidence', type: 'boolean' },
                { name: 'color_palette_json', type: 'string', isOptional: true },
                { name: 'ml_labels_json', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number', isIndexed: true },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'ootd_entries',
            columns: [
                { name: 'date', type: 'string', isIndexed: true },        // YYYY-MM-DD
                { name: 'item_ids_json', type: 'string' }, // JSON string[]
                { name: 'notes', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'saved_looks',
            columns: [
                { name: 'name', type: 'string', isOptional: true },
                { name: 'item_ids_json', type: 'string' }, // JSON string[]
                { name: 'source', type: 'string' },        // 'ai' | 'manual'
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
    ],
});
