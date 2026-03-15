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

import { auth } from '../config/firebase';

class ApiService {
    private async fetch(url: string, init?: RequestInit): Promise<Response> {
        const headers = new Headers(init?.headers);
        headers.set('Bypass-Tunnel-Reminder', 'true');
        
        const currentUser = auth.currentUser;
        if (currentUser) {
            headers.set('x-user-id', currentUser.uid);
            console.log(`[API] Fetch: ${url} (User: ${currentUser.uid.substring(0, 6)}...)`);
        } else {
            console.log(`[API] Fetch: ${url} (Anonymous)`);
        }
        
        return fetch(url, { ...init, headers });
    }

    private baseUrl: string;

    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    private getFullUrl(path: string): string {
        return `${this.baseUrl}${path}`;
    }

    /**
     * Checks response status and parses the JSON body.
     * Throws a descriptive Error on non-2xx or unsuccessful API responses.
     */
    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            let message = `Request failed (${response.status})`;
            try {
                const error = await response.json();
                message = error.message || message;
            } catch {
                // Server didn't return JSON — keep default message.
            }
            throw new Error(message);
        }

        const result: ApiResponse<T> = await response.json();
        if (result && result.success === false) {
            throw new Error(result.message || 'Request failed');
        }
        return result.data;
    }

    /**
     * Re-throws with a user-friendly message when the backend is unreachable.
     */
    private handleNetworkError(error: any): never {
        if (error?.message?.includes('Network request failed')) {
            throw new Error(
                `Cannot reach backend at ${this.baseUrl}. Make sure the server is running and your device can access this IP.`,
            );
        }
        throw error;
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
            if (error?.message?.includes('Network request failed')) {
                throw new Error(
                    `Cannot reach backend at ${this.baseUrl}. Make sure backend is running and phone/emulator can access this IP.`,
                );
            }
            throw error;
        }
    }

    // Create wardrobe item from upload result
    async createWardrobeItem(data: Partial<WardrobeItem>): Promise<WardrobeItem> {
        try {
            const response = await this.fetch(this.getFullUrl('/api/wardrobe'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return await this.handleResponse<WardrobeItem>(response);
        } catch (error: any) {
            this.handleNetworkError(error);
        }
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
        const result: ApiResponse<WardrobeItem[]> = await response.json();
        return result?.data || [];
    }

    // Get single wardrobe item
    async getWardrobeItem(id: string): Promise<WardrobeItem> {
        try {
            const response = await this.fetch(this.getFullUrl(`/api/wardrobe/${id}`));
            return await this.handleResponse<WardrobeItem>(response);
        } catch (error: any) {
            this.handleNetworkError(error);
        }
    }

    // Toggle favorite
    async toggleFavorite(id: string): Promise<WardrobeItem> {
        try {
            const response = await this.fetch(this.getFullUrl(`/api/wardrobe/${id}/favorite`), {
                method: 'PATCH',
            });
            return await this.handleResponse<WardrobeItem>(response);
        } catch (error: any) {
            this.handleNetworkError(error);
        }
    }

    // Update wardrobe item (e.g., rename)
    async updateWardrobeItem(id: string, data: Partial<WardrobeItem>): Promise<WardrobeItem> {
        try {
            const response = await this.fetch(this.getFullUrl(`/api/wardrobe/${id}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return await this.handleResponse<WardrobeItem>(response);
        } catch (error: any) {
            this.handleNetworkError(error);
        }
    }

    // Delete item
    async deleteItem(id: string): Promise<void> {
        try {
            const response = await this.fetch(this.getFullUrl(`/api/wardrobe/${id}`), { method: 'DELETE' });
            if (!response.ok) {
                let message = `Delete failed (${response.status})`;
                try {
                    const error = await response.json();
                    message = error.message || message;
                } catch {
                    // Keep default message.
                }
                throw new Error(message);
            }
        } catch (error: any) {
            this.handleNetworkError(error);
        }
    }

    // Claim anonymous items
    async claimGuestItems(): Promise<{ count: number }> {
        try {
            const response = await this.fetch(this.getFullUrl('/api/wardrobe/claim'), {
                method: 'POST',
            });
            return await this.handleResponse<{ count: number }>(response);
        } catch (error: any) {
            this.handleNetworkError(error);
        }
    }

    // Get stats
    async getStats(): Promise<WardrobeStats> {
        try {
            const response = await this.fetch(this.getFullUrl('/api/wardrobe/stats'));
            return await this.handleResponse<WardrobeStats>(response);
        } catch (error: any) {
            this.handleNetworkError(error);
        }
    }

    // Get image URL
    getImageUrl(path: string): string {
        if (path.startsWith('http')) return path;
        return this.getFullUrl(path);
    }

    // --- Calendar / OOTD ---

    async getOOTDByMonth(year: number, month: number): Promise<OOTD[]> {
        try {
            const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
            const response = await this.fetch(this.getFullUrl(`/api/calendar?month=${monthStr}`));
            if (!response.ok) throw new Error('Failed to fetch OOTD');
            const result = await response.json();
            return (result?.data || []) as OOTD[];
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

    // Notifications
    async getNotifications(): Promise<NotificationDto[]> {
        try {
            const response = await this.fetch(this.getFullUrl('/api/notifications'));
            const data = await this.handleResponse<NotificationDto[]>(response);
            return data ?? [];
        } catch (error: any) {
            // Non-critical — return empty list rather than crashing the UI
            console.warn('Failed to fetch notifications:', error?.message);
            return [];
        }
    }

    async deleteNotification(id: string): Promise<void> {
        try {
            const response = await this.fetch(this.getFullUrl(`/api/notifications/${id}`), {
                method: 'DELETE',
            });
            if (!response.ok) {
                let message = `Delete notification failed (${response.status})`;
                try {
                    const error = await response.json();
                    message = error.message || message;
                } catch {
                    // Keep default message.
                }
                throw new Error(message);
            }
        } catch (error: any) {
            this.handleNetworkError(error);
        }
    }
}

export const api = new ApiService();

export interface NotificationDto {
    id: string;
    userId: string;
    type: 'daily_outfit' | 'upload';
    title: string;
    message: string;
    createdAt: string;
    read: boolean;
    metadata?: {
        outfitItemIds?: string[];
        quote?: string;
    };
}

