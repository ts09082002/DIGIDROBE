/**
 * WatermelonDB model for OOTD (Outfit of the Day) calendar entries.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators';
import type { OOTD } from '../../services/api';

export class OOTDModel extends Model {
    static table = 'ootd_entries';

    @text('date') declare dateStr: string;           // YYYY-MM-DD
    @text('item_ids_json') declare itemIdsJson: string;
    @text('notes') declare notes: string;
    @readonly @date('created_at') declare createdAt: Date;
    @readonly @date('updated_at') declare updatedAt: Date;

    /** Parsed item IDs */
    get itemIds(): string[] {
        try { return JSON.parse(this.itemIdsJson || '[]'); } catch { return []; }
    }

    /** Convert to the same OOTD shape used by api.ts */
    toApiShape(): OOTD {
        return {
            id: this.id,
            date: this.dateStr,
            itemIds: this.itemIds,
            notes: this.notes || '',
            createdAt: this.createdAt?.toISOString() ?? new Date().toISOString(),
            updatedAt: this.updatedAt?.toISOString() ?? new Date().toISOString(),
        };
    }
}
