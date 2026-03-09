import { Module } from '@nestjs/common';
import { PackingController } from './packing.controller';
import { PackingService } from './packing.service';
import { WardrobeModule } from '../wardrobe/wardrobe.module';
import { TryOnService } from './try-on.service';

@Module({
  imports: [WardrobeModule],
  controllers: [PackingController],
  providers: [PackingService, TryOnService],
})
export class PackingModule {}
