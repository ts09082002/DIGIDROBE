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

    @text('name') declare name: string;
    @text('item_ids_json') declare itemIdsJson: string;
    @text('source') declare source: string;           // 'ai' | 'manual'
    @readonly @date('created_at') declare createdAt: Date;
    @readonly @date('updated_at') declare updatedAt: Date;

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
