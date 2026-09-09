export type SendStatus = "SENT" | "FAILED";

export interface SendResult {
  status: SendStatus;
  providerReference?: string;
  error?: string;
}

/**
 * Every delivery channel (SMS, email, ...) implements this same interface so
 * notification.service.ts never couples to a specific vendor's SDK. Real
 * providers (Twilio, Resend, ...) slot in as additional implementations —
 * see the *-dev.provider.ts stand-ins and getSmsProvider/getEmailProvider in
 * notification.service.ts for where a new one gets wired in, mirroring the
 * PaymentProvider pattern in modules/payments/providers/.
 */
export interface SmsProvider {
  readonly name: string;
  send(to: string, body: string): Promise<SendResult>;
}

export interface EmailProvider {
  readonly name: string;
  send(to: string, subject: string, body: string): Promise<SendResult>;
}
