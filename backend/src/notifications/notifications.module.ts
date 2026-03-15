import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MailService } from './mail.service';
import { SchedulerService } from './scheduler.service';
import { WeatherService } from './weather.service';
import { PackingModule } from '../packing/packing.module';

@Module({
  imports: [forwardRef(() => PackingModule)],
  providers: [NotificationsService, MailService, SchedulerService, WeatherService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}

