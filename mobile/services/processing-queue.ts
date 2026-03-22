/**
 * Sequential Image Processing Queue
 *
 * Enterprise-grade job queue that processes images one-by-one,
 * shows real-time progress via notifications, and continues
 * processing when the app is backgrounded.
 *
 * Uses expo-task-manager + expo-notifications for background support.
 */

import { AppState, AppStateStatus } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { processClothingImageOnDevice, OnDeviceProcessingResult } from './image-processor';
import { canonicalToBackend } from './ml-classifier';
import * as wardrobeLocal from './wardrobe-local';
import { normalizeCategory } from '../constants/categories';
import type { WardrobeItem } from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

export interface ProcessingJob {
    id: string;
    originalUri: string;
    filename: string;
    preferredCategory?: string;
    status: JobStatus;
    error?: string;
    resultItem?: WardrobeItem;
}

export interface QueueProgress {
    current: number;
    total: number;
    currentFilename: string;
}

export interface QueueCallbacks {
    onProgress?: (progress: QueueProgress) => void;
    onItemComplete?: (item: WardrobeItem, index: number) => void;
    onItemError?: (jobId: string, error: string, index: number) => void;
    onQueueComplete?: (items: WardrobeItem[]) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROCESSING_TASK_NAME = 'DIGIDROBE_IMAGE_PROCESSING';
const GC_DELAY_MS = 300; // Pause between jobs for garbage collection
const NOTIFICATION_ID = 'processing-progress';

// ─── Notification Setup ──────────────────────────────────────────────────────

// Configure notification channel for Android (silent processing updates)
Notifications.setNotificationChannelAsync('processing', {
    name: 'Image Processing',
    importance: Notifications.AndroidImportance.LOW,
    sound: undefined,
    vibrationPattern: [0],
    lightColor: '#F2A900',
});

// ─── Queue Singleton ─────────────────────────────────────────────────────────

class ImageProcessingQueue {
    private jobs: ProcessingJob[] = [];
    private isRunning = false;
    private callbacks: QueueCallbacks = {};
    private completedItems: WardrobeItem[] = [];
    private processedCount = 0;
    private notificationId: string | null = null;

    /**
     * Enqueue multiple images for sequential processing.
     * Returns immediately — processing happens asynchronously.
     */
    enqueue(
        assets: Array<{ uri: string; filename: string; preferredCategory?: string }>,
        callbacks: QueueCallbacks,
    ): void {
        this.callbacks = callbacks;
        this.completedItems = [];
        this.processedCount = 0;

        // Create jobs
        this.jobs = assets.map((asset, index) => ({
            id: `job_${Date.now()}_${index}`,
            originalUri: asset.uri,
            filename: asset.filename,
            preferredCategory: asset.preferredCategory,
            status: 'queued' as JobStatus,
        }));

        console.log(`[Queue] Enqueued ${this.jobs.length} images for processing`);

        // Start the sequential worker
        if (!this.isRunning) {
            this.startWorker();
        }
    }

    /** Current progress snapshot */
    getProgress(): QueueProgress | null {
        if (!this.isRunning || this.jobs.length === 0) return null;
        const currentJob = this.jobs.find((j) => j.status === 'processing');
        return {
            current: this.processedCount + 1,
            total: this.jobs.length,
            currentFilename: currentJob?.filename || '',
        };
    }

    /** Whether the queue is actively processing */
    get running(): boolean {
        return this.isRunning;
    }

    /** Total jobs in current batch */
    get totalJobs(): number {
        return this.jobs.length;
    }

    // ─── Worker Loop ─────────────────────────────────────────────────────

