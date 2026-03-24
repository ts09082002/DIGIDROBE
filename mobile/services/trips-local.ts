/**
 * Local Trip data access layer using AsyncStorage.
 * Manages trip CRUD, day-by-day outfit planning, and packing checklist.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@vibecheck_trips';

export interface TripDay {
    date: string;           // ISO date YYYY-MM-DD
    itemIds: string[];      // wardrobe item IDs for this day's outfit
    packedItemIds: string[]; // subset of all trip items that are packed
}

export interface Trip {
    id: string;
    destination: string;
    occasion: string;       // casual, business, vacation, formal, wedding
    startDate: string;      // ISO date YYYY-MM-DD
    endDate: string;        // ISO date YYYY-MM-DD
    days: TripDay[];
    createdAt: string;      // ISO datetime
}

export interface PackingItem {
    itemId: string;
    packed: boolean;
    category?: string;
    dayIndices: number[];   // which days use this item
}

// ── Helpers ──────────────────────────────────────────────────────────────

function generateId(): string {
    return `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getDaysBetween(start: string, end: string): string[] {
    const days: string[] = [];
    const current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
        days.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return days;
}

// ── CRUD ─────────────────────────────────────────────────────────────────

async function loadTrips(): Promise<Trip[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

async function persistTrips(trips: Trip[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

export async function getTrips(): Promise<Trip[]> {
    const trips = await loadTrips();
    // Sort: upcoming first, then by start date
    return trips.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export async function getTripById(id: string): Promise<Trip | null> {
    const trips = await loadTrips();
    return trips.find(t => t.id === id) ?? null;
}

export async function createTrip(
    destination: string,
    startDate: string,
    endDate: string,
    occasion: string = 'casual',
): Promise<Trip> {
    const dates = getDaysBetween(startDate, endDate);
    const trip: Trip = {
        id: generateId(),
        destination,
        occasion,
        startDate,
        endDate,
        days: dates.map(date => ({ date, itemIds: [], packedItemIds: [] })),
        createdAt: new Date().toISOString(),
    };

    const trips = await loadTrips();
    trips.push(trip);
    await persistTrips(trips);
    return trip;
}

export async function updateTrip(id: string, updates: Partial<Pick<Trip, 'destination' | 'occasion'>>): Promise<Trip | null> {
    const trips = await loadTrips();
    const idx = trips.findIndex(t => t.id === id);
    if (idx === -1) return null;
    trips[idx] = { ...trips[idx], ...updates };
    await persistTrips(trips);
    return trips[idx];
}

export async function deleteTrip(id: string): Promise<void> {
    const trips = await loadTrips();
    await persistTrips(trips.filter(t => t.id !== id));
}

// ── Day Outfit Management ────────────────────────────────────────────────

export async function updateTripDay(
    tripId: string,
    dayIndex: number,
    itemIds: string[],
): Promise<Trip | null> {
    const trips = await loadTrips();
    const trip = trips.find(t => t.id === tripId);
    if (!trip || dayIndex < 0 || dayIndex >= trip.days.length) return null;
    trip.days[dayIndex].itemIds = itemIds;
    await persistTrips(trips);
    return trip;
}

export async function setAllDayOutfits(
    tripId: string,
    dayOutfits: string[][],  // array of itemIds[] per day
): Promise<Trip | null> {
    const trips = await loadTrips();
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return null;
    for (let i = 0; i < Math.min(dayOutfits.length, trip.days.length); i++) {
        trip.days[i].itemIds = dayOutfits[i];
    }
    await persistTrips(trips);
    return trip;
}

// ── Packing Checklist ────────────────────────────────────────────────────

export async function togglePacked(tripId: string, itemId: string): Promise<Trip | null> {
    const trips = await loadTrips();
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return null;

    // Packed status is stored at trip level (aggregated across days)
    // We store it in the first day's packedItemIds as a flat set
    const allPacked = new Set(trip.days[0]?.packedItemIds ?? []);
    if (allPacked.has(itemId)) {
        allPacked.delete(itemId);
    } else {
        allPacked.add(itemId);
    }
    // Store packed state on first day for simplicity
    if (trip.days[0]) {
        trip.days[0].packedItemIds = Array.from(allPacked);
    }
    await persistTrips(trips);
    return trip;
}

export function getPackingList(trip: Trip): PackingItem[] {
    const itemMap = new Map<string, PackingItem>();
    const packedSet = new Set(trip.days[0]?.packedItemIds ?? []);

    trip.days.forEach((day, dayIndex) => {
        for (const itemId of day.itemIds) {
            const existing = itemMap.get(itemId);
            if (existing) {
                existing.dayIndices.push(dayIndex);
            } else {
                itemMap.set(itemId, {
                    itemId,
                    packed: packedSet.has(itemId),
                    dayIndices: [dayIndex],
                });
            }
        }
    });

    return Array.from(itemMap.values());
}

// ── Utilities ────────────────────────────────────────────────────────────

export function getTripStatus(trip: Trip): 'upcoming' | 'ongoing' | 'completed' {
    const today = new Date().toISOString().split('T')[0];
    if (today < trip.startDate) return 'upcoming';
    if (today > trip.endDate) return 'completed';
    return 'ongoing';
}

export function getDaysUntil(trip: Trip): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(trip.startDate);
    start.setHours(0, 0, 0, 0);
    return Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getTripDuration(trip: Trip): number {
    return trip.days.length;
}
