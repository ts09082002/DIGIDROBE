import {
  Controller,
  Get,
  Delete,
  Param,
  Headers as NestHeaders,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@NestHeaders('x-user-id') userId: string) {
    const data = await this.notifications.findForUser(userId || '');
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.notifications.delete(id);
    return { success: true, message: 'Notification deleted' };
  }
}

