import { Logger } from '@nestjs/common';
import { EmailGateway, SendEmailInput, SendEmailResult } from './email-gateway';

/** Envío real con Resend vía su API REST (sin dependencia extra; usa fetch nativo). */
export class ResendGateway implements EmailGateway {
  private readonly logger = new Logger(ResendGateway.name);

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  isReal(): boolean {
    return true;
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend respondió ${res.status}: ${body}`);
    }
    const data = (await res.json()) as { id?: string };
    return { id: data.id ?? 'resend-unknown' };
  }
}
