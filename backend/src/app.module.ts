import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UploadModule } from './upload/upload.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';
import { CalendarModule } from './calendar/calendar.module';
import { PackingModule } from './packing/packing.module';
export * from './wardrobe/wardrobe.service';
export * from './calendar/calendar.service';
export * from './packing/packing.service';
export * from './upload/upload.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    UploadModule,
    WardrobeModule,
    CalendarModule,
    PackingModule,
  ],
})
export class AppModule {}
