import { Module, forwardRef } from '@nestjs/common';
import { PackingController } from './packing.controller';
import { PackingService } from './packing.service';
import { WardrobeModule } from '../wardrobe/wardrobe.module';
import { TryOnService } from './try-on.service';

@Module({
  imports: [forwardRef(() => WardrobeModule)],
  controllers: [PackingController],
  providers: [PackingService, TryOnService],
  exports: [PackingService, TryOnService],
})
export class PackingModule {}
