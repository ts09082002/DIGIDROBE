import { Injectable, Logger } from '@nestjs/common';
import { WardrobeService, WardrobeItem } from '../wardrobe/wardrobe.service';

export interface PackingListRequest {
  destination: string;
  days: number;
  userId?: string;
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

export interface StyleProfileRequest {
  bodyType?: 'Slim' | 'Athletic' | 'Average' | 'Heavy';
  skinTone?: 'Light' | 'Medium' | 'Tan' | 'Dark';
  height?: number;
  waistSize?: string;
  stylePreference?: 'Casual' | 'Streetwear' | 'Formal' | 'Minimal';
}

/** Normalize AI category strings to canonical groups */
export function categorize(category: string): string {
  const c = category.toLowerCase().trim();
  if (
    [
      'tops',
      'topwear',
      'shirt',
      't-shirt',
      'blouse',
      'top',
      'knitwear',
      'polo',
    ].some((k) => c.includes(k))
  )
    return 'tops';
  if (
    [
      'bottoms',
      'bottomwear',
      'pants',
      'jeans',
      'trousers',
      'skirt',
      'shorts',
      'leggings',
    ].some((k) => c.includes(k))
  )
    return 'bottoms';
  if (
    ['dress', 'dresses', 'jumpsuit', 'romper', 'gown'].some((k) =>
      c.includes(k),
    )
  )
    return 'dresses';
  if (
    [
      'outerwear',
      'jacket',
      'coat',
      'blazer',
      'hoodie',
      'sweater',
      'cardigan',
    ].some((k) => c.includes(k))
  )
    return 'outerwear';
  if (
    [
      'footwear',
      'shoes',
      'boots',
      'sneakers',
      'sandals',
      'heels',
      'loafers',
    ].some((k) => c.includes(k))
  )
    return 'footwear';
  if (
    [
      'accessories',
      'accessory',
      'bag',
      'belt',
      'hat',
      'scarf',
      'watch',
      'jewel',
    ].some((k) => c.includes(k))
  )
    return 'accessories';
  return 'other';
}

function selectItems(arr: WardrobeItem[], n: number): WardrobeItem[] {
  // Prefer favorites
  const favs = arr.filter((i) => i.isFavorite);
  const rest = arr.filter((i) => !i.isFavorite).sort(() => 0.5 - Math.random());
  const pool = [...favs, ...rest];
  return pool.slice(0, n);
}

function scoreItem(item: WardrobeItem, profile?: StyleProfileRequest): number {
  if (!profile?.stylePreference) return item.isFavorite ? 2 : 0;

  const haystack =
    `${item.name} ${item.brand} ${item.originalFilename} ${item.category} ${(item.occasion || []).join(' ')} ${(item.season || []).join(' ')}`.toLowerCase();
  const keywords: Record<
    NonNullable<StyleProfileRequest['stylePreference']>,
    string[]
  > = {
    Casual: ['tee', 't-shirt', 'casual', 'sneaker', 'denim', 'cotton'],
    Streetwear: ['street', 'oversized', 'cargo', 'hoodie', 'jacket', 'sneaker'],
    Formal: ['formal', 'shirt', 'trouser', 'blazer', 'coat', 'loafer'],
    Minimal: ['neutral', 'plain', 'classic', 'clean', 'white', 'black'],
  };

  let score = item.isFavorite ? 3 : 0;
  for (const keyword of keywords[profile.stylePreference]) {
    if (haystack.includes(keyword)) score += 2;
  }
  return score;
}

export function buildLookNote(profile?: StyleProfileRequest): string {
  const notes: string[] = [];
  if (profile?.stylePreference)
    notes.push(`${profile.stylePreference} priority`);
  if (profile?.bodyType === 'Slim') notes.push('balanced shape');
  if (profile?.bodyType === 'Athletic') notes.push('clean structure');
  if (profile?.bodyType === 'Heavy') notes.push('streamlined fit');
  if (typeof profile?.height === 'number' && profile.height >= 180)
    notes.push('long-line proportion');
  if (typeof profile?.height === 'number' && profile.height <= 168)
    notes.push('compact proportion');
  if (profile?.waistSize) notes.push(`waist ${profile.waistSize}`);
  return notes.join(' • ') || 'Ranked from your wardrobe';
}

@Injectable()
export class PackingService {
  private readonly logger = new Logger(PackingService.name);

  constructor(private readonly wardrobeService: WardrobeService) {}

