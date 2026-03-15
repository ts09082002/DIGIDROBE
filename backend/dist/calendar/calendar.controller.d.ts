import { CalendarService, OOTD } from './calendar.service';
export declare class CalendarController {
    private readonly calendarService;
    constructor(calendarService: CalendarService);
    getByMonth(userId: string, month: string): Promise<{
        success: boolean;
        data: OOTD[];
    }>;
    getStats(userId: string, days?: string): Promise<{
        success: boolean;
        data: {
            totalOutfits: number;
            mostWorn: any[];
            leastWorn: any[];
            aiStyledCount: number;
        };
    }>;
    saveOOTD(userId: string, body: {
        date: string;
        items: string[];
        aiStyled?: boolean;
        notes?: string;
    }): Promise<{
        success: boolean;
        data: OOTD;
    }>;
}
