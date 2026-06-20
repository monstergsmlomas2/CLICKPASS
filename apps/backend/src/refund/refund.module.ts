import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
  // Importa PaymentModule para reutilizar la pasarela (PAYMENT_GATEWAY) en los reembolsos.
  // JwtModule: firma/verifica el token del link de reembolso para invitados (secret por firma).
  imports: [PaymentModule, JwtModule.register({})],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
