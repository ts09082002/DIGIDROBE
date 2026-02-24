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
    getAll(
        @Query('category') category?: string,
        @Query('search') search?: string,
        @Query('favorite') favorite?: string,
    ) {
        return {
            success: true,
            data: this.wardrobeService.getAll({ category, search, favorite }),
        };
    }

    @Get('stats')
    getStats() {
        return {
            success: true,
            data: this.wardrobeService.getStats(),
        };
    }

    @Get(':id')
    getById(@Param('id') id: string) {
        return {
            success: true,
            data: this.wardrobeService.getById(id),
        };
    }

    @Post()
    create(@Body() body: Partial<WardrobeItem>) {
        return {
            success: true,
            data: this.wardrobeService.create(body),
        };
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: Partial<WardrobeItem>) {
        return {
            success: true,
            data: this.wardrobeService.update(id, body),
        };
    }

    @Patch(':id/favorite')
    toggleFavorite(@Param('id') id: string) {
        return {
            success: true,
            data: this.wardrobeService.toggleFavorite(id),
        };
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        this.wardrobeService.delete(id);
        return { success: true, message: 'Item deleted' };
    }
}
