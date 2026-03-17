/**
 * React provider that makes the WatermelonDB database available
 * to all components via context.
 */

import React from 'react';
import { DatabaseProvider as WMDBProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { database } from './index';

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
    return (
        <WMDBProvider database={database}>
            {children}
        </WMDBProvider>
    );
}
