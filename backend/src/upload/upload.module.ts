import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { BackgroundRemovalService } from './background-removal.service';
import { WardrobeModule } from '../wardrobe/wardrobe.module';

@Module({
  imports: [WardrobeModule],
  controllers: [UploadController],
  providers: [UploadService, BackgroundRemovalService],
  exports: [UploadService],
})
export class UploadModule {}
