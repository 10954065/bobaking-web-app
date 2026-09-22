import { prisma } from "@/db/client";
import type { NotificationChannel, NotificationStatus, Order, OrderStatus } from "@prisma/client";
import { env } from "@/lib/env";
import { recordAuditLog } from "@/modules/audit/services/audit.service";
import { DevEmailProvider, DevSmsProvider } from "@/modules/notifications/providers/dev.provider";
import { TwilioSmsProvider } from "@/modules/notifications/providers/twilio-sms.provider";
import { ResendEmailProvider } from "@/modules/notifications/providers/resend-email.provider";
import type { EmailProvider, SmsProvider } from "@/modules/notifications/providers/notification-provider.interface";

const devSmsProvider = new DevSmsProvider();
const devEmailProvider = new DevEmailProvider();
const twilioProvider = new TwilioSmsProvider();
const resendProvider = new ResendEmailProvider();

/** Falls back to the dev stand-in until all three Twilio vars are set — see src/lib/env.ts. */
function getSmsProvider(): SmsProvider {
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER) return twilioProvider;
  return devSmsProvider;
}

/** Falls back to the dev stand-in until both Resend vars are set — see src/lib/env.ts. */
function getEmailProvider(): EmailProvider {
  if (env.RESEND_API_KEY && env.EMAIL_FROM_ADDRESS) return resendProvider;
  return devEmailProvider;
}

const TEMPLATES: Partial<Record<OrderStatus, (order: Order) => { subject: string; body: string }>> = {
  // CONFIRMED means payment landed — nothing more. It must never read as
  // acceptance; that's ACCEPTED below, a separate branch decision.
  CONFIRMED: (order) => ({
    subject: "Payment received",
    body: `We've received payment for order ${order.orderNumber}. The branch hasn't accepted it yet. We'll let you know as soon as they do.`,
  }),
  ACCEPTED: (order) => ({
    subject: "Order accepted",
    body: `Good news! Order ${order.orderNumber} has been accepted and is being prepared.`,
  }),
  READY: (order) => ({
    subject: "Order ready",
    body: `Your order ${order.orderNumber} is ready${order.type === "DELIVERY" ? " for dispatch" : " for pickup"}.`,
  }),
  OUT_FOR_DELIVERY: (order) => ({
    subject: "Order out for delivery",
    body: `Your order ${order.orderNumber} is on its way.`,
  }),
  DELIVERED: (order) => ({
    subject: "Order delivered",
    body: `Your order ${order.orderNumber} has been delivered. Enjoy!`,
  }),
  CANCELLED: (order) => ({
    subject: "Order cancelled",
    body: `Your order ${order.orderNumber} has been cancelled.`,
  }),
  REJECTED: (order) => ({
    subject: "Order could not be accepted",
    body: `We're sorry, your order ${order.orderNumber} could not be accepted.`,
  }),
};

/**
 * Attempts a real send via getSmsProvider()/getEmailProvider() (Twilio/Resend
 * once configured, otherwise the dev stand-ins — see src/lib/env.ts) and
 * records the outcome as a Notification row either way, so the admin
 * notifications list (listNotifications below) always shows what was
 * actually attempted, not just that a send was "queued". Called from
 * transitionOrder() after a real status change commits; never throws, since
 * a notification failure must never be mistaken for (or roll back) an order
 * status change, same reasoning transitionOrder already documents for the
 * kitchen event publish.
 */
export async function notifyOrderStatus(order: Order): Promise<void> {
  const template = TEMPLATES[order.status];
  if (!template) return;

  try {
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: order.customerId } });
    const channel: NotificationChannel | null = customer.phone ? "SMS" : customer.email ? "EMAIL" : null;
    if (!channel) return;

    const { subject, body } = template(order);
    const result =
      channel === "SMS"
        ? await getSmsProvider().send(customer.phone!, body)
        : await getEmailProvider().send(customer.email!, subject, body);

    const status: NotificationStatus = result.status === "SENT" ? "SENT" : "FAILED";
    await prisma.notification.create({
      data: { customerId: order.customerId, orderId: order.id, channel, subject, body, status },
    });

    if (status === "FAILED") {
      await recordAuditLog({
        actorUserId: null,
        action: "notification.send_failed",
        resourceType: "Order",
        resourceId: order.id,
        metadata: { channel, error: result.error ?? "unknown" },
      }).catch(() => {});
    }
  } catch (error) {
    await recordAuditLog({
      actorUserId: null,
      action: "notification.send_failed",
      resourceType: "Order",
      resourceId: order.id,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    }).catch(() => {});
  }
}

/**
 * Sends a one-time login code directly (no Customer/Order/Notification row
 * involved — a phone can request a code before any Customer exists yet).
 * Reports whether the dev stand-in handled it so the caller can decide
 * whether it's safe to hand the code back to the client for testing — see
 * requestOtp() in customer-otp.service.ts, same reasoning as the payment
 * module's dev-simulate stand-ins.
 */
export async function sendOtpSms(phone: string, code: string): Promise<{ sent: boolean; isDevProvider: boolean; error?: string }> {
  const provider = getSmsProvider();
  const body = `Your Boba King verification code is ${code}. It expires in 10 minutes.`;
  const result = await provider.send(phone, body);
  return { sent: result.status === "SENT", isDevProvider: provider === devSmsProvider, error: result.error };
}

export async function listNotifications(params: { limit?: number } = {}) {
  return prisma.notification.findMany({
    include: { customer: true, order: { include: { branch: true } } },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 100,
  });
}
