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
} from '@nestjs/common';
import {
  WardrobeService,
  WardrobeItem,
  CreateItemDto,
} from './wardrobe.service';

@Controller('api/wardrobe')
export class WardrobeController {
  constructor(private readonly wardrobeService: WardrobeService) {}

  @Get()
  async getAll(
    @NestHeaders('x-user-id') userId: string,
    @Query('category') category?: string,
    @Query('favorite') favorite?: string,
    @Query('search') search?: string,
  ) {
    return this.wardrobeService.getAll({
      userId,
      category,
      favorite: favorite === 'true',
      search,
    });
  }

  @Get('stats')
  async getStats(@NestHeaders('x-user-id') userId: string) {
    return this.wardrobeService.getStats(userId);
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
    return this.wardrobeService.create({ ...createItemDto, userId });
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
