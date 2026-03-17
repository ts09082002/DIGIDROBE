/**
 * WatermelonDB model for saved outfit looks.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators';

export interface SavedLook {
    id: string;
    name?: string;
    itemIds: string[];
    source: 'ai' | 'manual';
    createdAt: string;
}

export class SavedLookModel extends Model {
    static table = 'saved_looks';

    @text('name') name!: string;
    @text('item_ids_json') itemIdsJson!: string;
    @text('source') source!: string;           // 'ai' | 'manual'
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;

    /** Parsed item IDs */
    get itemIds(): string[] {
        try { return JSON.parse(this.itemIdsJson || '[]'); } catch { return []; }
    }

    toApiShape(): SavedLook {
        return {
            id: this.id,
            name: this.name || undefined,
            itemIds: this.itemIds,
            source: this.source as 'ai' | 'manual',
            createdAt: this.createdAt?.toISOString() ?? new Date().toISOString(),
        };
    }
}
