/**
 * API Service — handles all backend communication
 */
import { API_BASE_URL } from '../constants/theme';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

interface UploadResult extends WardrobeItem { }

export interface WardrobeItem {
    id: string;
    originalFilename: string;
    originalUrl: string;
    processedUrl: string;
    category: string;
    /** Sub-category from ML Kit / Vision API (e.g. 'jeans', 't_shirt') */
    subCategory?: string;
    name: string;
    brand: string;
    color: string;
    season: string[];
    occasion: string[];
    isFavorite: boolean;
    mimeType: string;
    size: number;
    createdAt: string;
    updatedAt: string;
    status: string;
    /** True when AI classification confidence was below 0.4 */
    isLowConfidence?: boolean;
    /** JSON string of [{hex, name}] palette entries from Palette API */
    colorPalette?: string;
    /** Raw ML labels from Google Cloud Vision API */
    mlLabels?: string[];
}

export interface WardrobeStats {
    totalItems: number;
    categoryCounts: Record<string, number>;
    colorCounts: Record<string, number>;
}

export interface OOTD {
    id: string;
    date: string;
    itemIds: string[];
    notes: string;
    createdAt: string;
    updatedAt: string;
}

export interface OOTDStats {
    mostWorn: { itemId: string; count: number }[];
    leastWorn: { itemId: string; count: number }[];
}

export interface StylistSuggestion {
    suggestedOutfit: WardrobeItem[];
    alternativeOutfits: Array<{
        id: string;
        name: string;
        note: string;
        items: WardrobeItem[];
        score: number;
    }>;
    favorites: WardrobeItem[];
    stats: {
        totalItems: number;
        totalFavorites: number;
        categories: Record<string, number>;
    };
}

export interface StyleProfilePayload {
    bodyType?: 'Slim' | 'Athletic' | 'Average' | 'Heavy' | null;
    skinTone?: 'Light' | 'Medium' | 'Tan' | 'Dark' | null;
    height?: number;
    waistSize?: string;
    stylePreference?: 'Casual' | 'Streetwear' | 'Formal' | 'Minimal' | null;
}

export interface BodyPosePoint {
    x: number;
    y: number;
}

export interface BodyPose {
    leftShoulder: BodyPosePoint;
    rightShoulder: BodyPosePoint;
    leftHip: BodyPosePoint;
    rightHip: BodyPosePoint;
    leftAnkle: BodyPosePoint;
    rightAnkle: BodyPosePoint;
    torsoAngleDeg: number;
}

export interface BodyPhotoUploadResult {
    id: string;
    originalFilename: string;
    originalUrl: string;
    processedUrl: string;
    mimeType: string;
    size: number;
    createdAt: string;
    status: 'processing' | 'done' | 'failed';
    bodyBox?: {
        left: number;
        top: number;
        width: number;
        height: number;
        imageWidth: number;
        imageHeight: number;
    };
    pose?: BodyPose;
}

export interface TryOnPreviewResult {
    previewUrl: string;
    bodyPhotoUrl: string;
    outfitItems: WardrobeItem[];
    suggestedOutfit: WardrobeItem[];
    note: string;
    mode: 'local-compose';
    bodyBox?: BodyPhotoUploadResult['bodyBox'];
    pose?: BodyPose;
}

class ApiService {
    private async attachAuthHeader(headers: Headers, forceRefresh = false): Promise<void> {
        try {
            const { getIdToken } = require('./auth');
            const token = await getIdToken(forceRefresh);
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
        } catch (err) {
            console.warn('Could not get auth token for request:', err);
        }
    }

