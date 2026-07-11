/**
 * Sequential image processing job queue.
 *
 * Processes one image at a time (background removal + ML classification +
 * color extraction) to avoid overwhelming mobile GPU/CPU with concurrent
 * heavy operations.
 *
 * Features:
 * - Singleton queue — safe to call enqueue() from anywhere
 * - Sequential worker: picks first queued job → processes → picks next
 * - Per-job error isolation: failed jobs are marked and skipped, queue continues
 * - 300 ms GC pause between jobs to allow memory reclamation
 * - Progress callbacks fired on the JS thread for UI updates
 * - AppState-aware: processing continues when app is backgrounded
 */

import { AppState, AppStateStatus } from 'react-native';
import { processClothingImageOnDevice } from './image-processor';
import * as wardrobeLocal from './wardrobe-local';
import { normalizeCategory } from '../constants/categories';
import { WardrobeItem } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

export interface ProcessingJob {
    id: string;
    originalUri: string;
    filename: string;
    preferredCategory?: string;
    status: JobStatus;
}

export interface QueueCallbacks {
    /** Called after each individual job completes (success or failure). */
    onProgress: (current: number, total: number) => void;
    /** Called when a job finishes successfully with the saved WardrobeItem. */
    onItemComplete: (item: WardrobeItem) => void;
    /** Called when all jobs in the batch have been processed. */
    onQueueComplete: (items: WardrobeItem[]) => void;
    /** Called when a specific job fails; queue continues to the next. */
    onError: (jobId: string, error: Error) => void;
}

// ─── Singleton State ──────────────────────────────────────────────────────────

let jobs: ProcessingJob[] = [];
let isRunning = false;
let callbacks: QueueCallbacks | null = null;
let completedItems: WardrobeItem[] = [];
let processedCount = 0;
let batchTotal = 0;

// AppState subscription — ensures we resume if the app comes back to foreground
// while the worker is somehow stalled (edge case, but defensive).
let appStateSub: ReturnType<typeof AppState.addEventListener> | null = null;

function ensureAppStateListener() {
    if (appStateSub) return;
    appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
        // If coming back to active and queue has pending jobs, nudge the worker.
        if (nextState === 'active' && !isRunning && jobs.some(j => j.status === 'queued')) {
            runWorker();
        }
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueue a batch of assets for sequential processing.
 * Any previously running queue is replaced by this new batch.
 *
 * @param assets     Array of { uri, filename, preferredCategory? }
 * @param cbs        Event callbacks for the caller to react to progress
 */
export function enqueueAssets(
    assets: Array<{ uri: string; filename: string; preferredCategory?: string }>,
    cbs: QueueCallbacks,
): void {
    // Reset state for the new batch
    jobs = assets.map((a, idx) => ({
        id: `job_${Date.now()}_${idx}`,
        originalUri: a.uri,
        filename: a.filename,
        preferredCategory: a.preferredCategory,
        status: 'queued' as JobStatus,
    }));
    callbacks = cbs;
    completedItems = [];
    processedCount = 0;
    batchTotal = jobs.length;

    ensureAppStateListener();

    if (!isRunning) {
        runWorker();
    }
}

/** Returns a snapshot of the current queue (for debugging / resuming UI state). */
export function getQueueSnapshot(): { jobs: ProcessingJob[]; processedCount: number; total: number } {
    return { jobs: [...jobs], processedCount, total: batchTotal };
}

/** Cancel any running queue and reset state. */
export function cancelQueue(): void {
    jobs = [];
    isRunning = false;
    callbacks = null;
    completedItems = [];
    processedCount = 0;
    batchTotal = 0;
}

// ─── Worker Loop ──────────────────────────────────────────────────────────────

async function runWorker(): Promise<void> {
    isRunning = true;

    while (true) {
        const job = jobs.find(j => j.status === 'queued');
        if (!job) break;

        job.status = 'processing';

        try {
            // Force garbage collection if available before starting a heavy job
            // Using type assertion to avoid TypeScript error on global
            if (typeof (global as any).gc === 'function') {
                (global as any).gc();
            }

            // Enable low memory mode if processing a large batch (> 10 items)
            const isLowMemoryMode = batchTotal > 10;
            const item = await processJob(job, isLowMemoryMode);
            job.status = 'done';
            processedCount++;
            completedItems.push(item);

            callbacks?.onItemComplete(item);
            callbacks?.onProgress(processedCount, batchTotal);
        } catch (err: any) {
            job.status = 'failed';
            processedCount++;

            callbacks?.onError(job.id, err instanceof Error ? err : new Error(String(err)));
            callbacks?.onProgress(processedCount, batchTotal);
        }

        // 800 ms pause to let GC aggressively reclaim memory between heavy jobs
        await sleep(800);
    }

    isRunning = false;

    // Clean up temporary cache files
    try {
        const { cleanupTempFiles } = require('./local-image-storage');
        await cleanupTempFiles();
    } catch (e) {
        console.warn('[Queue] Failed to cleanup temp files:', e);
    }

    // All done — fire the completion callback
    if (callbacks && processedCount >= batchTotal) {
        callbacks.onQueueComplete([...completedItems]);
    }
}

async function processJob(job: ProcessingJob, lowMemoryMode: boolean = false): Promise<WardrobeItem> {
    console.log(`[Queue] Processing job ${job.id}: ${job.filename} (Low mem mode: ${lowMemoryMode})`);

    const result = await processClothingImageOnDevice(job.originalUri, lowMemoryMode);

    let finalCategory = job.preferredCategory;
    if (
        !result.classification.isLowConfidence &&
        result.classification.category !== 'unclassified'
    ) {
        // ML Kit gave a confident result — use it
        const { canonicalToBackend } = await import('./ml-classifier');
        finalCategory = canonicalToBackend(result.classification.category);
    }

    const newItem = await wardrobeLocal.addClothingItem(
        result,
        job.originalUri,
        job.filename,
        finalCategory,
    );

    return {
        ...newItem,
        category: normalizeCategory(newItem.category),
    } as WardrobeItem;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
