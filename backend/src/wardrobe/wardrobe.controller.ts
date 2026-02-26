import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { WardrobeService, WardrobeItem } from './wardrobe.service';

@Controller('api/wardrobe')
export class WardrobeController {
    constructor(private readonly wardrobeService: WardrobeService) { }

    @Get()
    async getAll(
        @Query('category') category?: string,
        @Query('search') search?: string,
        @Query('favorite') favorite?: string,
    ) {
        const data = await this.wardrobeService.getAll({ category, search, favorite });
        return {
            success: true,
            data,
        };
    }

    @Get('stats')
    async getStats() {
        const data = await this.wardrobeService.getStats();
        return {
            success: true,
            data,
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
    async create(@Body() body: Partial<WardrobeItem>) {
        const data = await this.wardrobeService.create(body);
        return {
            success: true,
            data,
        };
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

