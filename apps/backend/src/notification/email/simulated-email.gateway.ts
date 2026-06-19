import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EmailGateway, SendEmailInput, SendEmailResult } from './email-gateway';

/** Email SIMULADO: no envía nada, solo loguea. Default cuando no hay RESEND_API_KEY. */
export class SimulatedEmailGateway implements EmailGateway {
  private readonly logger = new Logger(SimulatedEmailGateway.name);

  isReal(): boolean {
    return false;
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    this.logger.log(`[SIMULADO] email a ${input.to} — "${input.subject}"`);
    return { id: `sim-email-${randomUUID()}` };
  }
}
