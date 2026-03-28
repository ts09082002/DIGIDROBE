/**
 * Sync endpoints for WatermelonDB synchronize() protocol.
 *
 * Handles pull (server → client) and push (client → server) of
 * metadata changes. Images are never included in the sync payload.
 */

import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { SyncService } from './sync.service';

interface PullRequest {
    lastPulledAt: number | null;
}

interface PushRequest {
    changes: Record<string, {
        created: any[];
        updated: any[];
        deleted: string[];
    }>;
    lastPulledAt: number;
}

@Controller('api/sync')
export class SyncController {
    constructor(private readonly syncService: SyncService) {}

    /**
     * Pull changes from server since last sync timestamp.
     * Returns changes in WatermelonDB sync format.
     */
    @Post('pull')
    async pull(@Body() body: PullRequest) {
        try {
            const { changes, timestamp } = await this.syncService.pullChanges(
                body.lastPulledAt,
            );
            return { changes, timestamp };
        } catch (error) {
            // VULN-07 Fix: Generic error to client, log detail on server
            console.error('Sync pull error:', error);
            throw new HttpException(
                'Sync pull failed. Please try again later.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Push local changes from client to server.
     */
    @Post('push')
    async push(@Body() body: PushRequest) {
        try {
            await this.syncService.pushChanges(body.changes, body.lastPulledAt);
            return { success: true };
        } catch (error) {
            // VULN-07 Fix: Generic error to client, log detail on server
            console.error('Sync push error:', error);
            throw new HttpException(
                'Sync push failed. Please try again later.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
