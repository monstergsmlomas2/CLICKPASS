import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { EMAIL_GATEWAY } from './email/email-gateway';
import { ResendGateway } from './email/resend.gateway';
import { SimulatedEmailGateway } from './email/simulated-email.gateway';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    {
      // Resend real si hay API key; si no, modo simulado.
      provide: EMAIL_GATEWAY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('RESEND_API_KEY');
        if (apiKey && apiKey.trim().length > 0) {
          const from = config.get<string>('SMTP_FROM', 'noreply@clickpass.app');
          return new ResendGateway(apiKey, from);
        }
        return new SimulatedEmailGateway();
      },
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
