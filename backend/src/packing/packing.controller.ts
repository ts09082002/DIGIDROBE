import { Controller, Post, Get, Body } from '@nestjs/common';
import { PackingService } from './packing.service';
import { TryOnService } from './try-on.service';
import type {
  PackingListRequest,
  StyleProfileRequest,
} from './packing.service';
import type { TryOnPreviewRequest } from './try-on.service';

@Controller('api/packing')
export class PackingController {
  constructor(
    private readonly packingService: PackingService,
    private readonly tryOnService: TryOnService,
  ) {}

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

  @Post('stylist')
  async getPersonalizedStylistSuggestion(@Body() body: StyleProfileRequest) {
    const data = await this.packingService.getStylistSuggestion(body);
    return { success: true, data };
  }

  @Post('try-on/preview')
  async generateTryOnPreview(@Body() body: TryOnPreviewRequest) {
    const data = await this.tryOnService.generatePreview(body);
    return { success: true, data };
  }
}
