"use server";

import { redirect } from "next/navigation";
import { signOutCustomerAction } from "@/modules/customer-auth/actions/customer-auth.actions";

/** Revokes the customer session (server-side, not just clearing the cookie) then lands back on the same page, now signed out. */
export async function signOutFromMyAccountAction() {
  await signOutCustomerAction();
  redirect("/my-account");
}
