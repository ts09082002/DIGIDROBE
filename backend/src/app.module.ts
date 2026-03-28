import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { UploadModule } from './upload/upload.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';
import { CalendarModule } from './calendar/calendar.module';
import { PackingModule } from './packing/packing.module';
import { SyncModule } from './sync/sync.module';
import { FirebaseAuthMiddleware } from './middleware/firebase-auth.middleware';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // 100 requests per minute
    }]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    UploadModule,
    WardrobeModule,
    CalendarModule,
    PackingModule,
    SyncModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(FirebaseAuthMiddleware)
      .exclude(
        { path: 'uploads/(.*)', method: RequestMethod.GET }, // Allow public access to images
      )
      .forRoutes('*');
  }
}
