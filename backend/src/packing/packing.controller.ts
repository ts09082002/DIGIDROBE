import {
    Controller,
    Post,
    Get,
    Body,
} from '@nestjs/common';
import { PackingService } from './packing.service';
import type { PackingListRequest } from './packing.service';

@Controller('api/packing')
export class PackingController {
    constructor(private readonly packingService: PackingService) { }

    @Post('generate')
    async generate(@Body() body: PackingListRequest) {
        if (!body.destination || !body.days) {
            return { success: false, message: 'Missing destination or days' };
        }
        const data = await this.packingService.generatePackingList(body);
        return { success: true, data };
    }

    @Get('stylist')
    async getStylistSuggestion() {
        const data = await this.packingService.getStylistSuggestion();
        return { success: true, data };
    }
}
