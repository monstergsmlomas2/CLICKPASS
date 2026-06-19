import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PAYMENT_GATEWAY } from './gateway/payment-gateway';
import { MercadoPagoGateway } from './gateway/mercadopago.gateway';
import { SimulatedGateway } from './gateway/simulated.gateway';

@Module({
  controllers: [PaymentController],
  providers: [
    PaymentService,
    {
      // Elige la pasarela según haya o no credenciales: real (MercadoPago) o simulada.
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const token = config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
        if (token && token.trim().length > 0) {
          return new MercadoPagoGateway(token);
        }
        const backendUrl = config.get<string>('BACKEND_URL', 'http://localhost:3001');
        return new SimulatedGateway(backendUrl);
      },
    },
  ],
  exports: [PaymentService, PAYMENT_GATEWAY],
})
export class PaymentModule {}
