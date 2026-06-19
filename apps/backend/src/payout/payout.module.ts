import { Module } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PayoutScheduler } from './payout.scheduler';
import { PayoutController } from './payout.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
  // Importa PaymentModule para reutilizar la pasarela (PAYMENT_GATEWAY) en las liquidaciones.
  imports: [PaymentModule],
  controllers: [PayoutController],
  providers: [PayoutService, PayoutScheduler],
  exports: [PayoutService],
})
export class PayoutModule {}
