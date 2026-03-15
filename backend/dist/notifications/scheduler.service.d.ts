import { PackingService } from '../packing/packing.service';
import { NotificationsService } from './notifications.service';
import { MailService } from './mail.service';
import { WeatherService } from './weather.service';
export declare class SchedulerService {
    private readonly packingService;
    private readonly notificationsService;
    private readonly mailService;
    private readonly weatherService;
    private readonly logger;
    constructor(packingService: PackingService, notificationsService: NotificationsService, mailService: MailService, weatherService: WeatherService);
    handleDailyOutfitJob(): Promise<void>;
    handleDailyAfternoonOutfitJob(): Promise<void>;
    private processDailyOutfitJob;
}
