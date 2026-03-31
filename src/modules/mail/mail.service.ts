import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService) { }

    async sendVerificationEmail(email: string, otp: string) {
        try {
            await this.mailerService.sendMail({
                to: email,
                subject: 'Mã xác thực tài khoản OpenMarket',
                template: './verification',
                context: { otp },
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #fb923c;">Chào mừng bạn đến với OpenMarket!</h2>
            <p>Mã xác thực (OTP) của bạn là:</p>
            <div style="background: #fff7ed; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #fb923c; border: 1px dashed #fb923c;">
              ${otp}
            </div>
            <p>Mã này sẽ hết hạn sau <b>5 phút</b>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
          </div>
        `,
            });
            return true;
        } catch (error) {
            console.error('Lỗi gửi mail:', error);
            return false;
        }
    }
}