  async generatePackingList(
    request: PackingListRequest,
  ): Promise<WardrobeItem[]> {
    this.logger.log(
      `Generating packing list for ${request.destination} (${request.days} days)`,
    );

    const allItems = await this.wardrobeService.getAll({});
    const ready = allItems.filter((i) => i.status === 'done' && i.processedUrl);

    // Group by canonical category
    const grouped: Record<string, WardrobeItem[]> = {};
    for (const item of ready) {
      const cat = categorize(item.category);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    const d = request.days;
    const targetTops = Math.min(d + 1, 8);
    const targetBottoms = Math.max(1, Math.round(d * 0.7));
    const targetDresses = Math.max(0, Math.round(d * 0.3));
    const targetOuterwear = Math.max(1, Math.round(d * 0.3));
    const targetShoes = Math.max(1, Math.round(d * 0.4));
    const targetAccessories = Math.max(0, Math.round(d * 0.3));

    const list: WardrobeItem[] = [
      ...selectItems(grouped['tops'] || [], targetTops),
      ...selectItems(grouped['bottoms'] || [], targetBottoms),
      ...selectItems(grouped['dresses'] || [], targetDresses),
      ...selectItems(grouped['outerwear'] || [], targetOuterwear),
      ...selectItems(grouped['footwear'] || [], targetShoes),
      ...selectItems(grouped['accessories'] || [], targetAccessories),
    ];

    // Deduplicate by id
    const seen = new Set<string>();
    return list.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });
  }

  async getStylistSuggestion(
    profile?: StyleProfileRequest,
  ): Promise<StylistSuggestion> {
    const allItems = await this.wardrobeService.getAll({});
    const ready = allItems.filter((i) => i.status === 'done' && i.processedUrl);

    const favorites = ready.filter((i) => i.isFavorite);
    const stats = await this.wardrobeService.getStats();

    // Build a suggested outfit: 1 top + 1 bottom (or dress) + 1 outerwear + 1 shoe
    const grouped: Record<string, WardrobeItem[]> = {};
    for (const item of ready) {
      const cat = categorize(item.category);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    const sortedByStyle = (cat: string) =>
      [...(grouped[cat] || [])].sort(
        (a, b) => scoreItem(b, profile) - scoreItem(a, profile),
      );

    const tops = sortedByStyle('tops');
    const bottoms = sortedByStyle('bottoms');
    const dresses = sortedByStyle('dresses');
    const outerwear = sortedByStyle('outerwear');
    const footwear = sortedByStyle('footwear');
    const accessories = sortedByStyle('accessories');

    const createLook = (index: number) => {
      const top = tops[index % Math.max(tops.length, 1)] || null;
      const bottom =
        bottoms[index % Math.max(bottoms.length, 1)] ||
        dresses[index % Math.max(dresses.length, 1)] ||
        null;
      const outer = outerwear[index % Math.max(outerwear.length, 1)] || null;
      const shoe = footwear[index % Math.max(footwear.length, 1)] || null;
      const accessory =
        accessories[index % Math.max(accessories.length, 1)] || null;

      const items = [top, bottom, outer, shoe, accessory].filter(
        (item): item is WardrobeItem => Boolean(item),
      );
      const dedupedItems = items.filter(
        (item, itemIndex, arr) =>
          arr.findIndex((x) => x.id === item.id) === itemIndex,
      );
      const score = dedupedItems.reduce(
        (sum, item) => sum + scoreItem(item, profile),
        0,
      );

      return {
        id: `look-${index}-${dedupedItems.map((item) => item.id).join('-')}`,
        name: index === 0 ? 'Best For You' : `You Can Also Try ${index}`,
        note: buildLookNote(profile),
        items: dedupedItems,
        score,
      };
    };

    const alternativeOutfits = Array.from({ length: 4 }, (_, index) =>
      createLook(index),
    )
      .filter((look) => look.items.length >= 2)
      .filter(
        (look, index, arr) => arr.findIndex((x) => x.id === look.id) === index,
      )
      .sort((a, b) => b.score - a.score);

    const suggestedOutfit = alternativeOutfits[0]?.items || [];

    return {
      suggestedOutfit,
      alternativeOutfits,
      favorites: favorites.slice(0, 10),
      stats: {
        totalItems: stats.totalItems,
        totalFavorites: stats.totalFavorites,
        categories: stats.categories,
      },
    };
  }
}
