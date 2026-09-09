import { listBranches } from "@/modules/branches/services/branch.service";
import { StorefrontApp } from "@/components/storefront/StorefrontApp";
import { getCurrentCustomer } from "@/modules/customer-auth/services/current-customer.service";
import { env } from "@/lib/env";

// Must render per-request, not be statically prerendered — the CSP nonce
// (see proxy.ts) is generated fresh per request, and Next.js can only thread
// it into this page's inline hydration scripts when the page is rendered
// dynamically. A prerendered version bakes in a stale nonce that never
// matches the real request's CSP header, silently breaking hydration.
export const dynamic = "force-dynamic";

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ dish?: string; reorder?: string }> }) {
  const [branches, { dish, reorder }, customer] = await Promise.all([
    listBranches({ status: "ACTIVE" }),
    searchParams,
    getCurrentCustomer(),
  ]);

  return (
    <StorefrontApp
      branches={branches.map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        latitude: b.latitude != null ? Number(b.latitude) : null,
        longitude: b.longitude != null ? Number(b.longitude) : null,
      }))}
      initialDishId={dish ?? null}
      // A boolean, not the secret itself — safe to pass through to the
      // client so PaymentStep knows whether to offer a Card button at all,
      // rather than letting a customer pick Card and hit a dead-end error
      // every time until a real gateway is configured.
      cardPaymentsEnabled={Boolean(env.PAYSTACK_SECRET_KEY)}
      initialCustomer={customer}
      initialReorderOrderId={reorder ?? null}
    />
  );
}
