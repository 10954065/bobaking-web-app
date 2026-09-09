import crypto from "crypto";
import { prisma } from "@/db/client";

/**
 * "Log in once, just buy" per the product ask — deliberately long-lived so a
 * returning customer isn't asked to re-verify their phone on every visit,
 * unlike the staff Session's 30-day window (staff re-auth is a lower-friction
 * tradeoff worth making more often).
 */
export const CUSTOMER_SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days

export async function createCustomerSession(customerId: string): Promise<{ sessionToken: string; expires: Date }> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + CUSTOMER_SESSION_MAX_AGE_SECONDS * 1000);
  await prisma.customerSession.create({ data: { sessionToken, customerId, expires } });
  return { sessionToken, expires };
}

export async function revokeCustomerSession(sessionToken: string): Promise<void> {
  await prisma.customerSession.deleteMany({ where: { sessionToken } });
}
