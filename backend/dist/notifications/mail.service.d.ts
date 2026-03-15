export declare class MailService {
    private readonly logger;
    private transporter;
    constructor();
    sendDailyOutfit(email: string, name: string, outfitHtml: string): Promise<void>;
}
