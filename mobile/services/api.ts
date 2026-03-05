/**
 * API Service - handles all backend communication
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL } from '../constants/theme';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

interface UploadResult {
    id: string;
    originalFilename: string;
    originalUrl: string;
    processedUrl: string;
    category: string;
    mimeType: string;
    size: number;
    createdAt: string;
}

export interface WardrobeItem {
    id: string;
    originalFilename: string;
    originalUrl: string;
    processedUrl: string;
    category: string;
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
}

export interface WardrobeStats {
    totalItems: number;
    totalFavorites: number;
    categories: Record<string, number>;
}

class ApiService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    private getFullUrl(path: string): string {
        return `${this.baseUrl}${path}`;
    }

    private getBaseCandidates(): string[] {
        const candidates: string[] = [];

        const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
        if (envUrl) candidates.push(envUrl);
        if (API_BASE_URL) candidates.push(API_BASE_URL);

        const c: any = Constants;
        const hostUri =
            c?.expoConfig?.hostUri ||
            c?.manifest2?.extra?.expoGo?.debuggerHost ||
            c?.manifest?.debuggerHost;

        if (hostUri && typeof hostUri === 'string') {
            const host = hostUri.split(':')[0];
            candidates.push(`http://${host}:3000`);
        }

        if (Platform.OS === 'android') {
            candidates.push('http://10.0.2.2:3000');
        }

        candidates.push('http://127.0.0.1:3000');
        candidates.push('http://localhost:3000');

        return [...new Set(candidates)];
    }

    private isNetworkError(error: any): boolean {
        return `${error?.message || ''}`.includes('Network request failed');
    }

    private async resolveReachableBaseUrl(): Promise<string | null> {
        for (const candidate of this.getBaseCandidates()) {
            try {
                const res = await fetch(`${candidate}/api/wardrobe`);
                if (res.ok) {
                    this.baseUrl = candidate;
                    return candidate;
                }
            } catch {
                // try next candidate
            }
        }

        return null;
    }

    private async fetchWithRetry(path: string, init?: RequestInit): Promise<Response> {
        try {
            return await fetch(this.getFullUrl(path), init);
        } catch (error: any) {
            if (!this.isNetworkError(error)) throw error;

            const reachable = await this.resolveReachableBaseUrl();
            if (!reachable) throw error;

            return fetch(`${reachable}${path}`, init);
        }
    }

    // Upload clothing image
    async uploadClothingImage(imageUri: string, filename: string, mimeType?: string): Promise<UploadResult> {
        const formData = new FormData();
        formData.append('image', {
            uri: imageUri,
            type: mimeType || 'image/jpeg',
            name: filename || 'clothing.jpg',
        } as any);

        try {
            const response = await this.fetchWithRetry('/api/upload/clothing', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let message = 'Upload failed';
                try {
                    const error = await response.json();
                    message = error.message || message;
                } catch {
                    // keep default message if server did not return JSON
                }
                throw new Error(message);
            }

            const result: ApiResponse<UploadResult> = await response.json();
            return result.data;
        } catch (error: any) {
            if (this.isNetworkError(error)) {
                throw new Error(
                    `Cannot reach backend. Tried: ${this.getBaseCandidates().join(', ')}`,
                );
            }
            throw error;
        }
    }

    // Create wardrobe item from upload result
    async createWardrobeItem(data: Partial<WardrobeItem>): Promise<WardrobeItem> {
        const response = await this.fetchWithRetry('/api/wardrobe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

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
        const response = await this.fetchWithRetry(`/api/wardrobe${query ? `?${query}` : ''}`);
        const result: ApiResponse<WardrobeItem[]> = await response.json();
        return result.data;
    }

    // Toggle favorite
    async toggleFavorite(id: string): Promise<WardrobeItem> {
        const response = await this.fetchWithRetry(`/api/wardrobe/${id}/favorite`, {
            method: 'PATCH',
        });
        const result: ApiResponse<WardrobeItem> = await response.json();
        return result.data;
    }

    // Delete item
    async deleteItem(id: string): Promise<void> {
        await this.fetchWithRetry(`/api/wardrobe/${id}`, { method: 'DELETE' });
    }

    // Get stats
    async getStats(): Promise<WardrobeStats> {
        const response = await this.fetchWithRetry('/api/wardrobe/stats');
        const result: ApiResponse<WardrobeStats> = await response.json();
        return result.data;
    }

    // Get image URL
    getImageUrl(path: string): string {
        if (path.startsWith('http')) return path;
        return this.getFullUrl(path);
    }
}

export const api = new ApiService();
