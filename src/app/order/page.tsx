import { listBranches } from "@/modules/branches/services/branch.service";
import { StorefrontApp } from "@/components/storefront/StorefrontApp";

export default async function OrderPage() {
  const branches = await listBranches({ status: "ACTIVE" });

  return (
    <StorefrontApp
      branches={branches.map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        latitude: b.latitude != null ? Number(b.latitude) : null,
        longitude: b.longitude != null ? Number(b.longitude) : null,
      }))}
    />
  );
}
