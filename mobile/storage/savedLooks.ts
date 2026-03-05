import AsyncStorage from '@react-native-async-storage/async-storage';

export type SavedLookSource = 'ai' | 'manual';

export interface SavedLook {
    id: string;
    name?: string;
    itemIds: string[];
    createdAt: string;
    source: SavedLookSource;
}

const STORAGE_KEY = 'saved_looks_v1';

export async function getSavedLooks(): Promise<SavedLook[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed as SavedLook[];
    } catch (error) {
        console.warn('Failed to load saved looks', error);
        return [];
    }
}

export async function saveLook(look: SavedLook): Promise<void> {
    try {
        const existing = await getSavedLooks();
        const updated = [look, ...existing.filter((l) => l.id !== look.id)];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.warn('Failed to save look', error);
    }
}

export async function deleteLook(id: string): Promise<void> {
    try {
        const existing = await getSavedLooks();
        const updated = existing.filter((l) => l.id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.warn('Failed to delete look', error);
    }
}

