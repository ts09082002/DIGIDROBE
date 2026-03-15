import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('SMTP Mail Service initialized');
    } else {
      this.logger.warn(
        'SMTP credentials not fully provided. Mail service will only log to console.',
      );
    }
  }

  async sendDailyOutfit(email: string, name: string, outfitHtml: string) {
    const mailOptions = {
      from: `"Digidrobe" <${process.env.SMTP_USER || 'noreply@digidrobe.com'}>`,
      to: email,
      subject: `Morning Radiance: Your Daily Look for today, ${name}!`,
      html: outfitHtml,
    };

    if (this.transporter) {
      try {
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Daily outfit email sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${email}: ${error}`);
      }
    } else {
      this.logger.debug(`[MOCK EMAIL to ${email}]: ${outfitHtml.substring(0, 100)}...`);
    }
  }
}
