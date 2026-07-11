import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
    migrations: [
        {
            toVersion: 2,
            steps: [
                // Bumping schema version to 2 to automatically apply isIndexed constraints in DB adapter
            ],
        },
    ],
});
