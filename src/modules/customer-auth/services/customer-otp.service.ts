import crypto from "crypto";
import { prisma } from "@/db/client";
import { UserFacingError } from "@/lib/errors";
import { normalizeGhanaPhone } from "@/lib/phone";
import { sendOtpSms } from "@/modules/notifications/services/notification.service";
import { createCustomerSession } from "@/modules/customer-auth/services/customer-session.service";

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Phone is folded into the hash so the same code for two different phones never collides. */
export function hashOtpCode(phone: string, code: string): string {
  return crypto.createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function invalidPhoneError(): never {
  throw new UserFacingError("Enter a valid Ghana phone number.");
}

/**
 * Issues a fresh code for `phone`, invalidating any still-live code already
 * issued (so an attacker who requested a code first can't win a race against
 * the real owner requesting again) and sends it by SMS. Returns the raw code
 * only when the dev SMS stand-in handled the send (no real gateway configured
 * yet) — exactly the same "hand the tester what would've been delivered"
 * pattern as the payment module's dev-simulate actions; once Twilio is
 * configured this never fires and the code only ever reaches the real phone.
 */
export async function requestOtp(rawPhone: string): Promise<{ devCode: string | null }> {
  const phone = normalizeGhanaPhone(rawPhone);
  if (!phone) invalidPhoneError();

  const code = generateOtpCode();
  const codeHash = hashOtpCode(phone, code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.$transaction([
    prisma.customerOtp.deleteMany({ where: { phone, consumedAt: null } }),
    prisma.customerOtp.create({ data: { phone, codeHash, expiresAt } }),
  ]);

  const result = await sendOtpSms(phone, code);
  if (!result.sent && !result.isDevProvider) {
    throw new UserFacingError("Couldn't send the verification code. Please try again.");
  }

  return { devCode: result.isDevProvider ? code : null };
}

export interface VerifiedCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

/**
 * Checks the code against the most recently issued, still-live OTP for
 * `phone`. A wrong guess increments that OTP's attempt count rather than
 * issuing a new error type — after OTP_MAX_ATTEMPTS the code is dead even if
 * it hasn't expired yet, forcing a fresh request instead of an unbounded
 * guessing window. On success, finds-or-creates the Customer by phone (the
 * canonical identity — see normalizeGhanaPhone) and opens a session.
 */
export async function verifyOtp(rawPhone: string, code: string): Promise<{ customer: VerifiedCustomer; sessionToken: string; expires: Date }> {
  const phone = normalizeGhanaPhone(rawPhone);
  if (!phone) invalidPhoneError();

  const invalidCode = () => new UserFacingError("That code is incorrect or has expired.");

  const otp = await prisma.customerOtp.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.expiresAt.getTime() < Date.now()) throw invalidCode();
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new UserFacingError("Too many incorrect attempts. Please request a new code.");
  }

  if (hashOtpCode(phone, code) !== otp.codeHash) {
    await prisma.customerOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw invalidCode();
  }

  await prisma.customerOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

  // firstName/lastName start blank for a brand-new phone — checkout always
  // collects and saves them (see placeStorefrontOrder) before any order ever
  // references this customer, so the blank window never reaches an Order,
  // receipt, or admin list keyed off real activity.
  const customer = await prisma.customer.upsert({
    where: { phone },
    update: { phoneVerified: new Date(), status: "ACTIVE" },
    create: { phone, phoneVerified: new Date(), status: "ACTIVE", firstName: "", lastName: "" },
  });

  const { sessionToken, expires } = await createCustomerSession(customer.id);

  return {
    customer: { id: customer.id, firstName: customer.firstName, lastName: customer.lastName, phone, email: customer.email },
    sessionToken,
    expires,
  };
}
