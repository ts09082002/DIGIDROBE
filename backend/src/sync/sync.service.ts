/**
 * Sync service implementing WatermelonDB's pull/push protocol.
 *
 * Stores metadata in Firestore under a `sync_items` collection.
 * Images are never stored — only metadata fields.
 *
 * WatermelonDB sync format:
 *   changes: {
 *     [table_name]: {
 *       created: Record[],
 *       updated: Record[],
 *       deleted: string[]
 *     }
 *   }
 */

import { Injectable } from '@nestjs/common';
import { getFirebaseAdmin } from '../firebase-admin';

// Tables we sync
const SYNCED_TABLES = ['wardrobe_items', 'ootd_entries', 'saved_looks'];

@Injectable()
export class SyncService {
    private get db() {
        return getFirebaseAdmin().firestore();
    }

    /**
     * Pull changes from Firestore since lastPulledAt.
     * Returns changes in WatermelonDB sync format.
     */
    async pullChanges(lastPulledAt: number | null): Promise<{
        changes: Record<string, { created: any[]; updated: any[]; deleted: string[] }>;
        timestamp: number;
    }> {
        const timestamp = Date.now();
        const changes: Record<string, { created: any[]; updated: any[]; deleted: string[] }> = {};

        for (const table of SYNCED_TABLES) {
            const collection = this.db.collection(`sync_${table}`);
            let query: FirebaseFirestore.Query = collection;

            if (lastPulledAt) {
                // Only get records modified since last pull
                query = query.where('_synced_at', '>', lastPulledAt);
            }

            const snapshot = await query.get();

            const created: any[] = [];
            const updated: any[] = [];
            const deleted: string[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data._deleted) {
                    deleted.push(doc.id);
                } else if (!lastPulledAt || (data._created_at && data._created_at > lastPulledAt)) {
                    created.push({ id: doc.id, ...this.stripSyncMeta(data) });
                } else {
                    updated.push({ id: doc.id, ...this.stripSyncMeta(data) });
                }
            });

            changes[table] = { created, updated, deleted };
        }

        return { changes, timestamp };
    }

    /**
     * Push local changes to Firestore.
     */
    async pushChanges(
        changes: Record<string, { created: any[]; updated: any[]; deleted: string[] }>,
        lastPulledAt: number,
    ): Promise<void> {
        const batch = this.db.batch();
        const now = Date.now();

        for (const table of SYNCED_TABLES) {
            const tableChanges = changes[table];
            if (!tableChanges) continue;

            const collection = this.db.collection(`sync_${table}`);

            // Process created records
            for (const record of tableChanges.created || []) {
                const { id, ...data } = record;
                const docRef = collection.doc(id);
                batch.set(docRef, {
                    ...data,
                    _synced_at: now,
                    _created_at: now,
                });
            }

            // Process updated records
            for (const record of tableChanges.updated || []) {
                const { id, ...data } = record;
                const docRef = collection.doc(id);
                batch.set(docRef, {
                    ...data,
                    _synced_at: now,
                }, { merge: true });
            }

            // Process deleted records (soft delete for sync protocol)
            for (const id of tableChanges.deleted || []) {
                const docRef = collection.doc(id);
                batch.set(docRef, {
                    _deleted: true,
                    _synced_at: now,
                }, { merge: true });
            }
        }

        await batch.commit();
    }

    /**
     * Remove internal sync metadata fields before sending to client.
     */
    private stripSyncMeta(data: Record<string, any>): Record<string, any> {
        const { _synced_at, _created_at, _deleted, ...rest } = data;
        return rest;
    }
}
