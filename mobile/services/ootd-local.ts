/**
 * Local OOTD (Outfit of the Day) data access layer.
 *
 * Replaces backend calendar API calls with WatermelonDB operations.
 * Returns the same OOTD / OOTDStats interfaces from api.ts.
 */

import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import { OOTDModel } from '../db/models/OOTDModel';
import type { OOTD, OOTDStats } from './api';

const ootdCollection = database.get<OOTDModel>('ootd_entries');

/**
 * Save or update an OOTD entry for a given date.
 * If an entry already exists for that date, it is updated (upsert).
 */
export async function saveOOTD(
    date: string,
    itemIds: string[],
    notes: string = '',
): Promise<OOTD> {
    // Check if entry exists for this date
    const existing = await ootdCollection
        .query(Q.where('date', date))
        .fetch();

    let record: OOTDModel;

    if (existing.length > 0) {
        // Update existing
        record = existing[0];
        await database.write(async () => {
            await record.update((entry) => {
                entry.itemIdsJson = JSON.stringify(itemIds);
                entry.notes = notes;
            });
        });
    } else {
        // Create new
        record = await database.write(async () => {
            return ootdCollection.create((entry) => {
                entry.dateStr = date;
                entry.itemIdsJson = JSON.stringify(itemIds);
                entry.notes = notes;
            });
        });
    }

    return record.toApiShape();
}

/**
 * Get all OOTD entries for a given month.
 */
export async function getOOTDByMonth(
    year: number,
    month: number,
): Promise<OOTD[]> {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;

    // WatermelonDB uses SQLite LIKE for prefix matching
    const records = await ootdCollection
        .query(
            Q.where('date', Q.like(`${Q.sanitizeLikeString(prefix)}%`)),
        )
        .fetch();

    return records.map((r) => r.toApiShape());
}

/**
 * Get wear statistics over the last N days.
 */
export async function getOOTDStats(days: number = 30): Promise<OOTDStats | null> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const records = await ootdCollection
        .query(Q.where('date', Q.gte(cutoffStr)))
        .fetch();

    // Count how often each item was worn
    const wearCounts: Record<string, number> = {};
    for (const record of records) {
        for (const itemId of record.itemIds) {
            wearCounts[itemId] = (wearCounts[itemId] || 0) + 1;
        }
    }

    const sorted = Object.entries(wearCounts)
        .map(([itemId, count]) => ({ itemId, count }))
        .sort((a, b) => b.count - a.count);

    return {
        mostWorn: sorted.slice(0, 5),
        leastWorn: sorted.slice(-5).reverse(),
    };
}
