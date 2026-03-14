import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers as NestHeaders,
} from '@nestjs/common';
import { CalendarService, OOTD } from './calendar.service';

@Controller('api/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  async getByMonth(
    @NestHeaders('x-user-id') userId: string,
    @Query('month') month: string,
  ) {
    return this.calendarService.getByMonth(month, userId);
  }

  @Get('stats')
  async getStats(
    @NestHeaders('x-user-id') userId: string,
    @Query('days') days?: string,
  ) {
    return this.calendarService.getStats(parseInt(days || '30'), userId);
  }

  @Post()
  async saveOOTD(
    @NestHeaders('x-user-id') userId: string,
    @Body() body: { date: string; items: string[]; aiStyled?: boolean },
  ) {
    return this.calendarService.saveOOTD(body.date, body.notes);
    return {
      success: true,
      data,
    };
  }
}
