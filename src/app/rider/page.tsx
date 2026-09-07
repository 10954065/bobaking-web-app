import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getRiderProfileByUserId } from "@/modules/delivery/services/rider.service";
import { getMyDeliveriesAction } from "@/modules/delivery/actions/rider.actions";
import { RiderApp } from "@/components/delivery/RiderApp";

export default async function RiderPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const riderProfile = await getRiderProfileByUserId(session.user.id);
  if (!riderProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-400">
        This account isn&apos;t set up as a rider.
      </div>
    );
  }

  const deliveries = await getMyDeliveriesAction();

  return (
    <RiderApp
      branchId={riderProfile.branchId}
      riderName={session.user.name ?? "Rider"}
      initialStatus={riderProfile.status}
      initialDeliveries={deliveries}
    />
  );
}
