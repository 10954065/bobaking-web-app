import { cookies } from "next/headers";
import { prisma } from "@/db/client";

export const CUSTOMER_SESSION_COOKIE = "customer_session";

export interface CurrentCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

export async function setCustomerSessionCookie(sessionToken: string, expires: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function clearCustomerSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}

export async function getCustomerSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value ?? null;
}

/**
 * Resolves the signed-in customer from the session cookie, re-validated
 * against the database on every call (not just decoded) — the same
 * server-side-revocable pattern as the staff tracked-session, and the only
 * source placeStorefrontOrder trusts for identity; a client can no longer
 * just claim a phone number in the order payload (see storefront.actions.ts).
 */
export async function getCurrentCustomer(): Promise<CurrentCustomer | null> {
  const token = await getCustomerSessionToken();
  if (!token) return null;

  const session = await prisma.customerSession.findUnique({
    where: { sessionToken: token },
    include: { customer: true },
  });
  if (!session) return null;
  if (session.expires.getTime() < Date.now()) return null;
  if (session.customer.deletedAt || session.customer.status === "SUSPENDED") return null;
  if (!session.customer.phone) return null;

  return {
    id: session.customer.id,
    firstName: session.customer.firstName,
    lastName: session.customer.lastName,
    phone: session.customer.phone,
    email: session.customer.email,
  };
}
