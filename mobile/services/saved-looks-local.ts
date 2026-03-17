/**
 * Local saved looks data access layer.
 *
 * Replaces AsyncStorage-based savedLooks.ts with WatermelonDB.
 * Exports the same interface (SavedLook, getSavedLooks, saveLook, deleteLook).
 */

import { database } from '../db';
import { SavedLookModel } from '../db/models/SavedLookModel';

export type SavedLookSource = 'ai' | 'manual';

export interface SavedLook {
    id: string;
    name?: string;
    itemIds: string[];
    createdAt: string;
    source: SavedLookSource;
}

const looksCollection = database.get<SavedLookModel>('saved_looks');

/**
 * Get all saved looks, newest first.
 */
export async function getSavedLooks(): Promise<SavedLook[]> {
    try {
        const records = await looksCollection.query().fetch();
        const looks = records.map((r) => r.toApiShape());
        looks.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        return looks;
    } catch (error) {
        console.warn('Failed to load saved looks', error);
        return [];
    }
}

/**
 * Save a look (upsert by ID).
 */
export async function saveLook(look: SavedLook): Promise<void> {
    try {
        // Try to find existing
        let existing: SavedLookModel | null = null;
        try {
            existing = await looksCollection.find(look.id);
        } catch {
            // Not found — will create new
        }

        await database.write(async () => {
            if (existing) {
                await existing.update((record) => {
                    if (look.name !== undefined) record.name = look.name || '';
                    record.itemIdsJson = JSON.stringify(look.itemIds);
                    record.source = look.source;
                });
            } else {
                await looksCollection.create((record) => {
                    record._raw.id = look.id; // Preserve original ID
                    record.name = look.name || '';
                    record.itemIdsJson = JSON.stringify(look.itemIds);
                    record.source = look.source;
                });
            }
        });
    } catch (error) {
        console.warn('Failed to save look', error);
    }
}

/**
 * Delete a saved look by ID.
 */
export async function deleteLook(id: string): Promise<void> {
    try {
        const record = await looksCollection.find(id);
        await database.write(async () => {
            await record.markAsDeleted();
        });
    } catch (error) {
        console.warn('Failed to delete look', error);
    }
}