    private async startWorker(): Promise<void> {
        this.isRunning = true;

        // Show persistent notification for background support
        await this.showProcessingNotification();

        for (let i = 0; i < this.jobs.length; i++) {
            const job = this.jobs[i];
            if (job.status !== 'queued') continue;

            // Update status
            job.status = 'processing';
            this.processedCount = i;

            // Notify progress
            const progress: QueueProgress = {
                current: i + 1,
                total: this.jobs.length,
                currentFilename: job.filename,
            };
            this.callbacks.onProgress?.(progress);
            await this.updateNotification(progress);

            console.log(`[Queue] Processing ${i + 1}/${this.jobs.length}: ${job.filename}`);

            try {
                const item = await this.processOneImage(job);
                job.status = 'done';
                job.resultItem = item;
                this.completedItems.push(item);
                this.callbacks.onItemComplete?.(item, i);
            } catch (err: any) {
                const errorMsg = err?.message || 'Unknown processing error';
                console.error(`[Queue] Failed ${job.filename}: ${errorMsg}`);
                job.status = 'failed';
                job.error = errorMsg;
                this.callbacks.onItemError?.(job.id, errorMsg, i);
            }

            // ── Memory Cleanup & GC Delay ────────────────────────────
            // Give the JS engine time to garbage-collect large buffers
            // before starting the next image
            if (i < this.jobs.length - 1) {
                await this.gcDelay();
            }
        }

        // ── Queue Complete ────────────────────────────────────────────
        this.isRunning = false;
        this.callbacks.onQueueComplete?.(this.completedItems);
        await this.dismissNotification();

        const failed = this.jobs.filter((j) => j.status === 'failed').length;
        console.log(
            `[Queue] Complete: ${this.completedItems.length} succeeded, ${failed} failed`,
        );
    }

    // ─── Single Image Pipeline ───────────────────────────────────────

    private async processOneImage(job: ProcessingJob): Promise<WardrobeItem> {
        // Step 1: On-device processing (BG removal + classification + color)
        const result: OnDeviceProcessingResult = await processClothingImageOnDevice(
            job.originalUri,
        );

        // Step 2: Determine final category
        let finalCategory: string | undefined = job.preferredCategory;
        if (
            !result.classification.isLowConfidence &&
            result.classification.category !== 'unclassified'
        ) {
            finalCategory = canonicalToBackend(result.classification.category);
        } else if (job.preferredCategory) {
            finalCategory = job.preferredCategory;
        }

        // Step 3: Save to WatermelonDB + local filesystem
        const newItem = await wardrobeLocal.addClothingItem(
            result,
            job.originalUri,
            job.filename,
            finalCategory,
        );

        // Step 4: Explicit memory release
        // The large rgbaPixels Uint8Array is the biggest memory consumer
        (result as any).processedImageUri = null;
        (result as any).colors = null;
        (result as any).classification = null;

        return {
            ...newItem,
            category: normalizeCategory(newItem.category),
        } as WardrobeItem;
    }

    // ─── Memory Management ───────────────────────────────────────────

    private gcDelay(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, GC_DELAY_MS));
    }

    // ─── Notification Helpers ────────────────────────────────────────

    private async showProcessingNotification(): Promise<void> {
        try {
            this.notificationId = await Notifications.scheduleNotificationAsync({
                identifier: NOTIFICATION_ID,
                content: {
                    title: 'Processing Images',
                    body: `Processing 1 of ${this.jobs.length}...`,
                    data: { type: 'processing' },
                    sticky: true,
                },
                trigger: null, // Show immediately
            });
        } catch (err) {
            console.warn('[Queue] Failed to show notification:', err);
        }
    }

    private async updateNotification(progress: QueueProgress): Promise<void> {
        try {
            await Notifications.scheduleNotificationAsync({
                identifier: NOTIFICATION_ID,
                content: {
                    title: 'Processing Images',
                    body: `Processing ${progress.current} of ${progress.total}...`,
                    data: { type: 'processing', ...progress },
                    sticky: true,
                },
                trigger: null,
            });
        } catch {
            // Non-critical
        }
    }

    private async dismissNotification(): Promise<void> {
        try {
            await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
        } catch {
            // Non-critical
        }
    }
}

// ─── Define Background Task ──────────────────────────────────────────────────
// Must be at module scope per expo-task-manager requirements.
// This keeps the JS thread alive when the app is backgrounded during processing.
TaskManager.defineTask(PROCESSING_TASK_NAME, async () => {
    // The actual processing is driven by the singleton queue instance.
    // This task definition ensures the JS runtime stays active.
    console.log('[TaskManager] Background task heartbeat for image processing');
});

// ─── Export Singleton ────────────────────────────────────────────────────────

export const processingQueue = new ImageProcessingQueue();
