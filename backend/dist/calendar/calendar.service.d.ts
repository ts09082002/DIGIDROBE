export declare class OOTD {
    id: string;
    userId: string;
    date: string;
    outfitItems: string[];
    aiStyled?: boolean;
    notes?: string;
    rating?: number;
    createdAt: string;
}
export declare class CalendarService {
    private readonly logger;
    private readonly collection;
    private docToOOTD;
    getByMonth(month: string, userId: string): Promise<OOTD[]>;
    saveOOTD(date: string, itemIds: string[], userId: string, aiStyled?: boolean, notes?: string): Promise<OOTD>;
    getStats(days: number, userId: string): Promise<{
        totalOutfits: number;
        mostWorn: any[];
        leastWorn: any[];
        aiStyledCount: number;
    }>;
    claimGuestItems(userId: string): Promise<number>;
}
