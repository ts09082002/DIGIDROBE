"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const firebase_admin_1 = require("../firebase-admin");
const packing_service_1 = require("../packing/packing.service");
const notifications_service_1 = require("./notifications.service");
const mail_service_1 = require("./mail.service");
const weather_service_1 = require("./weather.service");
let SchedulerService = SchedulerService_1 = class SchedulerService {
    packingService;
    notificationsService;
    mailService;
    weatherService;
    logger = new common_1.Logger(SchedulerService_1.name);
    constructor(packingService, notificationsService, mailService, weatherService) {
        this.packingService = packingService;
        this.notificationsService = notificationsService;
        this.mailService = mailService;
        this.weatherService = weatherService;
    }
    async handleDailyOutfitJob() {
        return this.processDailyOutfitJob('Morning Radiance', '9 AM');
    }
    async handleDailyAfternoonOutfitJob() {
        return this.processDailyOutfitJob('Afternoon Sparkle', '2:30 PM');
    }
    async processDailyOutfitJob(title, jobTime) {
        this.logger.log(`Starting daily outfit generation job for ${jobTime}...`);
        try {
            const auth = (0, firebase_admin_1.getFirebaseAdmin)().auth();
            const listUsers = await auth.listUsers();
            const temp = await this.weatherService.getCurrentTemperature();
            const weatherTag = this.weatherService.getWeatherType(temp);
            for (const userRecord of listUsers.users) {
                if (!userRecord.email)
                    continue;
                this.logger.debug(`Generating outfit for user: ${userRecord.uid} (${temp}°C)`);
                try {
                    const suggestion = await this.packingService.getStylistSuggestion(userRecord.uid, undefined, temp);
                    if (suggestion.suggestedOutfit &&
                        suggestion.suggestedOutfit.length > 0) {
                        await this.notificationsService.create({
                            userId: userRecord.uid,
                            type: 'daily_outfit',
                            title: title,
                            message: `Your ${jobTime} outfit is ready! It's currently ${temp}°C (${weatherTag}).`,
                            metadata: {
                                outfitItemIds: suggestion.suggestedOutfit.map((i) => i.id),
                                quote: '“Style is a way to say who you are without having to speak.” — Rachel Zoe',
                            },
                        });
                        const itemsHtml = suggestion.suggestedOutfit
                            .map((i) => `<li>${i.name || i.category} (${i.brand || 'No Brand'})</li>`)
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
                        await this.mailService.sendDailyOutfit(userRecord.email, userRecord.displayName || 'Fashionista', emailHtml);
                    }
                }
                catch (innerError) {
                    this.logger.error(`Error processing outfit for user ${userRecord.uid}: ${innerError}`);
                }
            }
        }
        catch (error) {
            this.logger.error(`Daily outfit job (${jobTime}) failed: ${error}`);
        }
        this.logger.log(`Daily outfit generation job for ${jobTime} completed.`);
    }
};
exports.SchedulerService = SchedulerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_9AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "handleDailyOutfitJob", null);
__decorate([
    (0, schedule_1.Cron)('30 14 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "handleDailyAfternoonOutfitJob", null);
exports.SchedulerService = SchedulerService = SchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => packing_service_1.PackingService))),
    __metadata("design:paramtypes", [packing_service_1.PackingService,
        notifications_service_1.NotificationsService,
        mail_service_1.MailService,
        weather_service_1.WeatherService])
], SchedulerService);
//# sourceMappingURL=scheduler.service.js.map