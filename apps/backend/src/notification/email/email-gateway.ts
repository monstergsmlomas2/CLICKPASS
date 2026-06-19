export const EMAIL_GATEWAY = Symbol('EMAIL_GATEWAY');

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  id: string;
}

export interface EmailGateway {
  /** true si usa Resend real; false si corre en modo simulado. */
  isReal(): boolean;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
