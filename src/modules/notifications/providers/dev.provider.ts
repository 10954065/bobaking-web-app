import type { EmailProvider, SendResult, SmsProvider } from "@/modules/notifications/providers/notification-provider.interface";

/**
 * Development stand-in for both channels — no real SMS/email gateway is
 * configured for this project yet. Writing the Notification row (see
 * notification.service.ts) already serves as the visible record in dev; this
 * provider just reports success without actually reaching a phone or inbox,
 * exactly like MobileMoneyDevProvider stands in for a real payment gateway.
 */
export class DevSmsProvider implements SmsProvider {
  readonly name = "sms-dev";
  async send(): Promise<SendResult> {
    return { status: "SENT" };
  }
}

export class DevEmailProvider implements EmailProvider {
  readonly name = "email-dev";
  async send(): Promise<SendResult> {
    return { status: "SENT" };
  }
}
