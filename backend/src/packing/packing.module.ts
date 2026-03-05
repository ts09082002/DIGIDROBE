import { Module } from '@nestjs/common';
import { PackingController } from './packing.controller';
import { PackingService } from './packing.service';
import { WardrobeModule } from '../wardrobe/wardrobe.module';

@Module({
    imports: [WardrobeModule],
    controllers: [PackingController],
    providers: [PackingService],
})
export class PackingModule { }
