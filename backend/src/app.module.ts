import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UploadModule } from './upload/upload.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';
import { CalendarModule } from './calendar/calendar.module';
import { PackingModule } from './packing/packing.module';
import { NotificationsModule } from './notifications/notifications.module';
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
    ScheduleModule.forRoot(),
    UploadModule,
    WardrobeModule,
    CalendarModule,
    PackingModule,
    NotificationsModule,
  ],
})
export class AppModule {}
