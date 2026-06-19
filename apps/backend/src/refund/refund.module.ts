import { Module } from '@nestjs/common';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
  // Importa PaymentModule para reutilizar la pasarela (PAYMENT_GATEWAY) en los reembolsos.
  imports: [PaymentModule],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
