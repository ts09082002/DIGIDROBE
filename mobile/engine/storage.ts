import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnlineLearningWeights, RecentUsageIndex, UserInteractionEvent, UserStyleProfile } from './types';
import { buildUserStyleProfile, createOnlineWeights } from './personalization';

const EVENTS_KEY = 'stylist_user_events_v1';
const USAGE_INDEX_KEY = 'stylist_usage_index_v1';
const PROFILE_CACHE_KEY = 'stylist_profile_cache_v1';
const ONLINE_WEIGHTS_KEY = 'stylist_online_weights_v1';

export async function loadUserEvents(): Promise<UserInteractionEvent[]> {
    try {
        const raw = await AsyncStorage.getItem(EVENTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as UserInteractionEvent[];
    } catch {
        return [];
    }
}

export async function appendUserEvent(event: UserInteractionEvent): Promise<void> {
    const existing = await loadUserEvents();
    const updated = [event, ...existing].slice(0, 500);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
}

export async function loadUsageIndex(): Promise<RecentUsageIndex> {
    try {
        const raw = await AsyncStorage.getItem(USAGE_INDEX_KEY);
        if (!raw) {
            return { recentItemUsage: {}, recentOutfits: {} };
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return { recentItemUsage: {}, recentOutfits: {} };
        }
        return {
            recentItemUsage: parsed.recentItemUsage ?? {},
            recentOutfits: parsed.recentOutfits ?? {},
        };
    } catch {
        return { recentItemUsage: {}, recentOutfits: {} };
    }
}

export async function saveUsageIndex(index: RecentUsageIndex): Promise<void> {
    await AsyncStorage.setItem(USAGE_INDEX_KEY, JSON.stringify(index));
}

export async function loadOnlineWeights(): Promise<OnlineLearningWeights> {
    try {
        const raw = await AsyncStorage.getItem(ONLINE_WEIGHTS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return parsed as OnlineLearningWeights;
            }
        }
    } catch {
        // ignore
    }
    return createOnlineWeights();
}

export async function saveOnlineWeights(weights: OnlineLearningWeights): Promise<void> {
    await AsyncStorage.setItem(ONLINE_WEIGHTS_KEY, JSON.stringify(weights));
}

export async function loadOrBuildUserProfile(): Promise<UserStyleProfile> {
    let profile: UserStyleProfile | null = null;

    try {
        const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as UserStyleProfile;
            if (parsed && typeof parsed === 'object') {
                profile = parsed;
            }
        }
    } catch {
        // ignore
    }

    if (!profile) {
        const events = await loadUserEvents();
        profile = buildUserStyleProfile(events);
        await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    }

    // Merge in online learning weights
    const onlineWeights = await loadOnlineWeights();
    return { ...profile, onlineWeights };
}

export async function invalidateProfileCache(): Promise<void> {
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
}

