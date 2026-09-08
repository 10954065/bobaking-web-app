import { listBranches } from "@/modules/branches/services/branch.service";
import { HomePage } from "@/components/home/HomePage";

// Must render per-request, not be statically prerendered — the CSP nonce
// (see proxy.ts) is generated fresh per request, and Next.js can only thread
// it into this page's inline hydration scripts when the page is rendered
// dynamically. A prerendered version bakes in a stale nonce that never
// matches the real request's CSP header, silently breaking hydration.
export const dynamic = "force-dynamic";

export default async function Home() {
  const branches = await listBranches({ status: "ACTIVE" });
  return <HomePage branches={branches.map((b) => ({ id: b.id, name: b.name, address: b.address }))} />;
}
