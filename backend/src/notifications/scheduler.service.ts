import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getFirebaseAdmin } from '../firebase-admin';
import { PackingService } from '../packing/packing.service';
import { NotificationsService } from './notifications.service';
import { MailService } from './mail.service';
import { WeatherService } from './weather.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @Inject(forwardRef(() => PackingService))
    private readonly packingService: PackingService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly weatherService: WeatherService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDailyOutfitJob() {
    return this.processDailyOutfitJob('Morning Radiance', '9 AM');
  }

  @Cron('30 14 * * *')
  async handleDailyAfternoonOutfitJob() {
    return this.processDailyOutfitJob('Afternoon Sparkle', '2:30 PM');
  }

  private async processDailyOutfitJob(title: string, jobTime: string) {
    this.logger.log(`Starting daily outfit generation job for ${jobTime}...`);

    try {
      const auth = getFirebaseAdmin().auth();
      const listUsers = await auth.listUsers();
      // Fetch common weather (Mumbai default)
      const temp = await this.weatherService.getCurrentTemperature();
      const weatherTag = this.weatherService.getWeatherType(temp);

      for (const userRecord of listUsers.users) {
        if (!userRecord.email) continue;

        this.logger.debug(
          `Generating outfit for user: ${userRecord.uid} (${temp}°C)`,
        );

        try {
          const suggestion = await this.packingService.getStylistSuggestion(
            userRecord.uid,
            undefined,
            temp,
          );

          if (
            suggestion.suggestedOutfit &&
            suggestion.suggestedOutfit.length > 0
          ) {
            // 1. Create In-App Notification
            await this.notificationsService.create({
              userId: userRecord.uid,
              type: 'daily_outfit',
              title: title,
              message: `Your ${jobTime} outfit is ready! It's currently ${temp}°C (${weatherTag}).`,
              metadata: {
                outfitItemIds: suggestion.suggestedOutfit.map((i) => i.id),
                quote:
                  '“Style is a way to say who you are without having to speak.” — Rachel Zoe',
              },
            });

            // 2. Send Email
            const itemsHtml = suggestion.suggestedOutfit
              .map(
                (i) =>
                  `<li>${i.name || i.category} (${i.brand || 'No Brand'})</li>`,
              )
              .join('');

            const emailHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h1 style="color: #3B2618;">${title}, ${userRecord.displayName || 'Fashionista'}!</h1>
                <p>It's currently <strong>${temp}°C</strong>. Here is your curated look for this ${jobTime}:</p>
                <ul style="list-style: none; padding: 0;">
                  ${itemsHtml}
                </ul>
                <p style="font-style: italic; color: #666; margin-top: 20px;">
                  “Style is a way to say who you are without having to speak.” — Rachel Zoe
                </p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="font-size: 12px; color: #999;">Sent from your Digidrobe Style Assistant</p>
                </div>
              </div>
            `;

            await this.mailService.sendDailyOutfit(
              userRecord.email,
              userRecord.displayName || 'Fashionista',
              emailHtml,
            );
          }
        } catch (innerError) {
          this.logger.error(
            `Error processing outfit for user ${userRecord.uid}: ${innerError}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Daily outfit job (${jobTime}) failed: ${error}`);
    }

    this.logger.log(`Daily outfit generation job for ${jobTime} completed.`);
  }
}
