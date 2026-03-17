import AsyncStorage from '@react-native-async-storage/async-storage';
import { WardrobeItem } from '../services/api';

export interface TripOutfit {
    dayNumber: number;
    title: string;
    weatherLabel: string;
    items: WardrobeItem[];
}

export interface PackingListItem {
    id: string; // unique item id based on wardrobe item id
    item: WardrobeItem;
    packed: boolean;
}

export interface TripPlan {
    id: string;
    name: string;
    destination: string;
    startDate: string; // ISO
    endDate: string; // ISO
    daysCount: number;
    tripType: string;
    mood: string;
    dailyOutfits: TripOutfit[];
    packingList: PackingListItem[];
    missingCategories: string[];
}

const TRIPS_STORAGE_KEY = '@wardora_trip_plans';

export async function getTripPlans(): Promise<TripPlan[]> {
    try {
        const data = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);
        if (data) return JSON.parse(data);
    } catch (e) {
        console.warn('Error reading trip plans:', e);
    }
    return [];
}

export async function saveTripPlan(trip: TripPlan): Promise<void> {
    try {
        const existing = await getTripPlans();
        const index = existing.findIndex(t => t.id === trip.id);
        if (index >= 0) {
            existing[index] = trip;
        } else {
            existing.unshift(trip);
        }
        await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
        console.warn('Error saving trip plan:', e);
    }
}

export async function updatePackingStatus(tripId: string, itemId: string, packed: boolean): Promise<void> {
    try {
        const existing = await getTripPlans();
        const tripIndex = existing.findIndex(t => t.id === tripId);
        if (tripIndex >= 0) {
            const listIndex = existing[tripIndex].packingList.findIndex(l => l.id === itemId);
            if (listIndex >= 0) {
                existing[tripIndex].packingList[listIndex].packed = packed;
                await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(existing));
            }
        }
    } catch (e) {
        console.warn('Error updating packing status:', e);
    }
}

export async function markAllPacked(tripId: string): Promise<void> {
    try {
        const existing = await getTripPlans();
        const tripIndex = existing.findIndex(t => t.id === tripId);
        if (tripIndex >= 0) {
            existing[tripIndex].packingList.forEach(l => l.packed = true);
            await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(existing));
        }
    } catch (e) {
        console.warn('Error marking all packed:', e);
    }
}

export async function deleteTripPlan(tripId: string): Promise<void> {
    try {
        const existing = await getTripPlans();
        const filtered = existing.filter(t => t.id !== tripId);
        await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.warn('Error deleting trip plan:', e);
    }
}
