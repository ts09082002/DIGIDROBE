/**
 * WatermelonDB cloud sync adapter.
 *
 * Uses WatermelonDB's built-in synchronize() protocol to push/pull
 * metadata changes to/from the backend. Images are NEVER synced —
 * only metadata fields and optional low-res thumbnails.
 *
 * Sync is opt-in: controlled by AsyncStorage flag `settings_cloud_sync_enabled`.
 */

import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './index';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_ENABLED_KEY = 'settings_cloud_sync_enabled';
const LAST_SYNC_KEY = 'settings_last_sync_at';

/**
 * Check if cloud sync is enabled by the user.
 */
export async function isSyncEnabled(): Promise<boolean> {
    const val = await AsyncStorage.getItem(SYNC_ENABLED_KEY);
    return val === 'true';
}

/**
 * Enable or disable cloud sync.
 */
export async function setSyncEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(SYNC_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Get the timestamp of the last successful sync.
 */
export async function getLastSyncTime(): Promise<string | null> {
    return AsyncStorage.getItem(LAST_SYNC_KEY);
}

/**
 * Perform a sync with the backend if sync is enabled.
 * Safe to call frequently — WatermelonDB handles deduplication.
 */
export async function syncIfEnabled(): Promise<void> {
    const enabled = await isSyncEnabled();
    if (!enabled) return;

    try {
        await performSync();
    } catch (error) {
        console.warn('[Sync] Sync failed (will retry later):', error);
    }
}

/**
 * Force a sync regardless of the enabled flag.
 * Used when the user manually triggers a sync from settings.
 */
export async function performSync(): Promise<void> {
    await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
            const { changes, timestamp } = await api.syncPull(lastPulledAt);
            return { changes, timestamp };
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
            // Strip image path fields from the sync payload — images stay local
            const sanitized = sanitizeChangesForSync(changes);
            await api.syncPush(sanitized, lastPulledAt);
        },
    });

    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    console.log('[Sync] Sync completed successfully');
}

/**
 * Remove image paths from sync payload so they never leave the device.
 * Only metadata fields are synced.
 */
function sanitizeChangesForSync(changes: any): any {
    const sanitized = { ...changes };

    // For wardrobe_items, strip local file paths
    if (sanitized.wardrobe_items) {
        const stripPaths = (records: any[]) =>
            records.map((record: any) => {
                const { original_image_path, processed_image_path, thumbnail_path, ...rest } = record;
                return rest;
            });

        if (sanitized.wardrobe_items.created) {
            sanitized.wardrobe_items.created = stripPaths(sanitized.wardrobe_items.created);
        }
        if (sanitized.wardrobe_items.updated) {
            sanitized.wardrobe_items.updated = stripPaths(sanitized.wardrobe_items.updated);
        }
    }

    return sanitized;
}

/**
 * Permanently purge all soft-deleted records from the SQLite database.
 * Useful for local-only users to prevent database bloat over time.
 */
export async function purgeSoftDeleted(): Promise<void> {
    try {
        const tables = ['wardrobe_items', 'ootd_entries', 'saved_looks'];
        await database.write(async () => {
            for (const table of tables) {
                // WatermelonDB adapter supports unsafeExecute for raw SQL operations
                await database.adapter.unsafeExecute({
                    // @ts-ignore
                    sql: `delete from ${table} where _status = 'deleted'`,
                    args: [],
                });
            }
        });
        console.log('[Database] Soft-deleted records purged successfully from all tables');
    } catch (err) {
        console.warn('[Database] Failed to purge soft-deleted records:', err);
    }
}
