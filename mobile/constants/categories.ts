export type CanonicalCategory =
    | 'topwear'
    | 'bottomwear'
    | 'outerwear'
    | 'footwear'
    | 'accessories'
    | 'unclassified';

export const CATEGORY_LABELS: Record<CanonicalCategory, string> = {
    topwear: 'Topwear',
    bottomwear: 'Bottomwear',
    outerwear: 'Outerwear',
    footwear: 'Footwear',
    accessories: 'Accessories',
    unclassified: 'Unclassified',
};

export const FILTER_TO_CANONICAL: Record<string, CanonicalCategory | 'all'> = {
    'All Items': 'all',
    Topwear: 'topwear',
    Bottoms: 'bottomwear',
    Outerwear: 'outerwear',
    Shoes: 'footwear',
    Accessories: 'accessories',
};

export const CANONICAL_TO_FILTER_PARAM: Record<CanonicalCategory | 'all', string> = {
    all: 'all',
    topwear: 'tops',
    bottomwear: 'bottoms',
    outerwear: 'outerwear',
    footwear: 'shoes',
    accessories: 'accessories',
    unclassified: 'unclassified',
};

export function normalizeCategory(raw?: string | null): CanonicalCategory {
    if (!raw) return 'unclassified';
    const value = raw.toLowerCase();

    if (value === 'topwear' || value === 'top' || value === 'tops') return 'topwear';
    if (value === 'bottomwear' || value === 'bottom' || value === 'bottoms' || value === 'trousers' || value === 'pants' || value === 'jeans')
        return 'bottomwear';
    if (value === 'outerwear' || value === 'jacket' || value === 'coat') return 'outerwear';
    if (value === 'footwear' || value === 'shoes' || value === 'sneakers' || value === 'boots') return 'footwear';
    if (value === 'accessories' || value === 'accessory') return 'accessories';

    return 'unclassified';
}

