"use server";

import { getRequestIp, enforceRateLimit } from "@/lib/rate-limit";
import { withSafeErrors } from "@/lib/errors";
import { requestOtpSchema, verifyOtpSchema } from "@/modules/customer-auth/schemas/customer-auth.schema";
import { requestOtp, verifyOtp, type VerifiedCustomer } from "@/modules/customer-auth/services/customer-otp.service";
import {
  getCurrentCustomer,
  getCustomerSessionToken,
  setCustomerSessionCookie,
  clearCustomerSessionCookie,
  type CurrentCustomer,
} from "@/modules/customer-auth/services/current-customer.service";
import { revokeCustomerSession } from "@/modules/customer-auth/services/customer-session.service";

/**
 * Rate-limited per phone (a fixed SMS-cost target — this is the abuse
 * surface once Twilio is live: someone spamming codes to a number they don't
 * own, or racking up SMS charges) and per IP (one visitor spraying requests
 * across many numbers). Both must hold.
 */
export const requestCustomerOtpAction = withSafeErrors(async (rawPhone: string): Promise<{ devCode: string | null }> => {
  const { phone } = requestOtpSchema.parse({ phone: rawPhone });

  const ip = await getRequestIp();
  await enforceRateLimit(`otp-request:ip:${ip}`, { limit: 10, windowSeconds: 900 });
  await enforceRateLimit(`otp-request:phone:${phone}`, { limit: 5, windowSeconds: 900 });

  return requestOtp(phone);
}, "Couldn't send a verification code right now. Please try again.");

/**
 * Per-phone limit matters more than it looks: it's the only cap on guesses
 * against one target that can't be sidestepped by spraying requests across
 * many source IPs (getRequestIp() is best-effort, not trustworthy for a hard
 * limit — see its doc comment) or by firing a burst of concurrent requests
 * (Redis INCR is atomic, so unlike the DB-side attempts counter this one
 * can't be raced).
 */
export const verifyCustomerOtpAction = withSafeErrors(async (input: { phone: string; code: string }): Promise<CurrentCustomer> => {
  const { phone, code } = verifyOtpSchema.parse(input);

  const ip = await getRequestIp();
  await enforceRateLimit(`otp-verify:ip:${ip}`, { limit: 30, windowSeconds: 900 });
  await enforceRateLimit(`otp-verify:phone:${phone}`, { limit: 10, windowSeconds: 900 });

  const { customer, sessionToken, expires } = await verifyOtp(phone, code);
  await setCustomerSessionCookie(sessionToken, expires);

  return customer as VerifiedCustomer;
}, "That code didn't work. Please try again.");

/** Used by the storefront to restore an existing session on mount without redoing OTP. */
export const getCurrentCustomerAction = withSafeErrors(async (): Promise<CurrentCustomer | null> => {
  return getCurrentCustomer();
}, "Couldn't check your session right now.");

export const signOutCustomerAction = withSafeErrors(async (): Promise<void> => {
  const token = await getCustomerSessionToken();
  if (token) await revokeCustomerSession(token);
  await clearCustomerSessionCookie();
}, "Couldn't sign out right now.");
