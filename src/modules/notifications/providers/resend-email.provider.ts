import { env } from "@/lib/env";
import type { EmailProvider, SendResult } from "@/modules/notifications/providers/notification-provider.interface";

/**
 * Calls Resend's REST API directly rather than pulling in their SDK — see
 * TwilioSmsProvider for why. getEmailProvider() in notification.service.ts
 * only returns this once RESEND_API_KEY and EMAIL_FROM_ADDRESS are both set.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  async send(to: string, subject: string, body: string): Promise<SendResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM_ADDRESS,
          to,
          subject,
          text: body,
        }),
      });
      const json = (await response.json()) as { id?: string; message?: string };
      if (!response.ok) {
        return { status: "FAILED", error: json.message ?? `Resend responded ${response.status}` };
      }
      return { status: "SENT", providerReference: json.id };
    } catch (error) {
      return { status: "FAILED", error: error instanceof Error ? error.message : "Resend request failed" };
    }
  }
}