    private async fetch(url: string, init?: RequestInit, timeoutMs = 15000, retries = 1): Promise<Response> {
        let lastError: any;
        for (let attempt = 0; attempt <= retries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const headers = new Headers(init?.headers);
                headers.set('Bypass-Tunnel-Reminder', 'true');
                await this.attachAuthHeader(headers);

                const response = await fetch(url, {
                    ...init,
                    headers,
                    signal: controller.signal,
                });

                if (response.status === 401 && attempt < retries) {
                    await this.attachAuthHeader(headers, true);
                    const retryResponse = await fetch(url, {
                        ...init,
                        headers,
                        signal: controller.signal,
                    });
                    if (retryResponse.status !== 401) {
                        return retryResponse;
                    }
                }

                return response;
            } catch (err: any) {
                lastError = err;
                if (attempt < retries) {
                    console.log(`[API] Fetch failed (${err.message || err}). Retrying in 1000ms (Attempt ${attempt + 1}/${retries})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } finally {
                clearTimeout(timeoutId);
            }
        }
        throw lastError;
    }

    private baseUrl: string;

    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    private getFullUrl(path: string): string {
        return `${this.baseUrl}${path}`;
    }

    // Upload clothing image
    async uploadClothingImage(
        imageUri: string,
        filename: string,
        mimeType?: string,
        category?: string,
        mlLabels?: string[],
        subCategory?: string,
    ): Promise<UploadResult> {
        const formData = new FormData();
        formData.append('image', {
            uri: imageUri,
            type: mimeType || 'image/jpeg',
            name: filename || 'clothing.jpg',
        } as any);
        if (category) {
            formData.append('category', category);
        }
        if (subCategory) {
            formData.append('subCategory', subCategory);
        }
        if (mlLabels && mlLabels.length > 0) {
            formData.append('mlLabels', JSON.stringify(mlLabels));
        }
        try {
            const response = await this.fetch(this.getFullUrl('/api/upload/clothing'), {
                method: 'POST',
                body: formData,
                // Let React Native set multipart boundary automatically.
            });

            if (!response.ok) {
                let message = 'Upload failed';
                try {
                    const error = await response.json();
                    message = error.message || message;
                } catch {
                    // Keep default message if server didn't return JSON.
                }
                throw new Error(message);
            }

            const result: ApiResponse<UploadResult> = await response.json();
            return result.data;
        } catch (error: any) {
            if (__DEV__ && error?.message?.includes('Network request failed')) {
                console.error(`Cannot reach backend at ${this.baseUrl}.`);
            }
            throw error;
        }
    }

    // Upload a clothing image that was already processed on-device (bg removed, colors extracted)
    async uploadProcessedClothingImage(
        processedUri: string,
        originalUri: string,
        filename: string,
        category?: string,
        mlLabels?: string[],
        subCategory?: string,
        colorPalette?: { hex: string; name: string }[],
    ): Promise<UploadResult> {
        const formData = new FormData();
        formData.append('image', {
            uri: processedUri,
            type: 'image/png',
            name: 'processed.png',
        } as any);
        formData.append('original', {
            uri: originalUri,
            type: 'image/jpeg',
            name: filename || 'original.jpg',
        } as any);
        formData.append('processedOnDevice', 'true');
        if (category) formData.append('category', category);
        if (subCategory) formData.append('subCategory', subCategory);
        if (mlLabels && mlLabels.length > 0) {
            formData.append('mlLabels', JSON.stringify(mlLabels));
        }
        if (colorPalette && colorPalette.length > 0) {
            formData.append('colorPalette', JSON.stringify(colorPalette));
        }
        try {
            const response = await this.fetch(this.getFullUrl('/api/upload/clothing'), {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let message = 'Upload failed';
                try {
                    const error = await response.json();
                    message = error.message || message;
                } catch {
                    // Keep default message if server didn't return JSON.
                }
                throw new Error(message);
            }

            const result: ApiResponse<UploadResult> = await response.json();
            return result.data;
        } catch (error: any) {
            if (__DEV__ && error?.message?.includes('Network request failed')) {
                console.error(`Cannot reach backend at ${this.baseUrl}.`);
            }
            throw error;
        }
    }

    // Create wardrobe item from upload result
    async createWardrobeItem(data: Partial<WardrobeItem>): Promise<WardrobeItem> {
        const response = await this.fetch(this.getFullUrl('/api/wardrobe'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Failed to create wardrobe item: ${response.status}`);
        }

        const result: ApiResponse<WardrobeItem> = await response.json();
        return result.data;
    }

    // Get all wardrobe items
    async getWardrobeItems(params?: {
        category?: string;
        search?: string;
        favorite?: string;
    }): Promise<WardrobeItem[]> {
        const searchParams = new URLSearchParams();
        if (params?.category) searchParams.set('category', params.category);
        if (params?.search) searchParams.set('search', params.search);
        if (params?.favorite) searchParams.set('favorite', params.favorite);

        const query = searchParams.toString();
        const url = this.getFullUrl(`/api/wardrobe${query ? `?${query}` : ''}`);
        const response = await this.fetch(url);
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        const result: ApiResponse<WardrobeItem[]> = await response.json();
        return result.data ?? [];
    }

    // Get single wardrobe item
    async getWardrobeItem(id: string): Promise<WardrobeItem> {
        const response = await this.fetch(this.getFullUrl(`/api/wardrobe/${id}`));
        if (!response.ok) {
            throw new Error(`Failed to get wardrobe item: ${response.status}`);
        }
        const result: ApiResponse<WardrobeItem> = await response.json();
        return result.data;
    }

    // Toggle favorite
    async toggleFavorite(id: string): Promise<WardrobeItem> {
        const response = await this.fetch(this.getFullUrl(`/api/wardrobe/${id}/favorite`), {
            method: 'PATCH',
        });
        if (!response.ok) {
            throw new Error(`Failed to toggle favorite: ${response.status}`);
        }
        const result: ApiResponse<WardrobeItem> = await response.json();
        return result.data;
    }

    // Update wardrobe item (e.g., rename)
    async updateWardrobeItem(id: string, data: Partial<WardrobeItem>): Promise<WardrobeItem> {
        const response = await this.fetch(this.getFullUrl(`/api/wardrobe/${id}`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`Failed to update wardrobe item: ${response.status}`);
        }
        const result: ApiResponse<WardrobeItem> = await response.json();
        return result.data;
    }

    // Delete item
    async deleteItem(id: string): Promise<void> {
        const response = await this.fetch(this.getFullUrl(`/api/wardrobe/${id}`), { method: 'DELETE' });
        if (!response.ok) {
            throw new Error(`Failed to delete item: ${response.status}`);
        }
    }

    // Get stats
    async getStats(): Promise<WardrobeStats> {
        const response = await this.fetch(this.getFullUrl('/api/wardrobe/stats'));
        const result: ApiResponse<WardrobeStats> = await response.json();
        return result.data;
    }

    // Get image URL
    getImageUrl(path: string): string {
        if (path.startsWith('http')) return path;
        return this.getFullUrl(path);
    }

    // Database synchronization methods
    async syncPull(lastPulledAt: number | null | undefined): Promise<{ changes: any; timestamp: number }> {
        const response = await this.fetch(this.getFullUrl('/api/sync/pull'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastPulledAt: lastPulledAt ?? 0 }),
        }, 30000, 2);
        if (!response.ok) {
            throw new Error(`Sync pull failed: ${response.status}`);
        }
        return response.json();
    }

    async syncPush(changes: any, lastPulledAt: number | null | undefined): Promise<void> {
        const response = await this.fetch(this.getFullUrl('/api/sync/push'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ changes, lastPulledAt: lastPulledAt ?? 0 }),
        }, 30000, 2);
        if (!response.ok) {
            throw new Error(`Sync push failed: ${response.status}`);
        }
    }

    // --- Calendar / OOTD ---

    async getOOTDByMonth(year: number, month: number): Promise<OOTD[]> {
        try {
            const response = await this.fetch(`${this.baseUrl}/api/calendar?year=${year}&month=${month}`);
            if (!response.ok) throw new Error('Failed to fetch OOTD');
            const result = await response.json();
            return result.data as OOTD[];
        } catch (error) {
            console.error('Error fetching calendar:', error);
            return [];
        }
    }

    async getOOTDStats(days: number = 30): Promise<OOTDStats | null> {
        try {
            const response = await this.fetch(`${this.baseUrl}/api/calendar/stats?days=${days}`);
            if (!response.ok) throw new Error('Failed to fetch OOTD stats');
            const result = await response.json();
            return result.data as OOTDStats;
        } catch (error) {
            console.error('Error fetching calendar stats:', error);
            return null;
        }
    }

    async saveOOTD(date: string, itemIds: string[], notes: string = ''): Promise<OOTD> {
        try {
            const response = await this.fetch(`${this.baseUrl}/api/calendar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, itemIds, notes }),
            });
            if (!response.ok) throw new Error('Failed to save OOTD');
            const result = await response.json();
            return result.data as OOTD;
        } catch (error) {
            console.error('Error saving OOTD:', error);
            throw error;
        }
    }

    // --- Travel / Packing ---

    async generatePackingList(destination: string, days: number): Promise<WardrobeItem[]> {
        try {
            const response = await this.fetch(`${this.baseUrl}/api/packing/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination, days }),
            });
            if (!response.ok) throw new Error('Failed to generate packing list');
            const result = await response.json();
            return result.data as WardrobeItem[];
        } catch (error) {
            console.error('Error generating packing list:', error);
            throw error;
        }
    }

    // --- AI Stylist ---

    async getStylistSuggestion(): Promise<StylistSuggestion> {
        try {
            const response = await this.fetch(`${this.baseUrl}/api/packing/stylist`);
            if (!response.ok) throw new Error('Failed to fetch stylist suggestion');
            const result = await response.json();
            return result.data as StylistSuggestion;
        } catch (error) {
            console.warn('Error fetching stylist suggestion:', error);
            throw error;
        }
    }

    async uploadBodyPhoto(
        imageUri: string,
        filename: string,
        mimeType?: string,
    ): Promise<BodyPhotoUploadResult> {
        const formData = new FormData();
        formData.append('image', {
            uri: imageUri,
            type: mimeType || 'image/jpeg',
            name: filename || 'body-photo.jpg',
        } as any);

        const response = await this.fetch(this.getFullUrl('/api/upload/body-photo'), {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            let message = 'Body photo upload failed';
            try {
                const error = await response.json();
                message = error.message || message;
            } catch {
                // keep default
            }
            throw new Error(message);
        }

        const result: ApiResponse<BodyPhotoUploadResult> = await response.json();
        return result.data;
    }

    async getPersonalizedStylistSuggestion(profile: StyleProfilePayload): Promise<StylistSuggestion> {
        try {
            const response = await this.fetch(`${this.baseUrl}/api/packing/stylist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
            });
            if (!response.ok) throw new Error('Failed to fetch personalized stylist suggestion');
            const result = await response.json();
            return result.data as StylistSuggestion;
        } catch (error) {
            console.warn('Error fetching personalized stylist suggestion:', error);
            throw error;
        }
    }

    async generateTryOnPreview(
        bodyPhotoUrl: string,
        itemIds?: string[],
        profile?: StyleProfilePayload,
    ): Promise<TryOnPreviewResult> {
        const response = await this.fetch(`${this.baseUrl}/api/packing/try-on/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bodyPhotoUrl,
                itemIds,
                profile,
            }),
        });

        if (!response.ok) {
            let message = 'Failed to generate try-on preview';
            try {
                const error = await response.json();
                message = error.message || message;
            } catch {
                // Keep default message.
            }
            throw new Error(message);
        }

        const result: ApiResponse<TryOnPreviewResult> = await response.json();
        return result.data;
    }
}

export const api = new ApiService();

