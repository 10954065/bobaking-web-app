import { env } from "@/lib/env";
import type { SendResult, SmsProvider } from "@/modules/notifications/providers/notification-provider.interface";

/**
 * Calls Twilio's REST API directly rather than pulling in their SDK — this
 * is the only call site, so a `fetch` + Basic Auth is simpler than a new
 * dependency. See TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER in
 * src/lib/env.ts; getSmsProvider() in notification.service.ts only returns
 * this once all three are set.
 */
export class TwilioSmsProvider implements SmsProvider {
  readonly name = "twilio";

  async send(to: string, body: string): Promise<SendResult> {
    const accountSid = env.TWILIO_ACCOUNT_SID!;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: env.TWILIO_FROM_NUMBER!, Body: body }),
      });
      const json = (await response.json()) as { sid?: string; message?: string };
      if (!response.ok) {
        return { status: "FAILED", error: json.message ?? `Twilio responded ${response.status}` };
      }
      return { status: "SENT", providerReference: json.sid };
    } catch (error) {
      return { status: "FAILED", error: error instanceof Error ? error.message : "Twilio request failed" };
    }
  }
}
