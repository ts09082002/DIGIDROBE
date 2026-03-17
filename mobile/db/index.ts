/**
 * WatermelonDB database singleton.
 *
 * Uses SQLite adapter with JSI for best performance on the
 * new React Native architecture.
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { WardrobeItemModel } from './models/WardrobeItemModel';
import { OOTDModel } from './models/OOTDModel';
import { SavedLookModel } from './models/SavedLookModel';

const adapter = new SQLiteAdapter({
    schema,
    jsi: true,
    onSetUpError: (error) => {
        console.error('[WatermelonDB] Setup error:', error);
    },
});

export const database = new Database({
    adapter,
    modelClasses: [
        WardrobeItemModel,
        OOTDModel,
        SavedLookModel,
    ],
});
