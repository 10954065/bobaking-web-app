"use client";

import { useRouter } from "next/navigation";
import { PhoneAuthStep } from "@/components/storefront/PhoneAuthStep";

/**
 * Reuses the same phone/OTP flow the storefront checkout uses — verifying
 * here just needs to make the customer_session cookie exist, then a refresh
 * lets the server component re-run getCurrentCustomer() and render the real
 * account view. No separate "customer login" flow to keep in sync.
 */
export function AccountAuthGate() {
  const router = useRouter();

  return <PhoneAuthStep onVerified={() => router.refresh()} onBack={() => router.push("/order")} />;
}
