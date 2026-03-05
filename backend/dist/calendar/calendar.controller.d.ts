import { CalendarService, OOTD } from './calendar.service';
export declare class CalendarController {
    private readonly calendarService;
    constructor(calendarService: CalendarService);
    getByMonth(year: string, month: string): Promise<{
        success: boolean;
        data: OOTD[];
    }>;
    getStats(days?: string): Promise<{
        success: boolean;
        data: import("./calendar.service").WardrobeStats;
    }>;
    saveOOTD(body: {
        date: string;
        itemIds: string[];
        notes?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: OOTD;
        message?: undefined;
    }>;
}
