import { EngineWardrobeItem, RecentUsageIndex } from './types';

function daysBetweenIso(aIso: string, bIso: string): number {
    const a = new Date(aIso);
    const b = new Date(bIso);
    const diffMs = Math.abs(b.getTime() - a.getTime());
    return diffMs / (1000 * 60 * 60 * 24);
}

export function outfitSignatureHash(items: EngineWardrobeItem[]): string {
    const sortedIds = [...items.map((i) => i.id)].sort();
    return sortedIds.join('|');
}

export function computeNoveltyScore(
    items: EngineWardrobeItem[],
    usage: RecentUsageIndex,
    today: string,
): number {
    if (!items.length) return 0;
    const todayIso = today;

    const signature = outfitSignatureHash(items);
    const lastOutfitDate = usage.recentOutfits[signature];
    if (lastOutfitDate) {
        const daysAgo = daysBetweenIso(lastOutfitDate, todayIso);
        if (daysAgo < 7) {
            return -Infinity;
        }
    }

    let penalty = 0;
    for (const item of items) {
        const lastWear = usage.recentItemUsage[item.id];
        if (!lastWear) continue;
        const daysAgo = daysBetweenIso(lastWear, todayIso);
        if (daysAgo < 1) {
            penalty += 3;
        } else if (daysAgo < 3) {
            penalty += 1.5;
        }
    }

    return -penalty;
}

