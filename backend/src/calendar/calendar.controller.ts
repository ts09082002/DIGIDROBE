import {
    Controller,
    Get,
    Post,
    Body,
    Query,
} from '@nestjs/common';
import { CalendarService, OOTD } from './calendar.service';

@Controller('api/calendar')
export class CalendarController {
    constructor(private readonly calendarService: CalendarService) { }

    @Get()
    async getByMonth(
        @Query('year') year: string,
        @Query('month') month: string,
    ) {
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || new Date().getMonth() + 1;

        const data = await this.calendarService.getOOTDByMonth(y, m);
        return {
            success: true,
            data,
        };
    }

    @Get('stats')
    async getStats(@Query('days') days?: string) {
        const d = parseInt(days || '30', 10);
        const data = await this.calendarService.getStats(d);
        return {
            success: true,
            data,
        };
    }

    @Post()
    async saveOOTD(
        @Body() body: { date: string; itemIds: string[]; notes?: string }
    ) {
        if (!body.date || !body.itemIds) {
            return { success: false, message: 'Missing date or itemIds' };
        }

        const data = await this.calendarService.saveOOTD(body.date, body.itemIds, body.notes);
        return {
            success: true,
            data,
        };
    }
}
