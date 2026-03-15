import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  Headers as NestHeaders,
  BadRequestException,
} from '@nestjs/common';
import {
  WardrobeService,
  WardrobeItem,
  CreateItemDto,
} from './wardrobe.service';
import { CalendarService } from '../calendar/calendar.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('api/wardrobe')
export class WardrobeController {
  constructor(
    private readonly wardrobeService: WardrobeService,
    private readonly calendarService: CalendarService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  async getAll(
    @NestHeaders('x-user-id') userId: string,
    @Query('category') category?: string,
    @Query('favorite') favorite?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.wardrobeService.getAll({
      userId,
      category,
      favorite: favorite === 'true',
      search,
    });
    return { success: true, data };
  }

  @Get('stats')
  async getStats(@NestHeaders('x-user-id') userId: string) {
    const data = await this.wardrobeService.getStats(userId);
    return { success: true, data };
  }

  @Post('claim')
  async claim(@NestHeaders('x-user-id') userId: string) {
    const wardrobeCount = await this.wardrobeService.claimGuestItems(userId);
    const calendarCount = await this.calendarService.claimGuestItems(userId);
    const notificationsCount =
      await this.notificationsService.claimGuestItems(userId);

    return {
      success: true,
      data: {
        count: wardrobeCount + calendarCount + notificationsCount,
        details: {
          wardrobe: wardrobeCount,
          calendar: calendarCount,
          notifications: notificationsCount,
        },
      },
    };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const data = await this.wardrobeService.getById(id);
    return {
      success: true,
      data,
    };
  }

  @Post()
  async create(
    @NestHeaders('x-user-id') userId: string,
    @Body() createItemDto: CreateItemDto,
  ) {
    if (!userId || userId === 'undefined' || userId === 'anonymous') {
      throw new BadRequestException('Valid User ID required');
    }
    const data = await this.wardrobeService.create({ ...createItemDto, userId });
    return { success: true, data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<WardrobeItem>) {
    const data = await this.wardrobeService.update(id, body);
    return {
      success: true,
      data,
    };
  }

  @Patch(':id/favorite')
  async toggleFavorite(@Param('id') id: string) {
    const data = await this.wardrobeService.toggleFavorite(id);
    return {
      success: true,
      data,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.wardrobeService.delete(id);
    return { success: true, message: 'Item deleted' };
  }
}
