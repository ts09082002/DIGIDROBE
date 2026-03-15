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
    const data = await this.calendarService.getByMonth(month, userId);
    return { success: true, data };
  }

  @Get('stats')
  async getStats(
    @NestHeaders('x-user-id') userId: string,
    @Query('days') days?: string,
  ) {
    const data = await this.calendarService.getStats(
      parseInt(days || '30'),
      userId,
    );
    return { success: true, data };
  }

  @Post()
  async saveOOTD(
    @NestHeaders('x-user-id') userId: string,
    @Body()
    body: {
      date: string;
      items: string[];
      aiStyled?: boolean;
      notes?: string;
    },
  ) {
    const data = await this.calendarService.saveOOTD(
      body.date,
      body.items,
      userId,
      body.aiStyled,
      body.notes,
    );
    return {
      success: true,
      data,
    };
  }
}
