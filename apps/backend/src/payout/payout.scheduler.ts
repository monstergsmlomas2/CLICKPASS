import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PayoutService } from './payout.service';

/**
 * Dispara el ciclo de liquidación periódicamente: cierra funciones ya pasadas, programa
 * sus payouts y ejecuta los que ya cumplieron la ventana de retención. Una corrida
 * horaria es suficiente (la ventana se mide en días).
 */
@Injectable()
export class PayoutScheduler {
  private readonly logger = new Logger(PayoutScheduler.name);

  constructor(private readonly payouts: PayoutService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCycle() {
    const res = await this.payouts.runCycle();
    if (res.scheduled || res.paid || res.failed) {
      this.logger.log(
        `Ciclo de payout: ${res.scheduled} programados, ${res.paid} pagados, ${res.failed} fallidos`,
      );
    }
  }
}
