import { WardrobeItem } from '../services/api';
import { TripPlan, TripOutfit, PackingListItem } from '../storage/tripPlans';
import { normalizeCategory } from '../constants/categories';

interface GenerateTripOptions {
    destination: string;
    startDate: Date;
    endDate: Date;
    tripType: string; // 'Beach', 'Business', 'City', 'Trekking'
    mood: string;     // 'Comfortable', 'Fashionable', 'Minimalist'
}

function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function generateOfflineTripPlan(wardrobe: WardrobeItem[], options: GenerateTripOptions): TripPlan {
    const diffTime = Math.abs(options.endDate.getTime() - options.startDate.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive days

    // Group items
    const tops = shuffleArray(wardrobe.filter(i => normalizeCategory(i.category) === 'topwear'));
    const bottoms = shuffleArray(wardrobe.filter(i => normalizeCategory(i.category) === 'bottomwear'));
    const outerwears = shuffleArray(wardrobe.filter(i => normalizeCategory(i.category) === 'outerwear'));
    const footwears = shuffleArray(wardrobe.filter(i => normalizeCategory(i.category) === 'footwear'));
    const accessories = shuffleArray(wardrobe.filter(i => normalizeCategory(i.category) === 'accessories'));

    const dailyOutfits: TripOutfit[] = [];
    const usedItemMap = new Map<string, WardrobeItem>();

    // Analyze Missing Items based on Trip Type
    const missingCategories: string[] = [];
    if (options.tripType === 'Beach' && footwears.every(f => !f.name?.toLowerCase().includes('sandal') && !f.subCategory?.toLowerCase().includes('sandal'))) {
        missingCategories.push('Sandals / Flip-flops');
    }
    if (options.tripType === 'Trekking' && outerwears.length === 0) {
        missingCategories.push('Warm Jacket / Windbreaker');
    }
    if (options.tripType === 'Trekking' && footwears.every(f => !f.name?.toLowerCase().includes('boot') && !f.subCategory?.toLowerCase().includes('boot'))) {
        missingCategories.push('Sturdy Boots');
    }
    if (options.tripType === 'Business' && tops.every(t => !t.name?.toLowerCase().includes('shirt') && !t.subCategory?.toLowerCase().includes('shirt'))) {
        missingCategories.push('Formal Shirts');
    }

    // Generate outfits day by day
    for (let day = 1; day <= daysCount; day++) {
        const dayItems: WardrobeItem[] = [];

        // Title and vibe logic
        let title = `Day ${day} Outfit`;
        let weatherLabel = 'Pleasant • 22°C'; // Mock weather for the trip

        if (options.tripType === 'Beach') {
            title = day === 1 ? 'Travel & Check-in' : day % 2 === 0 ? 'Beach Day' : 'Coastal Dinner';
            weatherLabel = 'Sunny • 28°C';
        } else if (options.tripType === 'Business') {
            title = day === 1 ? 'Flight & Arrival' : day === daysCount ? 'Departure' : 'Meetings & Office';
            weatherLabel = 'Breezy • 20°C';
        } else if (options.tripType === 'Trekking') {
            title = day === 1 ? 'Base Camp Arrival' : 'Trail Hiking';
            weatherLabel = 'Cool • 12°C';
        }

        // Try to assign a top
        const top = tops[(day - 1) % Math.max(tops.length, 1)];
        if (top) { dayItems.push(top); usedItemMap.set(top.id, top); }

        // Try to assign a bottom
        const bottom = bottoms[(day - 1) % Math.max(bottoms.length, 1)];
        if (bottom) { dayItems.push(bottom); usedItemMap.set(bottom.id, bottom); }

        // Add outerwear if trekking or business
        if (['Trekking', 'Business'].includes(options.tripType)) {
            const outer = outerwears[(day - 1) % Math.max(outerwears.length, 1)];
            if (outer) { dayItems.push(outer); usedItemMap.set(outer.id, outer); }
        }

        // Try to assign shoes
        const shoe = footwears[(day - 1) % Math.max(footwears.length, 1)];
        if (shoe) { dayItems.push(shoe); usedItemMap.set(shoe.id, shoe); }

        dailyOutfits.push({
            dayNumber: day,
            title,
            weatherLabel,
            items: dayItems
        });
    }

    // Convert Set of used items into a PackingList
    const packingList: PackingListItem[] = Array.from(usedItemMap.values()).map(item => ({
        id: item.id,
        item,
        packed: false
    }));

    return {
        id: `trip-${Date.now()}`,
        name: `${options.destination} Escape`,
        destination: options.destination,
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        daysCount,
        tripType: options.tripType,
        mood: options.mood,
        dailyOutfits,
        packingList,
        missingCategories
    };
}
