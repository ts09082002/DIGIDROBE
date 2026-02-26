/**
 * API Service — handles all backend communication
 */
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

    // Upload clothing image
    async uploadClothingImage(imageUri: string, filename: string, mimeType?: string): Promise<UploadResult> {
        const formData = new FormData();
        formData.append('image', {
            uri: imageUri,
            type: mimeType || 'image/jpeg',
            name: filename || 'clothing.jpg',
        } as any);

        const response = await fetch(this.getFullUrl('/api/upload/clothing'), {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }

        const result: ApiResponse<UploadResult> = await response.json();
        return result.data;
    }

    // Create wardrobe item from upload result
    async createWardrobeItem(data: Partial<WardrobeItem>): Promise<WardrobeItem> {
        const response = await fetch(this.getFullUrl('/api/wardrobe'), {
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
        const url = this.getFullUrl(`/api/wardrobe${query ? `?${query}` : ''}`);
        const response = await fetch(url);
        const result: ApiResponse<WardrobeItem[]> = await response.json();
        return result.data;
    }

    // Toggle favorite
    async toggleFavorite(id: string): Promise<WardrobeItem> {
        const response = await fetch(this.getFullUrl(`/api/wardrobe/${id}/favorite`), {
            method: 'PATCH',
        });
        const result: ApiResponse<WardrobeItem> = await response.json();
        return result.data;
    }

    // Delete item
    async deleteItem(id: string): Promise<void> {
        await fetch(this.getFullUrl(`/api/wardrobe/${id}`), { method: 'DELETE' });
    }

    // Get stats
    async getStats(): Promise<WardrobeStats> {
        const response = await fetch(this.getFullUrl('/api/wardrobe/stats'));
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
