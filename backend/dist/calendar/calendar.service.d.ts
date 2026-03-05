export interface OOTD {
    id: string;
    date: string;
    itemIds: string[];
    notes: string;
    createdAt: string;
    updatedAt: string;
}
export interface WardrobeStats {
    mostWorn: {
        itemId: string;
        count: number;
    }[];
    leastWorn: {
        itemId: string;
        count: number;
    }[];
}
export declare class CalendarService {
    private readonly logger;
    private readonly collection;
    private docToOOTD;
    getOOTDByMonth(year: number, month: number): Promise<OOTD[]>;
    saveOOTD(date: string, itemIds: string[], notes?: string): Promise<OOTD>;
    getStats(days?: number): Promise<WardrobeStats>;
}
