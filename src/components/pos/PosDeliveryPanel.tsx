"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { getDeliveryBoardAction, type DeliveryBoardData } from "@/modules/delivery/actions/board.actions";
import { DeliveryBoard } from "@/components/delivery/DeliveryBoard";

/**
 * Rider assignment reachable from the POS surface — front desk holds
 * delivery.read/assign but its primary surface is /pos, not /admin (see
 * dashboard-nav.ts), so /admin/delivery is never reachable for that role.
 * DeliveryBoard itself has no dependency on the admin route/layout, so it
 * mounts here directly instead of being duplicated.
 */
export function PosDeliveryPanel({
  branchId,
  branchName,
  canAssign,
  onClose,
}: {
  branchId: string;
  branchName: string;
  canAssign: boolean;
  onClose: () => void;
}) {
  const [board, setBoard] = useState<DeliveryBoardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDeliveryBoardAction(branchId).then((data) => {
      if (!cancelled) setBoard(data);
    });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-stone-950"
      >
        <button
          onClick={onClose}
          className="fixed right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-stone-900 text-stone-300 shadow-lg hover:bg-stone-800"
          aria-label="Close delivery panel"
        >
          <X size={18} />
        </button>
        {board ? (
          <DeliveryBoard
            branchId={branchId}
            branchName={branchName}
            branches={[{ id: branchId, name: branchName }]}
            initialBoard={board}
            canAssign={canAssign}
          />
        ) : (
          <div className="flex min-h-screen items-center justify-center text-sm text-stone-500">Loading deliveries…</div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
